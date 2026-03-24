import { ConvexHttpClient } from "convex/browser";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });

const convex = new ConvexHttpClient(process.env.CONVEX_URL);

async function fix() {
  const games = await convex.query("crewkill:listGames");
  console.log(`Found ${games.length} games. Fixing abandoned ones...`);
  
  // Actually we cannot patch without a mutation. We just added `endGame`
  for (const game of games) {
    if (game.status === "ACTIVE") {
      console.log(`Ending active game: ${game.roomId}`);
      try {
        await convex.mutation("crewkill:endGame", {
          roomId: game.roomId,
          crewmatesWon: true,
          winReason: "Manual cleanup",
          winningsPerPlayer: "0"
        });
        console.log("Success");
      } catch (e) {
        console.error("Failed:", e.message);
      }
    }
  }
}
fix();
