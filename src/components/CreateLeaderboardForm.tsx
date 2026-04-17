"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createLeaderboard } from "@/app/leaderboard/new/actions"

type Lift = { id: number; name: string }

export default function CreateLeaderboardForm({
  availableLifts,
  takenLiftIds,
}: {
  availableLifts: Lift[]
  takenLiftIds: number[]
}) {
  const taken = new Set(takenLiftIds)

  const [endDate, setEndDate] = useState("")
  const [selectedLiftId, setSelectedLiftId] = useState<number | null>(null)
  const [newLiftName, setNewLiftName] = useState("")
  const [error, setError] = useState("")
  const [isPending, startTransition] = useTransition()

  const isNewLift = selectedLiftId === -1

  function handleLiftPick(id: number) {
    setSelectedLiftId(id)
    setError("")
    if (id !== -1) setNewLiftName("")
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    if (selectedLiftId === null) { setError("Select or create a lift."); return }
    if (isNewLift && !newLiftName.trim()) { setError("Enter a name for the new lift."); return }

    const fd = new FormData()
    if (endDate) fd.append("endDate", endDate)
    if (isNewLift) {
      fd.append("newLiftName", newLiftName.trim())
    } else {
      fd.append("liftId", selectedLiftId!.toString())
    }

    startTransition(async () => {
      const result = await createLeaderboard(fd)
      if (!result.success) {
        setError(result.error)
      }
      // on success, the action redirects — nothing to do here
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* End date */}
      <div className="space-y-2">
        <Label htmlFor="endDate">
          End Date <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Input
          id="endDate"
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          disabled={isPending}
        />
        <p className="text-xs text-muted-foreground">
          Set a close date to enable countdown and podium view.
        </p>
      </div>

      {/* Lift selection */}
      <div className="space-y-3">
        <Label>Lift</Label>
        <p className="text-xs text-muted-foreground -mt-1">
          Each lift can only have one active leaderboard.
        </p>
        <div className="flex flex-wrap gap-2">
          {availableLifts.map((lift) => {
            const isTaken = taken.has(lift.id)
            const isSelected = selectedLiftId === lift.id
            return (
              <button
                key={lift.id}
                type="button"
                onClick={() => !isTaken && handleLiftPick(lift.id)}
                disabled={isPending || isTaken}
                title={isTaken ? "A leaderboard already exists for this lift" : undefined}
                className={`text-sm px-4 py-2 min-h-[44px] rounded-full border transition-colors
                  ${isTaken
                    ? "opacity-40 cursor-not-allowed line-through"
                    : isSelected
                    ? "bg-primary text-primary-foreground border-primary"
                    : "hover:bg-muted"
                  }`}
              >
                {lift.name}
              </button>
            )
          })}
          <button
            type="button"
            onClick={() => handleLiftPick(-1)}
            disabled={isPending}
            className={`text-sm px-4 py-2 min-h-[44px] rounded-full border transition-colors ${
              isNewLift
                ? "bg-primary text-primary-foreground border-primary"
                : "hover:bg-muted border-dashed"
            }`}
          >
            + New lift
          </button>
        </div>

        {isNewLift && (
          <Input
            autoFocus
            placeholder="e.g. Log Press, Safety Bar Squat…"
            value={newLiftName}
            onChange={(e) => setNewLiftName(e.target.value)}
            disabled={isPending}
          />
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={isPending || selectedLiftId === null}>
        {isPending ? "Creating…" : "Create Leaderboard"}
      </Button>
    </form>
  )
}
