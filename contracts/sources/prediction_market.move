module among_agents::prediction_market;

use one::object::{Self, UID, ID};
use one::tx_context::{Self, TxContext};
use one::transfer;
use one::coin::{Self, Coin};
use one::oct::OCT;
use one::table::{Self, Table};
use one::balance::{Self, Balance};
use one::event;

// ======== Error Codes ========

const E_MARKET_NOT_FOUND: u64 = 0;
const E_MARKET_ALREADY_EXISTS: u64 = 1;
const E_MARKET_CLOSED: u64 = 2;
const E_MARKET_NOT_CLOSED: u64 = 3;
const E_MARKET_ALREADY_RESOLVED: u64 = 4;
const E_MARKET_NOT_RESOLVED: u64 = 5;
const E_NOT_ADMIN: u64 = 6;
const E_INVALID_BET_AMOUNT: u64 = 7;
const E_PLAYER_NOT_IN_GAME: u64 = 8;
const E_ALREADY_BET: u64 = 9;
const E_NO_WINNINGS: u64 = 10;
const E_ALREADY_CLAIMED: u64 = 11;

// ======== Constants ========

const PROTOCOL_FEE_BPS: u64 = 500; // 5%
const MIN_BET_MIST: u64 = 10_000_000; // 0.01 OCT minimum bet

// ======== Structs ========

public struct MarketRegistry has key {
    id: UID,
    markets: Table<ID, bool>, // game_id -> exists
    player_stats: Table<address, PlayerStats>, // address -> stats
    admin: address,
    protocol_fee_balance: Balance<OCT>,
}

public struct PlayerStats has store, copy, drop {
    wins: u64,
    losses: u64,
}

/// One prediction market per game
public struct PredictionMarket has key {
    id: UID,
    game_id: ID,

    /// All players in this game (set at market creation)
    game_players: vector<address>,

    /// Total OCT pot
    total_pot: Balance<OCT>,

    /// Per-suspect bet pool: suspect_address -> total OCT bet on them
    suspect_pools: Table<address, u64>,

    /// Per-bettor record: bettor_address -> Bet
    bets: Table<address, Bet>,

    /// Market state
    open: bool,       // accepting bets
    resolved: bool,   // impostors revealed

    /// Set at resolution
    actual_impostors: vector<address>,

    /// Claimed tracking: bettor -> claimed
    claimed: Table<address, bool>,

    protocol_fee_bps: u64,
}

public struct Bet has store, copy, drop {
    bettor: address,
    suspect: address,   // who they think is the impostor
    amount: u64,        // OCT in MIST
    correct: bool,      // set at resolution
}

// ======== Events ========

public struct MarketCreated has copy, drop {
    market_id: ID,
    game_id: ID,
    player_count: u64,
}

public struct BetPlaced has copy, drop {
    market_id: ID,
    game_id: ID,
    bettor: address,
    suspect: address,
    amount: u64,
}

public struct MarketClosed has copy, drop {
    market_id: ID,
    game_id: ID,
    total_pot: u64,
}

public struct MarketResolved has copy, drop {
    market_id: ID,
    game_id: ID,
    actual_impostors: vector<address>,
    total_pot: u64,
    winner_count: u64,
}

public struct WinningsClaimed has copy, drop {
    market_id: ID,
    bettor: address,
    payout: u64,
}

// ======== Init ========

fun init(ctx: &mut TxContext) {
    let registry = MarketRegistry {
        id: object::new(ctx),
        markets: table::new(ctx),
        player_stats: table::new(ctx),
        admin: ctx.sender(),
        protocol_fee_balance: balance::zero(),
    };
    transfer::share_object(registry);
}

// ======== Admin Functions ========

/// Called by admin when a game lobby opens — creates the prediction market
public entry fun create_market(
    registry: &mut MarketRegistry,
    game_id: ID,
    game_players: vector<address>,
    ctx: &mut TxContext,
) {
    assert!(ctx.sender() == registry.admin, E_NOT_ADMIN);
    assert!(!table::contains(&registry.markets, game_id), E_MARKET_ALREADY_EXISTS);

    // Initialize per-suspect pools
    let mut suspect_pools = table::new<address, u64>(ctx);
    let mut i = 0;
    let len = vector::length(&game_players);
    while (i < len) {
        let player = *vector::borrow(&game_players, i);
        table::add(&mut suspect_pools, player, 0u64);
        i = i + 1;
    };

    let market = PredictionMarket {
        id: object::new(ctx),
        game_id,
        game_players,
        total_pot: balance::zero(),
        suspect_pools,
        bets: table::new(ctx),
        open: true,
        resolved: false,
        actual_impostors: vector::empty(),
        claimed: table::new(ctx),
        protocol_fee_bps: PROTOCOL_FEE_BPS,
    };

    let market_id = object::id(&market);
    table::add(&mut registry.markets, game_id, true);

    event::emit(MarketCreated {
        market_id,
        game_id,
        player_count: len,
    });

    transfer::share_object(market);
}

/// Called by admin when roles are assigned — closes betting
public entry fun close_market(
    market: &mut PredictionMarket,
    registry: &MarketRegistry,
    ctx: &mut TxContext,
) {
    assert!(ctx.sender() == registry.admin, E_NOT_ADMIN);
    assert!(market.open, E_MARKET_CLOSED);

    market.open = false;

    let total = balance::value(&market.total_pot);
    event::emit(MarketClosed {
        market_id: object::id(market),
        game_id: market.game_id,
        total_pot: total,
    });
}

/// Called by admin after game ends — resolves market with actual impostors
public entry fun resolve_market(
    market: &mut PredictionMarket,
    registry: &mut MarketRegistry,
    actual_impostors: vector<address>,
    ctx: &mut TxContext,
) {
    assert!(ctx.sender() == registry.admin, E_NOT_ADMIN);
    assert!(!market.open, E_MARKET_NOT_CLOSED);
    assert!(!market.resolved, E_MARKET_ALREADY_RESOLVED);

    market.resolved = true;
    market.actual_impostors = actual_impostors;

    // Mark each bet as correct or not
    // We iterate through game_players and check their bets
    let total = balance::value(&market.total_pot);

    // Count winners for event
    let mut winner_count = 0u64;
    let mut i = 0;
    let player_len = vector::length(&market.game_players);
    // We can't iterate table directly in Move, so we track via bets on players
    // Instead we check each game player's bet if they placed one
    while (i < player_len) {
        let player = *vector::borrow(&market.game_players, i);
        
        // Initialize stats if not exist
        if (!table::contains(&registry.player_stats, player)) {
            table::add(&mut registry.player_stats, player, PlayerStats { wins: 0, losses: 0 });
        };
        let stats = table::borrow_mut(&mut registry.player_stats, player);

        if (table::contains(&market.bets, player)) {
            let bet = table::borrow_mut(&mut market.bets, player);
            let is_correct = vector::contains(&actual_impostors, &bet.suspect);
            bet.correct = is_correct;
            if (is_correct) {
                winner_count = winner_count + 1;
                stats.wins = stats.wins + 1;
            } else {
                stats.losses = stats.losses + 1;
            };
        };
        i = i + 1;
    };

    // Also handle non-player bettors (spectators) — iterate via a separate approach
    // Since Move tables aren't iterable, bettors must claim and resolution checks on claim

    event::emit(MarketResolved {
        market_id: object::id(market),
        game_id: market.game_id,
        actual_impostors,
        total_pot: total,
        winner_count,
    });
}

/// Admin withdraws protocol fees
public entry fun withdraw_fees(
    registry: &mut MarketRegistry,
    ctx: &mut TxContext,
) {
    assert!(ctx.sender() == registry.admin, E_NOT_ADMIN);
    let amount = balance::value(&registry.protocol_fee_balance);
    assert!(amount > 0, E_INVALID_BET_AMOUNT);
    let fee_coin = coin::from_balance(
        balance::split(&mut registry.protocol_fee_balance, amount),
        ctx,
    );
    transfer::public_transfer(fee_coin, registry.admin);
}

// ======== Public User Functions ========

/// Anyone (spectator or player) places a bet on who they think is the impostor
public entry fun place_bet(
    market: &mut PredictionMarket,
    suspect: address,
    payment: Coin<OCT>,
    ctx: &mut TxContext,
) {
    assert!(market.open, E_MARKET_CLOSED);

    let bettor = ctx.sender();
    assert!(!table::contains(&market.bets, bettor), E_ALREADY_BET);

    // suspect must be one of the game players
    assert!(vector::contains(&market.game_players, &suspect), E_PLAYER_NOT_IN_GAME);

    let amount = coin::value(&payment);
    assert!(amount >= MIN_BET_MIST, E_INVALID_BET_AMOUNT);

    // Update suspect pool
    let pool = table::borrow_mut(&mut market.suspect_pools, suspect);
    *pool = *pool + amount;

    // Record bet
    table::add(&mut market.bets, bettor, Bet {
        bettor,
        suspect,
        amount,
        correct: false, // updated at resolution
    });

    // Add to pot
    balance::join(&mut market.total_pot, coin::into_balance(payment));

    event::emit(BetPlaced {
        market_id: object::id(market),
        game_id: market.game_id,
        bettor,
        suspect,
        amount,
    });
}

/// Bettor claims their winnings after market is resolved
public entry fun claim_winnings(
    market: &mut PredictionMarket,
    registry: &mut MarketRegistry,
    ctx: &mut TxContext,
) {
    assert!(market.resolved, E_MARKET_NOT_RESOLVED);

    let bettor = ctx.sender();
    assert!(table::contains(&market.bets, bettor), E_NO_WINNINGS);
    assert!(!table::contains(&market.claimed, bettor), E_ALREADY_CLAIMED);

    let bet = *table::borrow(&market.bets, bettor);

    // Check if correct: suspect must be in actual_impostors
    let is_correct = vector::contains(&market.actual_impostors, &bet.suspect);
    assert!(is_correct, E_NO_WINNINGS);

    // Calculate payout:
    // Total pot after 5% fee, proportional to their bet vs total bet on correct suspects
    let total_pot = balance::value(&market.total_pot);
    let fee = (total_pot * market.protocol_fee_bps) / 10000;
    let distributable = total_pot - fee;

    // Total OCT bet on the correct suspects
    let mut correct_pool = 0u64;
    let mut i = 0;
    let len = vector::length(&market.actual_impostors);
    while (i < len) {
        let impostor = *vector::borrow(&market.actual_impostors, i);
        if (table::contains(&market.suspect_pools, impostor)) {
            correct_pool = correct_pool + *table::borrow(&market.suspect_pools, impostor);
        };
        i = i + 1;
    };

    assert!(correct_pool > 0, E_NO_WINNINGS);

    // Proportional payout: (bettor_amount / correct_pool) * distributable
    let payout = (bet.amount * distributable) / correct_pool;
    assert!(payout > 0, E_NO_WINNINGS);

    // Mark claimed
    table::add(&mut market.claimed, bettor, true);

    // Take fee into registry
    if (fee > 0 && balance::value(&market.total_pot) >= fee) {
        let fee_balance = balance::split(&mut market.total_pot, fee);
        balance::join(&mut registry.protocol_fee_balance, fee_balance);
    };

    // Pay out
    let payout_actual = if (payout > balance::value(&market.total_pot)) {
        balance::value(&market.total_pot)
    } else {
        payout
    };

    let payout_coin = coin::from_balance(
        balance::split(&mut market.total_pot, payout_actual),
        ctx,
    );
    transfer::public_transfer(payout_coin, bettor);

    event::emit(WinningsClaimed {
        market_id: object::id(market),
        bettor,
        payout: payout_actual,
    });
}

// ======== View Functions ========

public fun is_open(market: &PredictionMarket): bool { market.open }
public fun is_resolved(market: &PredictionMarket): bool { market.resolved }
public fun get_total_pot(market: &PredictionMarket): u64 { balance::value(&market.total_pot) }
public fun get_game_id(market: &PredictionMarket): ID { market.game_id }
public fun get_actual_impostors(market: &PredictionMarket): vector<address> { market.actual_impostors }
public fun get_suspect_pool(market: &PredictionMarket, suspect: address): u64 {
    if (!table::contains(&market.suspect_pools, suspect)) { return 0 };
    *table::borrow(&market.suspect_pools, suspect)
}
public fun has_bet(market: &PredictionMarket, bettor: address): bool {
    table::contains(&market.bets, bettor)
}
public fun get_bet(market: &PredictionMarket, bettor: address): Bet {
    assert!(table::contains(&market.bets, bettor), E_NO_WINNINGS);
    *table::borrow(&market.bets, bettor)
}
public fun has_claimed(market: &PredictionMarket, bettor: address): bool {
    table::contains(&market.claimed, bettor)
}
public fun get_game_players(market: &PredictionMarket): vector<address> { market.game_players }
