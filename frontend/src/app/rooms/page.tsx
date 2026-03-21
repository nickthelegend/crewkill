import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { SpaceBackground } from "@/components/game/SpaceBackground";
import { AmongUsSprite } from "@/components/game/AmongUsSprite";

export default function RoomsPage() {
  const games = useQuery(api.crewkill.listGames, {}) || [];

  return (
    <SpaceBackground>
      <div className="py-12 max-w-6xl mx-auto px-4">
        <header className="mb-12">
          <h1 className="text-5xl font-black italic tracking-tighter uppercase">
            Active <span className="text-red-500">Rooms</span>
          </h1>
          <p className="text-white/40 font-mono tracking-widest text-xs mt-2 uppercase">
            Browse live and upcoming combat arenas
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {games.map((game) => (
            <RoomCard key={game.roomId} game={game} />
          ))}

          {games.length === 0 && (
            <div className="col-span-full py-20 text-center bg-white/5 rounded-3xl border border-white/10">
              <p className="text-white/20 font-black uppercase tracking-widest">No games scheduled</p>
            </div>
          )}
        </div>
      </div>
    </SpaceBackground>
  );
}

function RoomCard({ game }: { game: any }) {
  const isStarting = game.status === "CREATED";
  const startAt = game.scheduledAt ? new Date(game.scheduledAt) : null;
  const bettingEndsAt = game.bettingEndsAt ? new Date(game.bettingEndsAt) : null;
  const isBettingOpen = bettingEndsAt ? Date.now() < bettingEndsAt.getTime() : false;

  return (
    <div className="group relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 hover:bg-white/10 transition-all border-l-4 border-l-red-500">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-lg font-black text-white uppercase truncate w-40">
            {game.roomId.replace("scheduled_", "ALPHA-")}
          </h3>
          <p className="text-[10px] text-white/40 font-mono uppercase tracking-widest">
            {game.status}
          </p>
        </div>
        <div className="flex -space-x-2">
           {[...Array(3)].map((_, i) => (
             <div key={i} className="w-8 h-8 rounded-full border-2 border-black bg-gray-900 overflow-hidden flex items-center justify-center">
                <AmongUsSprite colorId={i + (game.roomId.length % 10)} size={20} />
             </div>
           ))}
        </div>
      </div>

      <div className="space-y-3 mb-8">
        <div className="flex justify-between items-center text-xs font-bold uppercase">
          <span className="text-white/30">Scheduled For</span>
          <span className="text-white">{startAt ? formatDistanceToNow(startAt, { addSuffix: true }) : "N/A"}</span>
        </div>
        <div className="flex justify-between items-center text-xs font-bold uppercase">
          <span className="text-white/30">Betting Status</span>
          <span className={isBettingOpen ? "text-green-400" : "text-red-500"}>
            {isBettingOpen ? "OPEN" : "CLOSED"}
          </span>
        </div>
      </div>

      <div className="flex gap-2">
        <Link 
          href={`/room/${game.roomId}`}
          className="flex-1 bg-white/10 hover:bg-white/20 text-white text-xs font-black py-4 rounded-2xl text-center transition-all uppercase tracking-widest"
        >
          Details
        </Link>
        {game.status === "CREATED" ? (
          <Link 
             href={`/market?roomId=${game.roomId}`}
             className="flex-1 bg-red-600 hover:bg-red-500 text-white text-xs font-black py-4 rounded-2xl text-center transition-all uppercase tracking-widest shadow-[0_0_20px_rgba(220,38,38,0.3)]"
          >
            Predict
          </Link>
        ) : (
          <Link 
             href={`/room/${game.roomId}/live`}
             className="flex-1 bg-green-600 hover:bg-green-500 text-white text-xs font-black py-4 rounded-2xl text-center transition-all uppercase tracking-widest shadow-[0_0_20px_rgba(22,163,74,0.3)]"
          >
            Live View
          </Link>
        )}
      </div>
    </div>
  );
}
