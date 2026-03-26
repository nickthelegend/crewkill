import React from "react";

import { cn } from "@/lib/utils";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import { Card, CardContent } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const generateSalesData = (period: "1d" | "1w" | "1m" | "3m" | "1y") => {
  const baseSales = 100;
  const dataPoints =
    period === "1d"
      ? 24
      : period === "1w"
        ? 7
        : period === "1m"
          ? 30
          : period === "3m"
            ? 90
            : 365;

  return Array.from({ length: dataPoints }, (_, i) => ({
    time: i,
    sales: baseSales + (Math.random() - 0.3) * 40 + Math.sin(i * 0.2) * 15,
    timestamp: new Date(
      Date.now() - (dataPoints - i) * (period === "1d" ? 3600000 : 86400000),
    ).toISOString(),
  }));
};

const chartConfig: ChartConfig = {
  sales: {
    label: "Volume",
    color: "#f97316",
  },
};

export const TotalSalesChart = ({ fullWidth = false }: { fullWidth?: boolean }) => {
  const [selectedPeriod, setSelectedPeriod] = React.useState<
    "1d" | "1w" | "1m" | "3m" | "1y"
  >("1m");

  const salesData = generateSalesData(selectedPeriod);

  const periods: { label: string; value: "1d" | "1w" | "1m" | "3m" | "1y" }[] =
    [
      { label: "1D", value: "1d" },
      { label: "1W", value: "1w" },
      { label: "1M", value: "1m" },
      { label: "3M", value: "3m" },
      { label: "1Y", value: "1y" },
    ];

  return (
    <Card className={cn(
      "flex w-full flex-col gap-0 p-8 shadow-none bg-transparent border-none text-white",
      !fullWidth && "max-w-[400px] bg-black/40 border-white/10 p-5"
    )}>
      <CardContent className="flex flex-col gap-8 p-0">
        <div className="flex items-center justify-center p-0.5 bg-white/5 border border-white/10 rounded-lg w-fit mx-auto">
          {periods.map((period) => (
            <button
              key={period.value}
              onClick={() => setSelectedPeriod(period.value)}
              className={cn(
                "px-6 py-2 text-[10px] font-black uppercase tracking-widest transition-all",
                selectedPeriod === period.value
                  ? "bg-white/10 text-white shadow-lg"
                  : "text-white/20 hover:text-white/40"
              )}
            >
              {period.label}
            </button>
          ))}
        </div>

        <ChartContainer
          config={chartConfig}
          className={cn("aspect-auto w-full", fullWidth ? "h-[350px]" : "h-[180px]")}
        >
          <LineChart accessibilityLayer data={salesData} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
            <defs>
              <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#c026d3" />
              </linearGradient>
              <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            <CartesianGrid
              vertical={false}
              strokeDasharray="4 4"
              stroke="rgba(255,255,255,0.05)"
            />
            <XAxis dataKey="time" hide />
            <YAxis hide domain={["dataMin - 10", "dataMax + 10"]} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  hideIndicator
                  hideLabel
                  className="bg-black/90 border-white/10 text-white"
                  labelFormatter={(value: any) => {
                    return `${value.toFixed(2)} CREW`;
                  }}
                />
              }
              cursor={{ stroke: "#f97316", strokeWidth: 1 }}
            />
            <Line
              type="monotone"
              dataKey="sales"
              stroke="url(#lineGradient)"
              strokeWidth={fullWidth ? 4 : 3}
              dot={false}
              filter="url(#neonGlow)"
              activeDot={{
                r: 6,
                fill: "#ffffff",
                stroke: "#06b6d4",
                strokeWidth: 2,
              }}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};
