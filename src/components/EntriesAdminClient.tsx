"use client"

import { useState, useTransition, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Pencil, Trash2, X, Check } from "lucide-react"
import { addEntry, updateEntry, deleteEntry } from "@/app/admin/entries/actions"

type Leaderboard = {
  id: number
  name: string
  mainLift: { id: number; name: string; type: string; unit: string }
}

type Athlete = { id: number; name: string }

type Entry = {
  id: number
  athleteId: number
  liftId: number
  leaderboardId: number
  weightLbs: number
  date: Date | string
  athlete: { id: number; name: string }
  lift: { id: number; name: string; type: string }
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

export default function EntriesAdminClient({
  leaderboards,
  athletes,
  entries: initial,
}: {
  leaderboards: Leaderboard[]
  athletes: Athlete[]
  entries: Entry[]
}) {
  const [selectedLbId, setSelectedLbId] = useState<number | null>(
    leaderboards.length > 0 ? leaderboards[0].id : null
  )
  const [entries, setEntries] = useState(initial)
  useEffect(() => setEntries(initial), [initial])

  const selectedLb = leaderboards.find((lb) => lb.id === selectedLbId)
  const isTimeTrial = selectedLb?.mainLift.type === "time_trial"
  const unit = isTimeTrial ? "seconds" : (selectedLb?.mainLift.unit ?? "lbs")

  const lbEntries = entries.filter((e) => e.leaderboardId === selectedLbId)

  const byAthlete = new Map<number, { athlete: Athlete; entries: Entry[] }>()
  for (const entry of lbEntries) {
    if (!byAthlete.has(entry.athleteId)) {
      byAthlete.set(entry.athleteId, { athlete: entry.athlete, entries: [] })
    }
    byAthlete.get(entry.athleteId)!.entries.push(entry)
  }
  for (const [, val] of byAthlete) {
    val.entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }

  // Add form state
  const [addAthleteId, setAddAthleteId] = useState("")
  const [addValue, setAddValue] = useState("")
  const [addDate, setAddDate] = useState(new Date().toISOString().slice(0, 10))
  const [addError, setAddError] = useState("")
  const [isAdding, startAdd] = useTransition()

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setAddError("")
    if (!selectedLb) return

    const fd = new FormData()
    fd.append("athleteId", addAthleteId)
    fd.append("leaderboardId", selectedLb.id.toString())
    fd.append("liftId", selectedLb.mainLift.id.toString())
    fd.append("value", addValue)
    fd.append("date", addDate)

    startAdd(async () => {
      const res = await addEntry(fd)
      if (res.success) {
        setAddAthleteId("")
        setAddValue("")
        setAddDate(new Date().toISOString().slice(0, 10))
      } else {
        setAddError(res.error)
      }
    })
  }

  if (leaderboards.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center border rounded-lg bg-muted/20">
        No leaderboards yet. Create one first.
      </p>
    )
  }

  return (
    <div className="space-y-6">
      {/* Leaderboard selector */}
      <div className="space-y-1.5">
        <Label>Leaderboard</Label>
        <select
          value={selectedLbId ?? ""}
          onChange={(e) => {
            setSelectedLbId(parseInt(e.target.value))
            setAddAthleteId("")
            setAddValue("")
            setAddError("")
          }}
          className="w-full border rounded-md px-3 py-2 text-sm bg-background"
        >
          {leaderboards.map((lb) => (
            <option key={lb.id} value={lb.id}>
              {lb.name}
            </option>
          ))}
        </select>
      </div>

      {selectedLb && (
        <>
          {/* Add entry form */}
          <form onSubmit={handleAdd} className="space-y-4 border rounded-lg p-4">
            <h2 className="text-sm font-semibold">Add Entry</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Athlete</Label>
                <select
                  value={addAthleteId}
                  onChange={(e) => { setAddAthleteId(e.target.value); setAddError("") }}
                  disabled={isAdding}
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
                <Label>Date</Label>
                <Input
                  type="date"
                  value={addDate}
                  onChange={(e) => { setAddDate(e.target.value); setAddError("") }}
                  disabled={isAdding}
                />
              </div>
            </div>
            <div className="flex gap-4 items-end">
              <div className="space-y-1 flex-1">
                <Label>Value ({unit})</Label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder={isTimeTrial ? "e.g. 45.5" : "e.g. 225"}
                  value={addValue}
                  onChange={(e) => { setAddValue(e.target.value); setAddError("") }}
                  disabled={isAdding}
                />
              </div>
              <Button
                type="submit"
                disabled={isAdding || !addAthleteId || !addValue || !addDate}
              >
                {isAdding ? "Adding…" : "Add Entry"}
              </Button>
            </div>
            {addError && <p className="text-xs text-destructive">{addError}</p>}
          </form>

          {/* Entries grouped by athlete */}
          {byAthlete.size === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center border rounded-lg bg-muted/20">
              No entries for this leaderboard yet.
            </p>
          ) : (
            <div className="space-y-4">
              {Array.from(byAthlete.values()).map(({ athlete, entries: athleteEntries }) => (
                <div key={athlete.id} className="border rounded-lg overflow-hidden">
                  <div className="px-4 py-2 bg-muted/30 border-b flex items-center gap-2">
                    <span className="font-medium text-sm">{athlete.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {athleteEntries.length} {athleteEntries.length === 1 ? "entry" : "entries"}
                    </span>
                  </div>
                  <ul className="divide-y">
                    {athleteEntries.map((entry) => (
                      <EntryRow
                        key={entry.id}
                        entry={entry}
                        unit={unit}
                        isTimeTrial={isTimeTrial}
                        onDeleted={() =>
                          setEntries((prev) => prev.filter((e) => e.id !== entry.id))
                        }
                        onUpdated={(newValue, newDate) =>
                          setEntries((prev) =>
                            prev.map((e) =>
                              e.id === entry.id
                                ? { ...e, weightLbs: newValue, date: newDate }
                                : e
                            )
                          )
                        }
                      />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function EntryRow({
  entry,
  unit,
  isTimeTrial,
  onDeleted,
  onUpdated,
}: {
  entry: Entry
  unit: string
  isTimeTrial: boolean
  onDeleted: () => void
  onUpdated: (value: number, date: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(entry.weightLbs.toString())
  const [editDate, setEditDate] = useState(
    new Date(entry.date).toISOString().slice(0, 10)
  )
  const [editError, setEditError] = useState("")
  const [isSaving, startSave] = useTransition()
  const [isDeleting, startDelete] = useTransition()

  const dateLabel = new Date(entry.date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  })

  const valueLabel = isTimeTrial
    ? `${formatTime(entry.weightLbs)} (${entry.weightLbs}s)`
    : `${entry.weightLbs} ${unit}`

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setEditError("")
    const fd = new FormData()
    fd.append("value", editValue)
    fd.append("date", editDate)
    startSave(async () => {
      const res = await updateEntry(entry.id, fd)
      if (res.success) {
        onUpdated(parseFloat(editValue), new Date(editDate).toISOString())
        setEditing(false)
      } else {
        setEditError(res.error)
      }
    })
  }

  function handleDelete() {
    startDelete(async () => {
      const res = await deleteEntry(entry.id)
      if (res.success) onDeleted()
    })
  }

  if (editing) {
    return (
      <li className="px-4 py-3 bg-background">
        <form onSubmit={handleSave} className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Input
              type="number"
              min="0.01"
              step="0.01"
              value={editValue}
              onChange={(e) => { setEditValue(e.target.value); setEditError("") }}
              disabled={isSaving}
              className="w-28 h-8 text-sm"
            />
            <span className="text-xs text-muted-foreground">{unit}</span>
          </div>
          <Input
            type="date"
            value={editDate}
            onChange={(e) => { setEditDate(e.target.value); setEditError("") }}
            disabled={isSaving}
            className="w-36 h-8 text-sm"
          />
          <div className="flex items-center gap-1">
            <Button type="submit" size="sm" disabled={isSaving} className="h-7 px-2.5 text-xs">
              {isSaving ? "…" : <Check className="h-3.5 w-3.5" />}
            </Button>
            <button
              type="button"
              onClick={() => { setEditing(false); setEditError("") }}
              className="p-1.5 text-muted-foreground hover:text-foreground rounded"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          {editError && <p className="text-xs text-destructive w-full mt-1">{editError}</p>}
        </form>
      </li>
    )
  }

  return (
    <li className="flex items-center justify-between px-4 py-3 bg-background">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">{valueLabel}</span>
        <span className="text-sm text-muted-foreground">{dateLabel}</span>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => {
            setEditValue(entry.weightLbs.toString())
            setEditDate(new Date(entry.date).toISOString().slice(0, 10))
            setEditError("")
            setEditing(true)
          }}
          className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded"
          title="Edit"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="p-1.5 text-muted-foreground hover:text-destructive transition-colors rounded"
          title="Delete"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </li>
  )
}
