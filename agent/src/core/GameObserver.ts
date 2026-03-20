import {
  createPublicClient,
  http,
  type PublicClient,
  type Address,
  getContract,
} from "viem";
import { AmongUsGameABI, AmongUsGameFactoryABI } from "../abi/index.js";
import {
  GameState,
  GamePhase,
  Player,
  DeadBody,
  Location,
  Role,
  SabotageType,
  GameConfig,
  DiscussionMessage,
} from "../types.js";

export class GameObserver {
  private client: PublicClient;
  private factoryAddress: Address;
  private gameAddress: Address | null = null;
  private gameId: bigint | null = null;

  constructor(rpcUrl: string, factoryAddress: Address) {
    this.client = createPublicClient({
      transport: http(rpcUrl),
    });
    this.factoryAddress = factoryAddress;
  }

  // ============ FACTORY QUERIES ============

  async getActiveGames(): Promise<bigint[]> {
    const factory = getContract({
      address: this.factoryAddress,
      abi: AmongUsGameFactoryABI,
      client: this.client,
    });

    const games = (await factory.read.getActiveGames()) as bigint[];
    return games;
  }

  async getAvailableGames(): Promise<
    { gameId: bigint; playerCount: bigint; wagerAmount: bigint }[]
  > {
    const factory = getContract({
      address: this.factoryAddress,
      abi: AmongUsGameFactoryABI,
      client: this.client,
    });

    const [gameIds, playerCounts, wagerAmounts] =
      (await factory.read.getAvailableGames()) as [bigint[], bigint[], bigint[]];

    return gameIds.map((id, i) => ({
      gameId: id,
      playerCount: playerCounts[i],
      wagerAmount: wagerAmounts[i],
    }));
  }

  async getGameAddress(gameId: bigint): Promise<Address> {
    const factory = getContract({
      address: this.factoryAddress,
      abi: AmongUsGameFactoryABI,
      client: this.client,
    });

    return (await factory.read.games([gameId])) as Address;
  }

  // ============ GAME STATE QUERIES ============

  setGame(gameAddress: Address, gameId: bigint): void {
    this.gameAddress = gameAddress;
    this.gameId = gameId;
  }

  private getGameContract() {
    if (!this.gameAddress) {
      throw new Error("No game address set. Call setGame() first.");
    }
    return getContract({
      address: this.gameAddress,
      abi: AmongUsGameABI,
      client: this.client,
    });
  }

  async getGameState(): Promise<GameState> {
    const game = this.getGameContract();
    const state = (await game.read.state()) as any[];

    return {
      gameId: state[0] as bigint,
      phase: Number(state[1]) as GamePhase,
      round: state[2] as bigint,
      phaseEndTime: state[3] as bigint,
      alivePlayers: Number(state[4]),
      aliveCrewmates: Number(state[5]),
      aliveImpostors: Number(state[6]),
      totalTasksCompleted: Number(state[7]),
      totalTasksRequired: Number(state[8]),
      activeSabotage: Number(state[9]) as SabotageType,
      sabotageEndTime: state[10] as bigint,
      winner: state[11] as Address,
      crewmatesWon: state[12] as boolean,
    };
  }

  async getGameConfig(): Promise<GameConfig> {
    const game = this.getGameContract();
    const config = (await game.read.config()) as any[];

    return {
      minPlayers: Number(config[0]),
      maxPlayers: Number(config[1]),
      numImpostors: Number(config[2]),
      wagerAmount: config[3] as bigint,
      actionTimeout: config[4] as bigint,
      voteTimeout: config[5] as bigint,
      discussionTime: config[6] as bigint,
      tasksPerPlayer: Number(config[7]),
      visualTasks: config[8] as boolean,
      emergencyMeetings: Number(config[9]),
      killCooldown: config[10] as bigint,
    };
  }

  async getPlayer(address: Address): Promise<Player> {
    const game = this.getGameContract();
    const player = (await game.read.players([address])) as any[];

    return {
      address: player[0] as Address,
      colorId: Number(player[1]),
      role: Number(player[2]) as Role,
      location: Number(player[3]) as Location,
      isAlive: player[4] as boolean,
      tasksCompleted: Number(player[5]),
      totalTasks: Number(player[6]),
      wagerAmount: player[7] as bigint,
      hasVoted: player[8] as boolean,
      lastActionRound: player[9] as bigint,
    };
  }

  async getAllPlayers(): Promise<Address[]> {
    const game = this.getGameContract();
    return (await game.read.getAllPlayers()) as Address[];
  }

  async getPlayersAtLocation(location: Location): Promise<Address[]> {
    const game = this.getGameContract();
    return (await game.read.getPlayersAtLocation([location])) as Address[];
  }

  async getMyRole(playerAddress: Address): Promise<Role> {
    const game = this.getGameContract();
    // This would need to be called from the player's account
    // For now, return from player struct (which shows None until revealed)
    const player = await this.getPlayer(playerAddress);
    return player.role;
  }

  async getDeadBodies(): Promise<DeadBody[]> {
    const game = this.getGameContract();
    const bodies = (await game.read.getDeadBodies()) as any[];

    return bodies.map((body: any) => ({
      victim: body[0] as Address,
      location: Number(body[1]) as Location,
      round: body[2] as bigint,
      reported: body[3] as boolean,
    }));
  }

  async getAdjacentRooms(location: Location): Promise<Location[]> {
    const game = this.getGameContract();
    const rooms = (await game.read.getAdjacentRooms([location])) as number[];
    return rooms.map((r) => r as Location);
  }

  async hasBodyAt(location: Location): Promise<boolean> {
    const game = this.getGameContract();
    return (await game.read.hasBodyAt([location])) as boolean;
  }

  async getDiscussionMessages(): Promise<DiscussionMessage[]> {
    const game = this.getGameContract();
    const messages = (await game.read.getMessages()) as any[];

    return messages.map((msg: any) => ({
      sender: msg[0] as Address,
      msgType: Number(msg[1]),
      target: msg[2] as Address,
      reason: Number(msg[3]),
      location: Number(msg[4]) as Location,
      timestamp: msg[5] as bigint,
    }));
  }

  async isGameEnded(): Promise<boolean> {
    const game = this.getGameContract();
    return (await game.read.isGameEnded()) as boolean;
  }

  async getPlayerCount(): Promise<number> {
    const game = this.getGameContract();
    return Number(await game.read.getPlayerCount());
  }

  // ============ COMMITMENT QUERIES ============

  async getCommitment(
    round: bigint,
    player: Address
  ): Promise<{ hash: `0x${string}`; timestamp: bigint; revealed: boolean }> {
    const game = this.getGameContract();
    const commitment = (await game.read.commitments([round, player])) as any[];

    return {
      hash: commitment[0] as `0x${string}`,
      timestamp: commitment[1] as bigint,
      revealed: commitment[2] as boolean,
    };
  }

  async hasCommitted(round: bigint, player: Address): Promise<boolean> {
    const commitment = await this.getCommitment(round, player);
    return (
      commitment.hash !==
      "0x0000000000000000000000000000000000000000000000000000000000000000"
    );
  }

  async hasRevealed(round: bigint, player: Address): Promise<boolean> {
    const commitment = await this.getCommitment(round, player);
    return commitment.revealed;
  }

  // ============ HELPER METHODS ============

  async getAlivePlayersInfo(): Promise<Player[]> {
    const addresses = await this.getAllPlayers();
    const players: Player[] = [];

    for (const addr of addresses) {
      const player = await this.getPlayer(addr);
      if (player.isAlive) {
        players.push(player);
      }
    }

    return players;
  }

  async getTimeRemaining(): Promise<number> {
    const state = await this.getGameState();
    const now = BigInt(Math.floor(Date.now() / 1000));
    const remaining = state.phaseEndTime - now;
    return remaining > 0n ? Number(remaining) : 0;
  }

  async waitForPhase(targetPhase: GamePhase, pollInterval = 2000): Promise<void> {
    return new Promise((resolve) => {
      const check = async () => {
        const state = await this.getGameState();
        if (state.phase === targetPhase) {
          resolve();
        } else {
          setTimeout(check, pollInterval);
        }
      };
      check();
    });
  }
}
