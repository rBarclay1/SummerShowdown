"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"

type Entry = {
  name: string
  score: number
  rank: number
  onFire: boolean
}

const TOOLTIP_STYLE = {
  background: "rgba(10,15,30,0.95)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "8px",
  fontSize: 12,
  color: "#e2e8f0",
}

export default function OverallLeaderChart({ data }: { data: Entry[] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
        No data yet — log some PRs to see the leaderboard chart.
      </div>
    )
  }

  return (
    <div
      className="w-full overflow-x-auto"
      style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}
    >
      <ResponsiveContainer width="100%" minWidth={320} height={Math.max(200, data.length * 44)}>
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 4, right: 48, left: 8, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v}%`}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 12, fill: "#e2e8f0" }}
            tickLine={false}
            axisLine={false}
            width={110}
          />
          <Tooltip
            formatter={(value) => [typeof value === "number" ? `${value.toFixed(1)}%` : `${value}`, "Avg Gain"]}
            contentStyle={TOOLTIP_STYLE}
            labelStyle={{ fontWeight: 600, color: "#f1f5f9" }}
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
          />
          <Bar dataKey="score" radius={[0, 4, 4, 0]}>
            {data.map((entry, i) => (
              <Cell
                key={entry.name}
                fill={
                  i === 0
                    ? "#f59e0b" // gold for #1
                    : entry.score >= 0
                    ? "#10b981" // emerald for positive
                    : "#ef4444" // red for negative
                }
                fillOpacity={0.85}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
