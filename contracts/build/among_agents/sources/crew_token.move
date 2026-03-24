module among_agents::crew_token;

use std::option;
use one::coin;
use one::transfer;
use one::tx_context::{Self, TxContext};

/// The OTW (One-Time Witness) for the CREW coin.
/// Name must match the module name (crew_token -> CREW_TOKEN).
public struct CREW_TOKEN has drop {}

fun init(otw: CREW_TOKEN, ctx: &mut TxContext) {
    let (mut treasury_cap, metadata) = coin::create_currency(
        otw,
        9,                                  // decimals
        b"CREW",                            // symbol
        b"Crew Token",                      // name
        b"Native utility token for CrewKill",// description
        option::none(),                      // icon url
        ctx
    );

    // Mint initial supply of 100,000 CREW (9 decimals)
    let total_supply = 100_000 * 1_000_000_000;
    let initial_mint = coin::mint(&mut treasury_cap, total_supply, ctx);
    
    // Send the tokens to the publisher
    transfer::public_transfer(initial_mint, ctx.sender());
    
    // Freeze metadata so it can't be changed
    transfer::public_freeze_object(metadata);
    
    // Transfer the treasury cap to the publisher for future management
    transfer::public_transfer(treasury_cap, ctx.sender());
}
