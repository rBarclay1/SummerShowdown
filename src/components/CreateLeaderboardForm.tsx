"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createLeaderboard } from "@/app/leaderboard/new/actions"

type Activity = { id: number; name: string; type: string }

export default function CreateLeaderboardForm({
  availableLifts,
  takenLiftIds,
}: {
  availableLifts: Activity[]
  takenLiftIds: number[]
}) {
  const taken = new Set(takenLiftIds)

  const [endDate, setEndDate] = useState("")
  const [selectedLiftId, setSelectedLiftId] = useState<number | null>(null)
  const [newLiftName, setNewLiftName] = useState("")
  const [newLiftType, setNewLiftType] = useState<"lift" | "time_trial">("lift")
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
    if (selectedLiftId === null) { setError("Select or create an activity."); return }
    if (isNewLift && !newLiftName.trim()) { setError("Enter a name for the new activity."); return }

    const fd = new FormData()
    if (endDate) fd.append("endDate", endDate)
    if (isNewLift) {
      fd.append("newLiftName", newLiftName.trim())
      fd.append("newLiftType", newLiftType)
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

      {/* Activity selection */}
      <div className="space-y-3">
        <Label>Activity</Label>
        <p className="text-xs text-muted-foreground -mt-1">
          Each activity can only have one active leaderboard.
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
                title={isTaken ? "A leaderboard already exists for this activity" : undefined}
                className={`text-sm px-4 py-2 min-h-[44px] rounded-full border transition-colors
                  ${isTaken
                    ? "opacity-40 cursor-not-allowed line-through"
                    : isSelected
                    ? "bg-primary text-primary-foreground border-primary"
                    : "hover:bg-muted"
                  }`}
              >
                {lift.name}
                <span className="ml-1.5 text-xs opacity-60">
                  {lift.type === "time_trial" ? "⏱" : "🏋️"}
                </span>
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
            + New activity
          </button>
        </div>

        {isNewLift && (
          <div className="space-y-3">
            <Input
              autoFocus
              placeholder="e.g. Mile Run, 5K, Log Press…"
              value={newLiftName}
              onChange={(e) => setNewLiftName(e.target.value)}
              disabled={isPending}
            />
            <div className="flex gap-2">
              {([
                { value: "lift", label: "Lift (higher is better)" },
                { value: "time_trial", label: "Time Trial (lower is better)" },
              ] as const).map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setNewLiftType(value)}
                  disabled={isPending}
                  className={`flex-1 text-sm px-3 py-2 rounded-md border transition-colors ${
                    newLiftType === value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "hover:bg-muted"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={isPending || selectedLiftId === null}>
        {isPending ? "Creating…" : "Create Leaderboard"}
      </Button>
    </form>
  )
}
