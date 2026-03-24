import { ConvexHttpClient } from "convex/browser";
import dotenv from "dotenv";
dotenv.config({ path: ".env" });

const convex = new ConvexHttpClient(process.env.CONVEX_URL);

async function check() {
  const games = await convex.query("crewkill:listGames");
  const latestGame = games[0];
  console.log("Latest Game Status:", latestGame.status);
  console.log("Latest Game Phase:", latestGame.phase);
  console.log("Latest Game winningsPerPlayer:", latestGame.winningsPerPlayer);
  console.log("Winner side logic crewmates won?", latestGame.crewmatesWon);
}
check();
