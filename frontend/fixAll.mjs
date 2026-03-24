import { ConvexHttpClient } from "convex/browser";
const client = new ConvexHttpClient("https://beaming-crocodile-136.convex.cloud");

try {
  const games = await client.query("crewkill:listGames");
  const actives = games.filter((g) => g.status === "ACTIVE");
  console.log(`Found ${actives.length} ACTIVE games`);
  
  for (const game of actives) {
    console.log("Patching", game.roomId);
    await client.mutation("crewkill:endGame", {
      roomId: game.roomId,
      crewmatesWon: true,
      winReason: "Manual cleanup test",
      winningsPerPlayer: "0"
    });
  }
  console.log("All done!");
} catch (e) {
  console.error("Failed:", e);
}
