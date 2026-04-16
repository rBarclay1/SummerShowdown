"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { createLeaderboard } from "@/app/leaderboard/new/actions"
import { X, Plus } from "lucide-react"

type Lift = { id: number; name: string }

type SelectedLift = { id: number; name: string; isNew: boolean }

export default function CreateLeaderboardForm({ availableLifts }: { availableLifts: Lift[] }) {
  const [name, setName] = useState("")
  const [selected, setSelected] = useState<SelectedLift[]>([])
  const [mainLiftId, setMainLiftId] = useState<number | null>(null)
  const [newLiftInput, setNewLiftInput] = useState("")
  const [error, setError] = useState("")
  const [isPending, startTransition] = useTransition()

  const unselectedLifts = availableLifts.filter((l) => !selected.find((s) => s.id === l.id))

  function addExistingLift(lift: Lift) {
    const next = [...selected, { ...lift, isNew: false }]
    setSelected(next)
    if (next.length === 1) setMainLiftId(lift.id)
  }

  function addNewLift() {
    const trimmed = newLiftInput.trim()
    if (!trimmed) return
    const tempId = -(selected.filter((s) => s.isNew).length + 1)
    const next = [...selected, { id: tempId, name: trimmed, isNew: true }]
    setSelected(next)
    if (next.length === 1) setMainLiftId(tempId)
    setNewLiftInput("")
  }

  function removeLift(id: number) {
    const next = selected.filter((s) => s.id !== id)
    setSelected(next)
    if (mainLiftId === id) setMainLiftId(next[0]?.id ?? null)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    if (!name.trim()) { setError("Leaderboard name is required."); return }
    if (selected.length === 0) { setError("Add at least one lift."); return }
    if (mainLiftId === null) { setError("Select a main lift."); return }

    const fd = new FormData()
    fd.append("name", name.trim())
    fd.append("mainLiftId", mainLiftId.toString())
    for (const lift of selected) {
      if (lift.isNew) fd.append("newLifts", lift.name)
      else fd.append("liftIds", lift.id.toString())
    }

    startTransition(async () => {
      try {
        await createLeaderboard(fd)
      } catch {
        setError("Failed to create leaderboard. Try again.")
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Leaderboard Name</Label>
        <Input
          id="name"
          placeholder="e.g. Powerlifting Total, Push Day…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isPending}
        />
      </div>

      {/* Add existing lifts */}
      {unselectedLifts.length > 0 && (
        <div className="space-y-2">
          <Label>Add Lifts</Label>
          <div className="flex flex-wrap gap-2">
            {unselectedLifts.map((lift) => (
              <button
                key={lift.id}
                type="button"
                onClick={() => addExistingLift(lift)}
                className="text-sm px-3 py-1 rounded-full border hover:bg-muted transition-colors"
              >
                + {lift.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Add new lift */}
      <div className="space-y-2">
        <Label htmlFor="newLift">Create New Lift</Label>
        <div className="flex gap-2">
          <Input
            id="newLift"
            placeholder="e.g. Log Press, Safety Bar Squat…"
            value={newLiftInput}
            onChange={(e) => setNewLiftInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addNewLift() } }}
            disabled={isPending}
          />
          <Button type="button" variant="outline" onClick={addNewLift} disabled={isPending}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Selected lifts + main lift picker */}
      {selected.length > 0 && (
        <div className="space-y-2">
          <Label>Selected Lifts & Main Lift</Label>
          <p className="text-xs text-muted-foreground">
            Click a lift to designate it as the main lift (headline stat).
          </p>
          <div className="flex flex-wrap gap-2">
            {selected.map((lift) => (
              <div
                key={lift.id}
                className={`flex items-center gap-1 pl-3 pr-2 py-1 rounded-full border text-sm cursor-pointer transition-colors ${
                  mainLiftId === lift.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "hover:bg-muted"
                }`}
                onClick={() => setMainLiftId(lift.id)}
              >
                <span>{lift.name}</span>
                {lift.isNew && (
                  <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 ml-1">
                    new
                  </Badge>
                )}
                {mainLiftId === lift.id && (
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1 py-0 h-4 ml-1 border-primary-foreground/40 text-primary-foreground"
                  >
                    main
                  </Badge>
                )}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeLift(lift.id) }}
                  className="ml-1 opacity-60 hover:opacity-100"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={isPending || selected.length === 0}>
        {isPending ? "Creating…" : "Create Leaderboard"}
      </Button>
    </form>
  )
}
