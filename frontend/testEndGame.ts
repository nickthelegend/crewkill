import { ConvexHttpClient } from "convex/browser";

const client = new ConvexHttpClient("https://beaming-crocodile-136.convex.cloud");

async function run() {
  const games = await client.query("crewkill:listGames" as any, {});
  const game = games.find((g: any) => g.status === "ACTIVE");
  if (!game) { console.log("No ACTIVE game"); return; }
  
  console.log("Testing endGame on", game.roomId);
  try {
    await client.mutation("crewkill:endGame" as any, {
      roomId: game.roomId,
      crewmatesWon: true,
      winReason: "Manual cleanup test",
      winningsPerPlayer: "0"
    });
    console.log("Success! status updated.");
  } catch (e: any) {
    console.error("Mutation failed:", e.message);
  }
}
run();
