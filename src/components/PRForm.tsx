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
  const [weight, setWeight] = useState("")
  const [unit, setUnit] = useState<"lbs" | "kg">("lbs")
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [result, setResult] = useState<
    | { type: "success"; message: string }
    | { type: "error"; message: string }
    | null
  >(null)
  const [isPending, startTransition] = useTransition()

  const selectedLeaderboard = leaderboards.find((l) => l.id.toString() === leaderboardId)

  useEffect(() => { setResult(null) }, [leaderboardId])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setResult(null)

    const fd = new FormData()
    fd.append("leaderboardId", leaderboardId)
    fd.append("liftId", selectedLeaderboard!.liftId.toString())
    fd.append("weight", weight)
    fd.append("unit", unit)
    fd.append("date", date)

    startTransition(async () => {
      const res = await logPR(fd)
      if (res.success) {
        const displayWeight =
          unit === "kg"
            ? `${weight}kg (${(parseFloat(weight) * 2.20462).toFixed(1)} lbs)`
            : `${weight} lbs`
        setResult({
          type: "success",
          message: res.isBaseline
            ? `Baseline set! ${displayWeight} logged as starting point.`
            : `PR logged! ${displayWeight}`,
        })
        setWeight("")
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
              </button>
            )
          })}
        </div>
      </div>

      {/* Weight + unit toggle */}
      <div className="space-y-2">
        <Label htmlFor="weight">
          {selectedLeaderboard?.isTotalLoad
            ? "Total Load (bodyweight + added weight)"
            : "Weight"}
        </Label>
        <div className="flex gap-2">
          <Input
            id="weight"
            type="number"
            min="0"
            step="0.5"
            placeholder="e.g. 225"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
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
        disabled={isPending || !leaderboardId || !weight}
        className="w-full"
      >
        {isPending ? "Logging…" : "Log PR"}
      </Button>
    </form>
  )
}
