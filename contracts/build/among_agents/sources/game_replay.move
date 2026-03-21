module among_agents::game_replay {
    use one::tx_context::{Self, TxContext};
    use one::object::{Self, UID, ID};
    use one::transfer;
    use std::string::{Self, String};
    use one::event;
    use one::package;
    use one::display;

    /// The NFT representation of a CrewKill game replay.
    public struct GameReplayNFT has key, store {
        id: UID,
        game_id: ID,
        replay_blob_id: String, // Walrus Blob ID
        round_count: u64,
        winner_side: u8, // 1 for Crewmate, 2 for Impostor
        timestamp: u64,
        players: vector<address>,
    }

    /// Onetime witness for display setup
    public struct GAME_REPLAY has drop {}

    /// Capability to mint game replays
    public struct MintCap has key, store {
        id: UID,
    }

    // ======== Events ========

    public struct ReplayMinted has copy, drop {
        nft_id: ID,
        game_id: ID,
        blob_id: String,
        winner_side: u8,
    }

    // ======== Initialization ========

    fun init(otw: GAME_REPLAY, ctx: &mut TxContext) {
        let publisher = package::claim(otw, ctx);

        let keys = vector[
            string::utf8(b"name"),
            string::utf8(b"description"),
            string::utf8(b"image_url"),
            string::utf8(b"project_url"),
            string::utf8(b"game_id"),
        ];

        let values = vector[
            string::utf8(b"CrewKill Replay #{game_id}"),
            string::utf8(b"A permanent on-chain record of an autonomous AI agent battle on OneChain. Captured in JSONL format on Walrus."),
            string::utf8(b"https://arweave.net/crewkill-replay-cover.png"), // Default image
            string::utf8(b"https://crewkill.onelabs.cc"),
            string::utf8(b"{game_id}"),
        ];

        let mut disp = display::new_with_fields<GameReplayNFT>(
            &publisher, keys, values, ctx
        );

        display::update_version(&mut disp);

        transfer::public_transfer(publisher, tx_context::sender(ctx));
        transfer::public_transfer(disp, tx_context::sender(ctx));

        let cap = MintCap { id: object::new(ctx) };
        transfer::public_transfer(cap, tx_context::sender(ctx));
    }

    // ======== Public Entry Functions ========

    public entry fun mint_replay(
        _: &MintCap,
        game_id: ID,
        replay_blob_id: vector<u8>,
        round_count: u64,
        winner_side: u8,
        timestamp: u64,
        players: vector<address>,
        recipient: address,
        ctx: &mut TxContext
    ) {
        let id = object::new(ctx);
        let nft_id = object::uid_to_inner(&id);
        let blob_str = string::utf8(replay_blob_id);

        let nft = GameReplayNFT {
            id,
            game_id,
            replay_blob_id: blob_str,
            round_count,
            winner_side,
            timestamp,
            players,
        };

        event::emit(ReplayMinted {
            nft_id: nft_id,
            game_id,
            blob_id: blob_str,
            winner_side,
        });

        transfer::public_transfer(nft, recipient);
    }

    // ======== View Functions ========

    public fun blob_id(nft: &GameReplayNFT): &String {
        &nft.replay_blob_id
    }

    public fun game_id(nft: &GameReplayNFT): ID {
        nft.game_id
    }
}
