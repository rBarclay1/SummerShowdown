"use client"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts"

type DataPoint = { date: string; weight: number }

const TICK = { fontSize: 10, fill: "#94a3b8" }

const TOOLTIP_STYLE = {
  background: "rgba(10,15,30,0.95)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "8px",
  fontSize: 12,
  color: "#e2e8f0",
}

export default function LiftProgressChart({
  data,
  baseline,
  color = "#10b981",
  height = 200,
}: {
  data: DataPoint[]
  baseline: number
  color?: string
  height?: number
}) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
        No data yet.
      </div>
    )
  }

  const weights = data.map((d) => d.weight)
  const minY = Math.min(baseline, ...weights)
  const maxY = Math.max(baseline, ...weights)
  const padding = Math.max((maxY - minY) * 0.15, 5)
  const domain: [number, number] = [
    Math.floor(minY - padding),
    Math.ceil(maxY + padding),
  ]

  return (
    <div className="w-full overflow-x-auto" style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}>
      <ResponsiveContainer width="100%" minWidth={260} height={height}>
        <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
          <XAxis dataKey="date" tick={TICK} tickLine={false} axisLine={false} />
          <YAxis
            domain={domain}
            tick={TICK}
            tickLine={false}
            axisLine={false}
            width={44}
            tickFormatter={(v) => `${v}`}
          />
          <Tooltip
            formatter={(value) => [`${value} lbs`, "Weight"]}
            contentStyle={TOOLTIP_STYLE}
            labelStyle={{ color: "#f1f5f9" }}
          />
          <ReferenceLine
            y={baseline}
            stroke="#64748b"
            strokeDasharray="5 3"
            label={{
              value: `Baseline · ${baseline} lbs`,
              position: "insideTopLeft",
              fontSize: 9,
              fill: "#64748b",
              dy: -2,
            }}
          />
          <Line
            type="monotone"
            dataKey="weight"
            stroke={color}
            strokeWidth={2}
            dot={data.length === 1 ? { r: 4 } : { r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
