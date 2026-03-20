module among_agents::agent_registry;

use one::object::{Self, UID};
use one::tx_context::{Self, TxContext};
use one::transfer;
use one::table::{Self, Table};
use one::event;

// ======== Structs ========

public struct AgentRegistry has key {
    id: UID,
    agents: Table<address, AgentStats>,
    agent_count: u64,
}

public struct AgentStats has store, copy, drop {
    wins: u64,
    losses: u64,
    kills: u64,
    tasks_completed: u64,
    total_earnings: u64,
    games_played: u64,
    registered: bool,
}

// ======== Events ========

public struct AgentRegistered has copy, drop {
    agent: address,
}

public struct StatsUpdated has copy, drop {
    agent: address,
    wins: u64,
    losses: u64,
    games_played: u64,
}

// ======== Init ========

fun init(ctx: &mut TxContext) {
    let registry = AgentRegistry {
        id: object::new(ctx),
        agents: table::new(ctx),
        agent_count: 0,
    };
    transfer::share_object(registry);
}

// ======== Public Functions ========

public entry fun register_agent(
    registry: &mut AgentRegistry,
    ctx: &mut TxContext,
) {
    let agent_addr = ctx.sender();
    assert!(!table::contains(&registry.agents, agent_addr), 0);

    table::add(&mut registry.agents, agent_addr, AgentStats {
        wins: 0,
        losses: 0,
        kills: 0,
        tasks_completed: 0,
        total_earnings: 0,
        games_played: 0,
        registered: true,
    });
    registry.agent_count = registry.agent_count + 1;

    event::emit(AgentRegistered { agent: agent_addr });
}

public fun record_win(
    registry: &mut AgentRegistry,
    agent: address,
    earnings: u64,
) {
    if (table::contains(&registry.agents, agent)) {
        let stats = table::borrow_mut(&mut registry.agents, agent);
        stats.wins = stats.wins + 1;
        stats.games_played = stats.games_played + 1;
        stats.total_earnings = stats.total_earnings + earnings;
        event::emit(StatsUpdated {
            agent,
            wins: stats.wins,
            losses: stats.losses,
            games_played: stats.games_played,
        });
    }
}

public fun record_loss(
    registry: &mut AgentRegistry,
    agent: address,
) {
    if (table::contains(&registry.agents, agent)) {
        let stats = table::borrow_mut(&mut registry.agents, agent);
        stats.losses = stats.losses + 1;
        stats.games_played = stats.games_played + 1;
        event::emit(StatsUpdated {
            agent,
            wins: stats.wins,
            losses: stats.losses,
            games_played: stats.games_played,
        });
    }
}

public fun record_kill(registry: &mut AgentRegistry, agent: address) {
    if (table::contains(&registry.agents, agent)) {
        let stats = table::borrow_mut(&mut registry.agents, agent);
        stats.kills = stats.kills + 1;
    }
}

public fun record_task(registry: &mut AgentRegistry, agent: address) {
    if (table::contains(&registry.agents, agent)) {
        let stats = table::borrow_mut(&mut registry.agents, agent);
        stats.tasks_completed = stats.tasks_completed + 1;
    }
}

// ======== View Functions ========

public fun get_stats(registry: &AgentRegistry, agent: address): AgentStats {
    assert!(table::contains(&registry.agents, agent), 1);
    *table::borrow(&registry.agents, agent)
}

public fun is_registered(registry: &AgentRegistry, agent: address): bool {
    table::contains(&registry.agents, agent)
}

public fun agent_count(registry: &AgentRegistry): u64 {
    registry.agent_count
}
