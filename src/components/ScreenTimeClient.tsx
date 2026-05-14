"use client"

import { useState, useTransition, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Trash2 } from "lucide-react"
import { logScreenTime, deleteScreenTime } from "@/app/admin/screentime/actions"

type Athlete = { id: number; name: string }

type Entry = {
  id: number
  athleteId: number
  athlete: { id: number; name: string }
  weekStart: Date | string
  hours: number
}

export default function ScreenTimeClient({
  athletes,
  entries: initial,
}: {
  athletes: Athlete[]
  entries: Entry[]
}) {
  const [entries, setEntries] = useState(initial)
  useEffect(() => setEntries(initial), [initial])

  const [athleteId, setAthleteId] = useState("")
  const [weekStart, setWeekStart] = useState("")
  const [hours, setHours] = useState("")
  const [error, setError] = useState("")
  const [isLogging, startLog] = useTransition()

  function handleLog(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    const fd = new FormData()
    fd.append("athleteId", athleteId)
    fd.append("weekStart", weekStart)
    fd.append("hours", hours)

    startLog(async () => {
      const res = await logScreenTime(fd)
      if (res.success) {
        setHours("")
      } else {
        setError(res.error)
      }
    })
  }

  // Group by athlete, sorted by weekStart asc within each group
  const byAthlete = new Map<number, Entry[]>()
  for (const entry of entries) {
    const arr = byAthlete.get(entry.athleteId) ?? []
    arr.push(entry)
    byAthlete.set(entry.athleteId, arr)
  }
  for (const [id, arr] of byAthlete) {
    byAthlete.set(
      id,
      [...arr].sort((a, b) => new Date(a.weekStart).getTime() - new Date(b.weekStart).getTime())
    )
  }

  return (
    <div className="space-y-8">
      {/* Log form */}
      <form onSubmit={handleLog} className="space-y-4 border rounded-lg p-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Athlete</Label>
            <select
              value={athleteId}
              onChange={(e) => { setAthleteId(e.target.value); setError("") }}
              disabled={isLogging}
              className="w-full border rounded-md px-3 py-2 text-sm bg-background"
            >
              <option value="">Select athlete…</option>
              {athletes.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label>Week start date</Label>
            <Input
              type="date"
              value={weekStart}
              onChange={(e) => { setWeekStart(e.target.value); setError("") }}
              disabled={isLogging}
            />
          </div>
        </div>
        <div className="flex gap-4 items-end">
          <div className="space-y-1 flex-1">
            <Label>Screen time (hours)</Label>
            <Input
              type="number"
              min="0.5"
              step="0.5"
              placeholder="e.g. 4.5"
              value={hours}
              onChange={(e) => { setHours(e.target.value); setError("") }}
              disabled={isLogging}
            />
          </div>
          <Button type="submit" disabled={isLogging || !athleteId || !weekStart || !hours}>
            {isLogging ? "Logging…" : "Log Week"}
          </Button>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <p className="text-xs text-muted-foreground">
          Logging a week that already exists for this athlete will update it.
        </p>
      </form>

      {/* Entries by athlete */}
      {byAthlete.size === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center border rounded-lg bg-muted/20">
          No entries yet. Log the first week above.
        </p>
      ) : (
        <div className="space-y-6">
          {Array.from(byAthlete.entries()).map(([, athleteEntries]) => {
            const athlete = athleteEntries[0].athlete
            // Display newest first
            const displayEntries = [...athleteEntries].reverse()
            return (
              <div key={athlete.id} className="border rounded-lg overflow-hidden">
                <div className="px-4 py-2 bg-muted/30 border-b">
                  <span className="font-medium text-sm">{athlete.name}</span>
                </div>
                <ul className="divide-y">
                  {displayEntries.map((entry, idx) => {
                    // prev in display order = next chronologically (since we reversed)
                    const chronoPrev = displayEntries[idx + 1]
                    const pctChange =
                      chronoPrev != null
                        ? ((entry.hours - chronoPrev.hours) / chronoPrev.hours) * 100
                        : null
                    return (
                      <ScreenTimeRow
                        key={entry.id}
                        entry={entry}
                        pctChange={pctChange}
                        onDeleted={() =>
                          setEntries((prev) => prev.filter((e) => e.id !== entry.id))
                        }
                      />
                    )
                  })}
                </ul>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ScreenTimeRow({
  entry,
  pctChange,
  onDeleted,
}: {
  entry: { id: number; weekStart: Date | string; hours: number }
  pctChange: number | null
  onDeleted: () => void
}) {
  const [isDeleting, startDelete] = useTransition()

  const weekLabel = new Date(entry.weekStart).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  })

  function handleDelete() {
    startDelete(async () => {
      const res = await deleteScreenTime(entry.id)
      if (res.success) onDeleted()
    })
  }

  return (
    <li className="flex items-center justify-between px-4 py-3 bg-background">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">Week of {weekLabel}</span>
        <span className="text-sm text-muted-foreground">{entry.hours}h</span>
        {pctChange !== null && (
          <span
            className={`text-xs font-semibold ${
              pctChange < 0 ? "text-emerald-600" : "text-red-500"
            }`}
          >
            {pctChange > 0 ? "+" : ""}
            {pctChange.toFixed(1)}%
          </span>
        )}
      </div>
      <button
        onClick={handleDelete}
        disabled={isDeleting}
        className="p-1.5 text-muted-foreground hover:text-destructive transition-colors rounded"
        title="Delete"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </li>
  )
}
