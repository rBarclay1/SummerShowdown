"use client"

import { useState, useTransition, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { logPR } from "@/app/log/actions"

type Leaderboard = {
  id: number
  name: string
  liftId: number
  liftName: string
  isTotalLoad: boolean
  activityType: string
}

function parseTimeToSeconds(input: string): number | null {
  const trimmed = input.trim()
  if (trimmed.includes(":")) {
    const parts = trimmed.split(":")
    if (parts.length !== 2) return null
    const mins = parseInt(parts[0], 10)
    const secs = parseFloat(parts[1])
    if (isNaN(mins) || isNaN(secs) || secs >= 60) return null
    return mins * 60 + secs
  }
  const secs = parseFloat(trimmed)
  return isNaN(secs) ? null : secs
}

export default function PRForm({
  leaderboards,
  athleteName,
  defaultLeaderboardId,
}: {
  leaderboards: Leaderboard[]
  athleteName: string
  defaultLeaderboardId?: number
}) {
  const [leaderboardId, setLeaderboardId] = useState<string>(
    defaultLeaderboardId?.toString() ?? ""
  )
  const [value, setValue] = useState("")
  const [unit, setUnit] = useState<"lbs" | "kg">("lbs")
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [result, setResult] = useState<
    | { type: "success"; message: string }
    | { type: "error"; message: string }
    | null
  >(null)
  const [isPending, startTransition] = useTransition()

  const selectedLeaderboard = leaderboards.find((l) => l.id.toString() === leaderboardId)
  const isTimeTrial = selectedLeaderboard?.activityType === "time_trial"

  useEffect(() => { setResult(null); setValue("") }, [leaderboardId])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setResult(null)

    const fd = new FormData()
    fd.append("leaderboardId", leaderboardId)
    fd.append("liftId", selectedLeaderboard!.liftId.toString())
    fd.append("date", date)

    if (isTimeTrial) {
      const seconds = parseTimeToSeconds(value)
      if (seconds === null || seconds <= 0) {
        setResult({ type: "error", message: "Enter a valid time in M:SS format (e.g. 7:30)." })
        return
      }
      fd.append("value", seconds.toString())
    } else {
      fd.append("value", value)
      fd.append("unit", unit)
    }

    startTransition(async () => {
      const res = await logPR(fd)
      if (res.success) {
        let display: string
        if (isTimeTrial) {
          const seconds = parseTimeToSeconds(value)!
          const mins = Math.floor(seconds / 60)
          const secs = Math.round(seconds % 60)
          display = `${mins}:${secs.toString().padStart(2, "0")}`
        } else {
          display =
            unit === "kg"
              ? `${value}kg (${(parseFloat(value) * 2.20462).toFixed(1)} lbs)`
              : `${value} lbs`
        }
        setResult({
          type: "success",
          message: res.isBaseline
            ? `Baseline set! ${display} logged as starting point.`
            : `PR logged! ${display}`,
        })
        setValue("")
      } else {
        setResult({ type: "error", message: res.error })
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Logged-in user display */}
      <div className="rounded-md bg-muted/40 border px-4 py-3 text-sm">
        Logging as <span className="font-semibold">{athleteName}</span>
      </div>

      {/* Leaderboard picker */}
      <div className="space-y-2">
        <Label>Leaderboard</Label>
        <div className="flex flex-col gap-2">
          {leaderboards.map((lb) => {
            const isSelected = leaderboardId === lb.id.toString()
            return (
              <button
                key={lb.id}
                type="button"
                disabled={isPending}
                onClick={() => setLeaderboardId(lb.id.toString())}
                className={cn(
                  "w-full flex items-center justify-between gap-4 px-4 min-h-[48px] rounded-lg border text-left transition-colors",
                  isSelected
                    ? "border-amber-400 bg-amber-500/10"
                    : "border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20"
                )}
              >
                <span className={cn("font-medium text-sm", isSelected ? "text-white" : "text-foreground")}>
                  {lb.liftName}
                </span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {lb.activityType === "time_trial" ? "Time Trial" : "Lift"}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Value input — adapts to activity type */}
      {isTimeTrial ? (
        <div className="space-y-2">
          <Label htmlFor="value">Time (M:SS)</Label>
          <Input
            id="value"
            type="text"
            inputMode="decimal"
            placeholder="e.g. 7:30"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={isPending}
          />
          <p className="text-xs text-muted-foreground">
            Enter your mile time as minutes:seconds. Faster = better.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="value">
            {selectedLeaderboard?.isTotalLoad
              ? "Total Load (bodyweight + added weight)"
              : "Weight"}
          </Label>
          <div className="flex gap-2">
            <Input
              id="value"
              type="number"
              min="0"
              step="0.5"
              placeholder="e.g. 225"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              disabled={isPending}
              className="flex-1"
            />
            <div className="flex rounded-md border overflow-hidden">
              {(["lbs", "kg"] as const).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setUnit(u)}
                  className={`px-4 min-h-[44px] text-sm font-medium transition-colors ${
                    unit === u ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>
          {selectedLeaderboard?.isTotalLoad && (
            <p className="text-xs text-muted-foreground">
              Add your bodyweight and any added weight together. E.g. if you weigh 185 lbs and added 50 lbs, log 235 lbs.
            </p>
          )}
        </div>
      )}

      {/* Date */}
      <div className="space-y-2">
        <Label htmlFor="date">Date</Label>
        <Input
          id="date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          disabled={isPending}
        />
      </div>

      {/* Feedback */}
      {result && (
        <div
          className={cn(
            "text-sm px-4 py-3 rounded-md border",
            result.type === "success"
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
              : "bg-destructive/10 text-destructive border-destructive/20"
          )}
        >
          {result.message}
        </div>
      )}

      <Button
        type="submit"
        disabled={isPending || !leaderboardId || !value}
        className="w-full"
      >
        {isPending ? "Logging…" : "Log PR"}
      </Button>
    </form>
  )
}
