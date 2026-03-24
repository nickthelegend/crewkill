import { ConvexHttpClient } from "convex/browser";

const client = new ConvexHttpClient("https://beaming-crocodile-136.convex.cloud");

async function run() {
  const games = await client.query("crewkill:listGames" as any, {});
  console.log("Found games:", games.length);
  for (const game of games) {
    if (game.status === "ACTIVE") {
      console.log("Patching game:", game.roomId);
      await client.mutation("crewkill:endGame" as any, {
        roomId: game.roomId,
        crewmatesWon: true,
        winReason: "Manual cleanup",
        winningsPerPlayer: "0"
      });
      console.log("Patched!");
    }
  }
}
run().catch(console.error);
