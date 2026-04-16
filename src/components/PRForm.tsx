"use client"

import { useState, useTransition, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { logPR } from "@/app/log/actions"

type Leaderboard = {
  id: number
  name: string
  lifts: { id: number; name: string }[]
}

type Athlete = { id: number; name: string }

export default function PRForm({
  leaderboards,
  athletes,
  defaultLeaderboardId,
}: {
  leaderboards: Leaderboard[]
  athletes: Athlete[]
  defaultLeaderboardId?: number
}) {
  const [leaderboardId, setLeaderboardId] = useState<string>(
    defaultLeaderboardId?.toString() ?? ""
  )
  const [liftId, setLiftId] = useState<string>("")
  const [athleteName, setAthleteName] = useState("")
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

  // Reset lift when leaderboard changes
  useEffect(() => { setLiftId("") }, [leaderboardId])

  const athleteSuggestions = athletes
    .filter(
      (a) =>
        athleteName.length > 0 &&
        a.name.toLowerCase().includes(athleteName.toLowerCase()) &&
        a.name.toLowerCase() !== athleteName.toLowerCase()
    )
    .slice(0, 5)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setResult(null)

    const fd = new FormData()
    fd.append("athleteName", athleteName)
    fd.append("leaderboardId", leaderboardId)
    fd.append("liftId", liftId)
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
            : `PR logged! ${displayWeight} — baseline updated.`,
        })
        setWeight("")
      } else {
        setResult({ type: "error", message: res.error })
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Athlete */}
      <div className="space-y-2 relative">
        <Label htmlFor="athleteName">Athlete Name</Label>
        <Input
          id="athleteName"
          placeholder="Enter name or pick existing…"
          value={athleteName}
          onChange={(e) => setAthleteName(e.target.value)}
          autoComplete="off"
          disabled={isPending}
        />
        {athleteSuggestions.length > 0 && (
          <ul className="absolute z-10 bg-background border rounded-md shadow-md w-full mt-1 overflow-hidden">
            {athleteSuggestions.map((a) => (
              <li
                key={a.id}
                className="px-3 py-2 text-sm hover:bg-muted cursor-pointer"
                onClick={() => setAthleteName(a.name)}
              >
                {a.name}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Leaderboard */}
      <div className="space-y-2">
        <Label>Leaderboard</Label>
        <Select
          value={leaderboardId}
          onValueChange={(v) => setLeaderboardId(v ?? "")}
          disabled={isPending}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a leaderboard…" />
          </SelectTrigger>
          <SelectContent>
            {leaderboards.map((lb) => (
              <SelectItem key={lb.id} value={lb.id.toString()}>
                {lb.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Lift */}
      <div className="space-y-2">
        <Label>Lift</Label>
        <Select
          value={liftId}
          onValueChange={(v) => setLiftId(v ?? "")}
          disabled={isPending || !selectedLeaderboard}
        >
          <SelectTrigger>
            <SelectValue
              placeholder={
                selectedLeaderboard ? "Select a lift…" : "Choose a leaderboard first"
              }
            />
          </SelectTrigger>
          <SelectContent>
            {(selectedLeaderboard?.lifts ?? []).map((lift) => (
              <SelectItem key={lift.id} value={lift.id.toString()}>
                {lift.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Weight + unit toggle */}
      <div className="space-y-2">
        <Label htmlFor="weight">Weight</Label>
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
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  unit === u ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                }`}
              >
                {u}
              </button>
            ))}
          </div>
        </div>
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
          className={`text-sm px-4 py-3 rounded-md ${
            result.type === "success"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-destructive/10 text-destructive border border-destructive/20"
          }`}
        >
          {result.message}
        </div>
      )}

      <Button
        type="submit"
        disabled={isPending || !athleteName || !leaderboardId || !liftId || !weight}
        className="w-full"
      >
        {isPending ? "Logging…" : "Log PR"}
      </Button>
    </form>
  )
}
