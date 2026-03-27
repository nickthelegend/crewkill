module among_agents::wager_vault;

use one::object::{Self, UID, ID};
use one::tx_context::{Self, TxContext};
use one::transfer;
use one::coin::{Self, Coin};
use among_agents::crew_token::CREW_TOKEN;
use one::table::{Self, Table};
use one::balance::{Self, Balance};
use one::event;

// ======== Structs ========

public struct WagerVault<phantom T> has key {
    id: UID,
    game_wagers: Table<ID, GameWager<T>>,
    protocol_fee_balance: Balance<T>,
    admin: address,
    protocol_fee_bps: u64,
}

public struct GameWager<phantom T> has store {
    game_id: ID,
    total_pot: Balance<T>,
    wager_amount: u64,
    players: vector<address>,
    settled: bool,
}

// ======== Events ========

public struct WagerPlaced has copy, drop {
    game_id: ID,
    agent: address,
    amount: u64,
}

public struct WagerSettled has copy, drop {
    game_id: ID,
    total_pot: u64,
    winner_count: u64,
    payout_per_winner: u64,
}

// ======== Init ========

fun init(_ctx: &mut TxContext) {
    // We can't init a generic vault without a specific type easily in Move.
    // Instead, the create_vault function will be used or we init with a default.
    // For now, I'll provide an entry function to create the vault.
}

public entry fun create_vault<T>(ctx: &mut TxContext) {
    let vault = WagerVault<T> {
        id: object::new(ctx),
        game_wagers: table::new(ctx),
        protocol_fee_balance: balance::zero(),
        admin: ctx.sender(),
        protocol_fee_bps: 500,
    };
    transfer::share_object(vault);
}

// ======== Public Functions ========

public fun init_game_wager<T>(
    vault: &mut WagerVault<T>,
    game_id: ID,
    wager_amount: u64,
) {
    assert!(!table::contains(&vault.game_wagers, game_id), 0);
    table::add(&mut vault.game_wagers, game_id, GameWager<T> {
        game_id,
        total_pot: balance::zero(),
        wager_amount,
        players: vector::empty(),
        settled: false,
    });
}

public entry fun place_wager<T>(
    vault: &mut WagerVault<T>,
    game_id: ID,
    payment: Coin<T>,
    ctx: &mut TxContext,
) {
    assert!(table::contains(&vault.game_wagers, game_id), 1);
    let wager = table::borrow_mut(&mut vault.game_wagers, game_id);
    assert!(!wager.settled, 2);

    let amount = coin::value(&payment);
    assert!(amount == wager.wager_amount, 3);

    let agent = ctx.sender();
    assert!(!vector::contains(&wager.players, &agent), 4);

    vector::push_back(&mut wager.players, agent);
    balance::join(&mut wager.total_pot, coin::into_balance(payment));

    event::emit(WagerPlaced { game_id, agent, amount });
}

public fun settle_wager<T>(
    vault: &mut WagerVault<T>,
    game_id: ID,
    winners: vector<address>,
    ctx: &mut TxContext,
) {
    assert!(table::contains(&vault.game_wagers, game_id), 1);
    let wager = table::borrow_mut(&mut vault.game_wagers, game_id);
    assert!(!wager.settled, 2);
    wager.settled = true;

    let total = balance::value(&wager.total_pot);
    let winner_count = vector::length(&winners);

    if (winner_count == 0 || total == 0) { return };

    let fee_amount = (total * vault.protocol_fee_bps) / 10000;
    let winner_pot = total - fee_amount;
    let payout_per_winner = winner_pot / winner_count;

    if (fee_amount > 0) {
        let fee_balance = balance::split(&mut wager.total_pot, fee_amount);
        balance::join(&mut vault.protocol_fee_balance, fee_balance);
    };

    let mut i = 0;
    while (i < winner_count) {
        let winner = *vector::borrow(&winners, i);
        let payout_balance = balance::split(&mut wager.total_pot, payout_per_winner);
        let payout_coin = coin::from_balance(payout_balance, ctx);
        transfer::public_transfer(payout_coin, winner);
        i = i + 1;
    };

    event::emit(WagerSettled {
        game_id,
        total_pot: total,
        winner_count,
        payout_per_winner,
    });
}

public entry fun withdraw_fees<T>(
    vault: &mut WagerVault<T>,
    ctx: &mut TxContext,
) {
    assert!(ctx.sender() == vault.admin, 5);
    let amount = balance::value(&vault.protocol_fee_balance);
    assert!(amount > 0, 6);
    let fee_coin = coin::from_balance(
        balance::split(&mut vault.protocol_fee_balance, amount),
        ctx
    );
    transfer::public_transfer(fee_coin, vault.admin);
}

// ======== View Functions ========

public fun get_pot_size<T>(vault: &WagerVault<T>, game_id: ID): u64 {
    if (!table::contains(&vault.game_wagers, game_id)) { return 0 };
    balance::value(&table::borrow(&vault.game_wagers, game_id).total_pot)
}

public fun get_wager_amount<T>(vault: &WagerVault<T>, game_id: ID): u64 {
    assert!(table::contains(&vault.game_wagers, game_id), 1);
    table::borrow(&vault.game_wagers, game_id).wager_amount
}
