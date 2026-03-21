---
phase: 2
plan: 1
wave: 1
---

# Plan 2.1: On-Chain Role Assignment (VRF)

## Objective
Transition role assignment from manual admin-selection to verifiable on-chain randomness using `one::random`.

## Context
- .gsd/SPEC.md
- .gsd/ROADMAP.md
- contracts/sources/game_settlement.move
- server/src/services/KeeperService.ts

## Tasks

<task type="auto">
  <name>Update game_settlement.move with Randomness</name>
  <files>
    ["contracts/sources/game_settlement.move"]
  </files>
  <action>
    - Import `one::random::{Self, Random}`.
    - Add `assign_roles_randomly` entry function:
      ```move
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
          
          // Determine impostor count (e.g., 1 for < 8 players, 2 for 8+)
          let impostor_count = if (num_players >= 8) { 2 } else { 1 };
          
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
      ```
    - Note: Adjust imports and logic based on actual `one::random` API if it differs from Sui standard.
  </action>
  <verify>Run `one client build` in contracts directory (or equivalent Move build command).</verify>
  <done>Move contract updated with verifiable randomness for role assignment.</done>
</task>

<task type="auto">
  <name>Update KeeperService for VRF Flow</name>
  <files>
    ["server/src/services/KeeperService.ts"]
  </files>
  <action>
    - Update `KeeperService` to call `assign_roles_randomly` during the game start sequence.
    - Pass the `RANDOM_STATE_ID` (usually `0x8`) as the Random object argument.
  </action>
  <verify>Check KeeperService.ts for the move call update.</verify>
  <done>KeeperService now triggers randomized role assignment on-chain.</done>
</task>

## Success Criteria
- [ ] Game roles are assigned on-chain using the Random object.
- [ ] KeeperService correctly invokes the new random-role-assignment function.
