"use client"

import { useState } from "react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

type DataPoint = Record<string, string | number>

const COLORS = [
  "#10b981", // emerald-500
  "#6366f1", // indigo-500
  "#f59e0b", // amber-500
  "#ef4444", // red-500
  "#8b5cf6", // violet-500
  "#06b6d4", // cyan-500
  "#ec4899", // pink-500
  "#84cc16", // lime-500
  "#f97316", // orange-500
  "#14b8a6", // teal-500
]

const TICK = { fontSize: 11, fill: "#94a3b8" }

const TOOLTIP_STYLE = {
  background: "rgba(10,15,30,0.95)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "8px",
  fontSize: 12,
  color: "#e2e8f0",
}

export default function LeaderboardProgressChart({
  chartData,
  athleteNames,
  mainLiftName,
  height = 280,
}: {
  chartData: DataPoint[]
  athleteNames: string[]
  mainLiftName: string
  height?: number
}) {
  const [hidden, setHidden] = useState<Set<string>>(new Set())

  function toggle(name: string) {
    setHidden((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  if (chartData.length < 2) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
        Log PRs from at least two different dates to see a progress chart.
      </div>
    )
  }

  return (
    <div>
      <div
        className="w-full overflow-x-auto"
        style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}
      >
        <ResponsiveContainer width="100%" minWidth={320} height={height}>
          <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
            <XAxis dataKey="date" tick={TICK} tickLine={false} axisLine={false} />
            <YAxis
              tick={TICK}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}%`}
              width={48}
            />
            <Tooltip
              formatter={(value, name) => [`${value}%`, name as string]}
              contentStyle={TOOLTIP_STYLE}
              labelStyle={{ fontWeight: 600, color: "#f1f5f9" }}
            />
            {athleteNames.map((name, i) => (
              <Line
                key={name}
                type="monotone"
                dataKey={name}
                stroke={COLORS[i % COLORS.length]}
                strokeWidth={hidden.has(name) ? 0 : 2}
                dot={hidden.has(name) ? false : { r: 3 }}
                activeDot={hidden.has(name) ? false : { r: 5 }}
                connectNulls
                hide={hidden.has(name)}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Custom legend — click to toggle */}
      <div className="flex flex-wrap gap-2 mt-3 px-1">
        {athleteNames.map((name, i) => (
          <button
            key={name}
            onClick={() => toggle(name)}
            title={hidden.has(name) ? `Show ${name}` : `Hide ${name}`}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-opacity min-h-[32px] ${
              hidden.has(name)
                ? "opacity-35 border-white/10"
                : "opacity-100 border-white/20"
            }`}
          >
            <span
              className="w-3 h-[2px] rounded-full inline-block shrink-0"
              style={{ backgroundColor: COLORS[i % COLORS.length] }}
            />
            {name}
          </button>
        ))}
      </div>

      <p className="text-xs text-muted-foreground mt-2 px-1">
        Main lift: <span className="font-medium">{mainLiftName}</span> · % gain from each athlete&apos;s personal baseline · Click a name to hide/show
      </p>
    </div>
  )
}
