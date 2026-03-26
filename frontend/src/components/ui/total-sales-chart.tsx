import React, { useMemo } from "react";
import { cn } from "@/lib/utils";
import { CartesianGrid, Line, LineChart, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

import { PlayerColors } from "@/types/game";

export const TotalSalesChart = ({ 
  fullWidth = false,
  bets = [],
  players = []
}: { 
  fullWidth?: boolean,
  bets?: any[],
  players?: any[]
}) => {
  const chartData = useMemo(() => {
    if (!players || players.length === 0) return [];
    
    // Sort bets by time
    const sortedBets = [...(bets || [])].sort((a, b) => a.createdAt - b.createdAt);
    const startTime = sortedBets.length > 0 ? sortedBets[0].createdAt : Date.now() - 3600000;
    const endTime = Date.now();
    const duration = Math.max(endTime - startTime, 1000);
    
    const dataPoints = 30; // Number of interpolation points
    const points = [];
    
    for (let i = 0; i < dataPoints; i++) {
      const t = startTime + (duration * (i / (dataPoints - 1)));
      const betsToT = sortedBets.filter(b => b.createdAt <= t);
      const totalPotToT = betsToT.reduce((sum, b) => sum + (b.amountMist / 1e9), 0);
      
      const point: any = { time: i, timestamp: new Date(t).toISOString() };
      
      players.forEach((player) => {
        const playerPool = betsToT
          .filter(b => b.selection.toLowerCase() === player.address.toLowerCase())
          .reduce((sum, b) => sum + (b.amountMist / 1e9), 0);
        
        // Probability is % of total pot, fallback to even distribution if no bets
        const baseProb = totalPotToT > 0 
          ? (playerPool / totalPotToT) * 100 
          : 100 / players.length;
        
        // Add tiny jitter so they don't overlap perfectly
        const jitter = Math.sin((i + player.address.charCodeAt(0)) * 0.1) * 0.5;
        point[player.address] = Math.max(0, Math.min(100, baseProb + jitter));
      });
      
      points.push(point);
    }
    
    return points;
  }, [bets, players]);

  // Create chart config dynamically for lines
  const chartConfig = useMemo(() => {
    const config: ChartConfig = {};
    players.forEach((p) => {
      config[p.address] = {
        label: p.name,
        color: PlayerColors[(p.colorId ?? 0)].hex,
      };
    });
    return config;
  }, [players]);

  return (
    <Card className={cn(
      "flex w-full flex-col gap-0 p-4 md:p-8 shadow-none bg-transparent border-none text-white",
      !fullWidth && "max-w-4xl bg-black/40 border-white/10"
    )}>
      <CardContent className="p-0 relative">
        <div className="flex justify-between items-center mb-6">
           <div>
              <h4 className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em] mb-1">Market Sentiment</h4>
              <div className="text-xl font-black text-white uppercase tracking-tighter">Win Probability %</div>
           </div>
            <div className="flex flex-wrap gap-2 max-w-[60%] justify-end">
               {players.map((p) => (
                 <div key={p.address} className="flex items-center gap-1 bg-white/5 px-1.5 py-0.5 rounded border border-white/10">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: PlayerColors[(p.colorId ?? 0)].hex }} />
                    <span className="text-[8px] font-black text-white/60 uppercase tracking-widest truncate max-w-[50px]">{p.name.split(' ')[0]}</span>
                 </div>
               ))}
            </div>
        </div>

        <ChartContainer
          config={chartConfig}
          className={cn("aspect-auto w-full", fullWidth ? "h-[450px]" : "h-[250px]")}
        >
          <LineChart data={chartData} margin={{ top: 20, right: 80, left: 10, bottom: 20 }}>
            <CartesianGrid
              vertical={false}
              strokeDasharray="4 4"
              stroke="rgba(255,255,255,0.05)"
            />
            <XAxis dataKey="time" hide />
            <YAxis 
              domain={[0, 100]} 
              tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10, fontWeight: '900' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(val) => `${val}%`}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  className="bg-black/90 border-white/10 text-white"
                />
              }
            />
            {players.map((player) => {
              const colorIdx = player.colorId !== undefined ? player.colorId : 0;
              return (
                <Line
                  key={player.address}
                  type="monotone"
                  dataKey={player.address}
                  stroke={PlayerColors[colorIdx].hex}
                  strokeWidth={4}
                  dot={true}
                  animationDuration={300}
                />
              );
            })}
          </LineChart>
        </ChartContainer>

        {/* Floating Labels at current end-points */}
        <div className="absolute top-0 right-0 h-full w-[80px] flex flex-col justify-center gap-1 pointer-events-none">
           {players.map((player, i) => {
              const lastPoint = chartData[chartData.length - 1];
              const percentage = lastPoint ? lastPoint[player.address] : 0;
              return (
                <div 
                  key={`label-${player.address}`}
                  className="flex flex-col items-start"
                  style={{ 
                    position: 'absolute',
                    top: `${100 - (percentage || 0)}%`,
                    transform: 'translateY(-50%)',
                    right: 0
                  }}
                >
                   <span className="text-[10px] font-black uppercase tracking-tighter leading-none" style={{ color: PlayerColors[(player.colorId ?? 0)].hex }}>
                      {player.name.split(' ')[0]}
                   </span>
                   <span className="text-sm font-black text-white tabular-nums leading-none">
                      {Math.round(percentage)}%
                   </span>
                </div>
              );
           })}
        </div>
      </CardContent>
    </Card>
  );
};
