module among_agents::amm;

use one::object::{Self, UID, ID};
use one::tx_context::{Self, TxContext};
use one::balance::{Self, Balance};
use one::coin::{Self, Coin};
use one::transfer;
use one::event;

// ======== Error Codes ========
const E_INSUFFICIENT_LIQUIDITY: u64 = 0;
const E_INSUFFICIENT_INPUT_AMOUNT: u64 = 1;

// ======== Structs ========

/// A liquidity pool for two coin types.
/// Implements Constant Product Market Maker (x * y = k).
public struct Pool<phantom X, phantom Y> has key {
    id: UID,
    reserve_x: Balance<X>,
    reserve_y: Balance<Y>,
    fee_bps: u64, // Fee in basis points (e.g., 30 = 0.3%)
}

// ======== Events ========

public struct SwapExecuted has copy, drop {
    pool_id: ID,
    sender: address,
    amount_in: u64,
    amount_out: u64,
    x_to_y: bool,
}

public struct LiquidityAdded has copy, drop {
    pool_id: ID,
    amount_x: u64,
    amount_y: u64,
}

// ======== Public Entry Functions ========

/// Create a new shared liquidity pool for two coin types.
public entry fun create_pool<X, Y>(ctx: &mut TxContext) {
    let pool = Pool<X, Y> {
        id: object::new(ctx),
        reserve_x: balance::zero(),
        reserve_y: balance::zero(),
        fee_bps: 30, // 0.3% standard fee
    };
    transfer::share_object(pool);
}

/// Add liquidity to the pool. 
/// In this version, we don't issue LP tokens to keep it simple as per request,
/// but reserves are tracked on-chain.
public entry fun add_liquidity<X, Y>(
    pool: &mut Pool<X, Y>,
    coin_x: Coin<X>,
    coin_y: Coin<Y>,
) {
    let amount_x = coin::value(&coin_x);
    let amount_y = coin::value(&coin_y);
    
    balance::join(&mut pool.reserve_x, coin::into_balance(coin_x));
    balance::join(&mut pool.reserve_y, coin::into_balance(coin_y));

    event::emit(LiquidityAdded {
        pool_id: object::id(pool),
        amount_x,
        amount_y,
    });
}

/// Swap Coin X for Coin Y.
public entry fun swap_x_to_y<X, Y>(
    pool: &mut Pool<X, Y>,
    coin_x: Coin<X>,
    ctx: &mut TxContext,
) {
    let amount_in = coin::value(&coin_x);
    assert!(amount_in > 0, E_INSUFFICIENT_INPUT_AMOUNT);

    let reserve_x = (balance::value(&pool.reserve_x) as u128);
    let reserve_y = (balance::value(&pool.reserve_y) as u128);
    assert!(reserve_x > 0 && reserve_y > 0, E_INSUFFICIENT_LIQUIDITY);

    // Use u128 for intermediate calculations to prevent overflow
    // Formula: dy = (y * dx * (1 - fee)) / (x + dx * (1 - fee))
    let amount_in_with_fee = (amount_in as u128) * (10000 - (pool.fee_bps as u128));
    let denominator = (reserve_x * 10000) + amount_in_with_fee;
    let amount_out = (amount_in_with_fee * reserve_y) / denominator;

    assert!(amount_out > 0, E_INSUFFICIENT_LIQUIDITY);

    // Update pool reserves
    balance::join(&mut pool.reserve_x, coin::into_balance(coin_x));
    let coin_out = coin::from_balance(
        balance::split(&mut pool.reserve_y, (amount_out as u64)), 
        ctx
    );

    // Send the swapped tokens to the user
    transfer::public_transfer(coin_out, ctx.sender());

    event::emit(SwapExecuted {
        pool_id: object::id(pool),
        sender: ctx.sender(),
        amount_in,
        amount_out: (amount_out as u64),
        x_to_y: true,
    });
}

/// Swap Coin Y for Coin X.
public entry fun swap_y_to_x<X, Y>(
    pool: &mut Pool<X, Y>,
    coin_y: Coin<Y>,
    ctx: &mut TxContext,
) {
    let amount_in = coin::value(&coin_y);
    assert!(amount_in > 0, E_INSUFFICIENT_INPUT_AMOUNT);

    let reserve_x = (balance::value(&pool.reserve_x) as u128);
    let reserve_y = (balance::value(&pool.reserve_y) as u128);
    assert!(reserve_x > 0 && reserve_y > 0, E_INSUFFICIENT_LIQUIDITY);

    let amount_in_with_fee = (amount_in as u128) * (10000 - (pool.fee_bps as u128));
    let denominator = (reserve_y * 10000) + amount_in_with_fee;
    let amount_out = (amount_in_with_fee * reserve_x) / denominator;

    assert!(amount_out > 0, E_INSUFFICIENT_LIQUIDITY);

    // Update pool reserves
    balance::join(&mut pool.reserve_y, coin::into_balance(coin_y));
    let coin_out = coin::from_balance(
        balance::split(&mut pool.reserve_x, (amount_out as u64)), 
        ctx
    );

    // Send the swapped tokens to the user
    transfer::public_transfer(coin_out, ctx.sender());

    event::emit(SwapExecuted {
        pool_id: object::id(pool),
        sender: ctx.sender(),
        amount_in,
        amount_out: (amount_out as u64),
        x_to_y: false,
    });
}

// ======== View Functions ========

public fun get_reserves<X, Y>(pool: &Pool<X, Y>): (u64, u64) {
    (balance::value(&pool.reserve_x), balance::value(&pool.reserve_y))
}

public fun get_fee_bps<X, Y>(pool: &Pool<X, Y>): u64 {
    pool.fee_bps
}
