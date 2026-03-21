module among_agents::game_settlement;

use one::object::{Self, UID, ID};
use one::tx_context::{Self, TxContext};
use one::transfer;
use one::table::{Self, Table};
use one::event;
use one::address;
use one::clock::{Self, Clock};
use one::random::{Self, Random};
use std::hash;
use among_agents::wager_vault::{Self, WagerVault};
use among_agents::agent_registry::{Self, AgentRegistry};

// ======== Constants ========

const PHASE_LOBBY: u8 = 0;
const PHASE_STARTING: u8 = 1;
const PHASE_ACTION_COMMIT: u8 = 2;
const PHASE_ACTION_REVEAL: u8 = 3;
const PHASE_DISCUSSION: u8 = 4;
const PHASE_VOTING: u8 = 5;
const PHASE_VOTE_RESULT: u8 = 6;
const PHASE_ENDED: u8 = 7;

const ROLE_CREWMATE: u8 = 1;
const ROLE_IMPOSTOR: u8 = 2;

const WIN_NONE: u8 = 0;
const WIN_CREWMATES: u8 = 1;
const WIN_IMPOSTORS: u8 = 2;

// ======== Structs ========

public struct GameManager has key {
    id: UID,
    game_count: u64,
    admin: address,
}

public struct Game has key {
    id: UID,
    game_index: u64,
    phase: u8,
    round: u64,
    created_at: u64,
    players: vector<address>,
    roles: Table<address, u8>,
    alive: Table<address, bool>,
    locations: Table<address, u8>,
    tasks_done: Table<address, u64>,
    commits: Table<address, vector<u8>>,
    reveals: Table<address, RevealedAction>,
    max_players: u64,
    wager_amount: u64,
    tasks_required: u64,
    winner: u8,
    ended: bool,
}

public struct RevealedAction has store, copy, drop {
    action_type: u8,
    target: address,
    room: u8,
    task_id: u64,
    salt: vector<u8>,
}

// ======== Events ========

public struct GameCreated has copy, drop {
    game_id: ID,
    game_index: u64,
    creator: address,
    wager_amount: u64,
    max_players: u64,
}

public struct PlayerJoined has copy, drop {
    game_id: ID,
    player: address,
    player_count: u64,
}

public struct PhaseChanged has copy, drop {
    game_id: ID,
    round: u64,
    new_phase: u8,
}

public struct ActionCommitted has copy, drop {
    game_id: ID,
    player: address,
    round: u64,
}

public struct ActionRevealed has copy, drop {
    game_id: ID,
    player: address,
    action_type: u8,
    round: u64,
}

public struct PlayerEliminated has copy, drop {
    game_id: ID,
    player: address,
    round: u64,
}

public struct GameEnded has copy, drop {
    game_id: ID,
    winner: u8,
    round: u64,
}

// ======== Init ========

fun init(ctx: &mut TxContext) {
    let manager = GameManager {
        id: object::new(ctx),
        game_count: 0,
        admin: ctx.sender(),
    };
    transfer::share_object(manager);
}

// ======== Public Entry Functions ========

public entry fun create_game(
    manager: &mut GameManager,
    vault: &mut WagerVault,
    max_players: u64,
    wager_amount: u64,
    tasks_required: u64,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert!(max_players >= 4 && max_players <= 10, 0);
    assert!(wager_amount > 0, 1);
    assert!(tasks_required > 0, 2);

    let game_index = manager.game_count;
    manager.game_count = manager.game_count + 1;

    let game = Game {
        id: object::new(ctx),
        game_index,
        phase: PHASE_LOBBY,
        round: 0,
        created_at: clock::timestamp_ms(clock),
        players: vector::empty(),
        roles: table::new(ctx),
        alive: table::new(ctx),
        locations: table::new(ctx),
        tasks_done: table::new(ctx),
        commits: table::new(ctx),
        reveals: table::new(ctx),
        max_players,
        wager_amount,
        tasks_required,
        winner: WIN_NONE,
        ended: false,
    };

    let game_id = object::id(&game);
    wager_vault::init_game_wager(vault, game_id, wager_amount);

    event::emit(GameCreated {
        game_id,
        game_index,
        creator: ctx.sender(),
        wager_amount,
        max_players,
    });

    transfer::share_object(game);
}

public entry fun join_game(
    game: &mut Game,
    registry: &AgentRegistry,
    ctx: &mut TxContext,
) {
    assert!(game.phase == PHASE_LOBBY, 3);
    let player = ctx.sender();
    assert!(!vector::contains(&game.players, &player), 4);
    assert!(vector::length(&game.players) < game.max_players, 5);
    assert!(agent_registry::is_registered(registry, player), 6);

    vector::push_back(&mut game.players, player);
    table::add(&mut game.alive, player, true);
    table::add(&mut game.locations, player, 0); // start in CAFETERIA (index 0)
    table::add(&mut game.tasks_done, player, 0);

    let player_count = vector::length(&game.players);
    event::emit(PlayerJoined { game_id: object::id(game), player, player_count });
}

public entry fun commit_action(
    game: &mut Game,
    commitment: vector<u8>,
    ctx: &mut TxContext,
) {
    assert!(game.phase == PHASE_ACTION_COMMIT, 7);
    assert!(game.phase == PHASE_ACTION_COMMIT || game.phase == PHASE_VOTING, 10);
    let player = ctx.sender();
    assert!(vector::contains(&game.players, &player), 8);
    assert!(*table::borrow(&game.alive, player), 9);

    if (table::contains(&game.commits, ctx.sender())) {
        let commit_ref = table::borrow_mut(&mut game.commits, ctx.sender());
        *commit_ref = commitment;
    } else {
        table::add(&mut game.commits, ctx.sender(), commitment);
    };

    event::emit(ActionCommitted { game_id: object::id(game), player, round: game.round });
}

public entry fun reveal_action(
    game: &mut Game,
    action_type: u8,
    target: address,
    room: u8,
    task_id: u64,
    salt: vector<u8>,
    ctx: &mut TxContext,
) {
    assert!(game.phase == PHASE_ACTION_REVEAL, 10);
    let player = ctx.sender();
    assert!(vector::contains(&game.players, &player), 8);
    assert!(*table::borrow(&game.alive, player), 9);
    assert!(table::contains(&game.commits, player), 11);

    let commitment = *table::borrow(&game.commits, player);
    let mut reveal_bytes = vector::empty<u8>();
    vector::push_back(&mut reveal_bytes, action_type);
    vector::append(&mut reveal_bytes, salt);
    vector::append(&mut reveal_bytes, address::to_bytes(player));

    let computed_hash = hash::sha2_256(reveal_bytes);
    assert!(computed_hash == commitment, 12);

    let revealed = RevealedAction { action_type, target, room, task_id, salt };

    if (table::contains(&game.reveals, player)) {
        *table::borrow_mut(&mut game.reveals, player) = revealed;
    } else {
        table::add(&mut game.reveals, player, revealed);
    };

    event::emit(ActionRevealed {
        game_id: object::id(game),
        player,
        action_type,
        round: game.round,
    });
}

public entry fun advance_phase(
    game: &mut Game,
    manager: &GameManager,
    ctx: &mut TxContext,
) {
    assert!(ctx.sender() == manager.admin, 13);

    let new_phase = if (game.phase == PHASE_LOBBY) {
        PHASE_STARTING
    } else if (game.phase == PHASE_STARTING) {
        PHASE_ACTION_COMMIT
    } else if (game.phase == PHASE_ACTION_COMMIT) {
        PHASE_ACTION_REVEAL
    } else if (game.phase == PHASE_ACTION_REVEAL) {
        PHASE_DISCUSSION
    } else if (game.phase == PHASE_DISCUSSION) {
        PHASE_VOTING
    } else if (game.phase == PHASE_VOTING) {
        PHASE_VOTE_RESULT
    } else if (game.phase == PHASE_VOTE_RESULT) {
        game.round = game.round + 1;
        PHASE_ACTION_COMMIT
    } else {
        PHASE_ENDED
    };

    if (new_phase == PHASE_ACTION_COMMIT || new_phase == PHASE_VOTING) {
        let n = vector::length(&game.players);
        let mut i = 0;
        while (i < n) {
            let player = *vector::borrow(&game.players, i);
            if (table::contains(&game.reveals, player)) {
                table::remove(&mut game.reveals, player);
            };
            if (table::contains(&game.commits, player)) {
                table::remove(&mut game.commits, player);
            };
            i = i + 1;
        };
    };

    game.phase = new_phase;
    event::emit(PhaseChanged { game_id: object::id(game), round: game.round, new_phase });
}

public entry fun assign_roles(
    game: &mut Game,
    manager: &GameManager,
    impostors: vector<address>,
    ctx: &mut TxContext,
) {
    assert!(ctx.sender() == manager.admin, 13);
    assert!(game.phase == PHASE_STARTING, 14);

    let mut i = 0;
    let len = vector::length(&game.players);
    while (i < len) {
        let player = *vector::borrow(&game.players, i);
        if (vector::contains(&impostors, &player)) {
            table::add(&mut game.roles, player, ROLE_IMPOSTOR);
        } else {
            table::add(&mut game.roles, player, ROLE_CREWMATE);
        };
        i = i + 1;
    };
}

public entry fun assign_roles_randomly(
    game: &mut Game,
    manager: &GameManager,
    r: &Random,
    ctx: &mut TxContext,
) {
    assert!(ctx.sender() == manager.admin, 13);
    assert!(game.phase == PHASE_STARTING, 14);

    let mut generator = random::new_generator(r, ctx);
    let num_players = vector::length(&game.players);

    // Determine impostor count (e.g., 2 for 6+ players, 1 otherwise)
    let impostor_count = if (num_players >= 6) { 2 } else { 1 };

    // Generate a list of impostor indices
    let mut impostor_indices = vector::empty<u64>();
    while (vector::length(&impostor_indices) < impostor_count) {
        let idx = random::generate_u64_in_range(&mut generator, 0, num_players - 1);
        if (!vector::contains(&impostor_indices, &idx)) {
            vector::push_back(&mut impostor_indices, idx);
        }
    };

    // Assign roles
    let mut i = 0;
    while (i < num_players) {
        let player = *vector::borrow(&game.players, i);
        if (vector::contains(&impostor_indices, &i)) {
            table::add(&mut game.roles, player, 2); // ROLE_IMPOSTOR
        } else {
            table::add(&mut game.roles, player, 1); // ROLE_CREWMATE
        };
        i = i + 1;
    };
}

public entry fun process_kill(
    game: &mut Game,
    manager: &GameManager,
    victim: address,
    ctx: &mut TxContext,
) {
    assert!(ctx.sender() == manager.admin, 13);
    assert!(*table::borrow(&game.alive, victim), 9);
    *table::borrow_mut(&mut game.alive, victim) = false;
    event::emit(PlayerEliminated { game_id: object::id(game), player: victim, round: game.round });
}

public entry fun settle_game(
    game: &mut Game,
    manager: &GameManager,
    vault: &mut WagerVault,
    registry: &mut AgentRegistry,
    winners: vector<address>,
    winner_side: u8,
    ctx: &mut TxContext,
) {
    assert!(ctx.sender() == manager.admin, 13);
    assert!(!game.ended, 15);

    game.ended = true;
    game.winner = winner_side;
    game.phase = PHASE_ENDED;

    let winner_count = vector::length(&winners);
    let payout_estimate = if (winner_count > 0) {
        (game.wager_amount * vector::length(&game.players) * 95 / 100) / winner_count
    } else { 0 };

    let mut i = 0;
    let len = vector::length(&game.players);
    while (i < len) {
        let player = *vector::borrow(&game.players, i);
        if (vector::contains(&winners, &player)) {
            agent_registry::record_win(registry, player, payout_estimate);
        } else {
            agent_registry::record_loss(registry, player);
        };
        i = i + 1;
    };

    wager_vault::settle_wager(vault, object::id(game), winners, ctx);

    event::emit(GameEnded { game_id: object::id(game), winner: winner_side, round: game.round });
}

// ======== View Functions ========

public fun get_phase(game: &Game): u8 { game.phase }
public fun get_round(game: &Game): u64 { game.round }
public fun get_player_count(game: &Game): u64 { vector::length(&game.players) }
public fun is_ended(game: &Game): bool { game.ended }
public fun get_winner(game: &Game): u8 { game.winner }
public fun get_players(game: &Game): vector<address> { game.players }
