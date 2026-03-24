import { ConvexHttpClient } from "convex/browser";

const client = new ConvexHttpClient("https://beaming-crocodile-136.convex.cloud");

try {
  const games = await client.query("crewkill:listGames");
  const game = games.find((g) => g.status === "ACTIVE");
  if (!game) { console.log("No ACTIVE game"); process.exit(0); }
  
  console.log("Testing endGame on", game.roomId);
  await client.mutation("crewkill:endGame", {
    roomId: game.roomId,
    crewmatesWon: true,
    winReason: "Manual cleanup test",
    winningsPerPlayer: "0"
  });
  console.log("Success! status updated.");
} catch (e) {
  console.error("Mutation failed:", e);
}
