"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Pencil, Trash2, X } from "lucide-react"
import { deleteLeaderboard, updateLeaderboard } from "@/app/leaderboard/[id]/actions"
import { useUser } from "@clerk/nextjs"
import { useIsAdmin } from "@/components/AdminProvider"

type Lift = { id: number; name: string }

type Props = {
  leaderboardId: number
  currentName: string
  currentLiftId: number
  currentEndDate: string   // ISO date string "YYYY-MM-DD" or ""
  entryCount: number
  allLifts: Lift[]
  takenLiftIds: number[]   // IDs already used by OTHER leaderboards
}

export default function LeaderboardAdminControls({
  leaderboardId,
  currentName,
  currentLiftId,
  currentEndDate,
  entryCount,
  allLifts,
  takenLiftIds,
}: Props) {
  const { user, isLoaded } = useUser()

  // ── Delete state ──────────────────────────────────────────────
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteError, setDeleteError] = useState("")
  const [isDeleting, startDelete] = useTransition()

  function handleDelete() {
    setDeleteError("")
    startDelete(async () => {
      const res = await deleteLeaderboard(leaderboardId)
      if (!res.success) {
        setDeleteError(res.error)
      }
      // on success the action redirects; nothing more to do
    })
  }

  // ── Edit state ────────────────────────────────────────────────
  const [editOpen, setEditOpen] = useState(false)
  const [liftId, setLiftId] = useState(currentLiftId)
  const [endDate, setEndDate] = useState(currentEndDate)
  const [editError, setEditError] = useState("")
  const [editSuccess, setEditSuccess] = useState(false)
  const [isSaving, startSave] = useTransition()

  function openEdit() {
    // Reset to current values each time the panel opens
    setLiftId(currentLiftId)
    setEndDate(currentEndDate)
    setEditError("")
    setEditSuccess(false)
    setEditOpen(true)
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setEditError("")
    setEditSuccess(false)

    const fd = new FormData()
    fd.append("liftId", liftId.toString())
    if (endDate) fd.append("endDate", endDate)

    startSave(async () => {
      const res = await updateLeaderboard(leaderboardId, fd)
      if (res.success) {
        setEditSuccess(true)
        setEditOpen(false)
      } else {
        setEditError(res.error)
      }
    })
  }

  // Client-side admin guard — all hooks above, early return here
  const taken = new Set(takenLiftIds)
  const { isAdmin } = useIsAdmin()
  if (!isLoaded || !isAdmin) return null

  return (
    <>
      {/* Trigger buttons */}
      <div className="flex items-center gap-2 shrink-0">
        <Button
          variant="outline"
          size="sm"
          onClick={openEdit}
          className="gap-1.5"
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => { setDeleteError(""); setDeleteOpen(true) }}
          className="gap-1.5 text-destructive hover:text-destructive border-destructive/30 hover:border-destructive hover:bg-destructive/5"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </Button>
      </div>

      {/* ── Delete confirm dialog ─────────────────────────────── */}
      {deleteOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={(e) => { if (e.target === e.currentTarget) setDeleteOpen(false) }}
        >
          <div className="bg-[oklch(0.145_0_0)] border rounded-lg shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-base">Delete leaderboard?</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  This will permanently delete{" "}
                  <span className="font-medium text-foreground">{currentName}</span> and{" "}
                  <span className="font-medium text-foreground">
                    {entryCount} {entryCount === 1 ? "entry" : "entries"}
                  </span>
                  . This cannot be undone.
                </p>
              </div>
              <button
                onClick={() => setDeleteOpen(false)}
                className="text-muted-foreground hover:text-foreground shrink-0 mt-0.5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {deleteError && (
              <p className="text-sm text-destructive">{deleteError}</p>
            )}

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteOpen(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit modal ────────────────────────────────────────── */}
      {editOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={(e) => { if (e.target === e.currentTarget) setEditOpen(false) }}
        >
          <div className="bg-[oklch(0.145_0_0)] border rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-base">Edit leaderboard</h2>
              <button
                onClick={() => setEditOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-5">
              {/* Lift */}
              <div className="space-y-2">
                <Label>Lift</Label>
                <div className="flex flex-wrap gap-2">
                  {allLifts.map((lift) => {
                    const isCurrentLift = lift.id === currentLiftId
                    const isTaken = taken.has(lift.id) && !isCurrentLift
                    const isSelected = liftId === lift.id
                    return (
                      <button
                        key={lift.id}
                        type="button"
                        disabled={isSaving || isTaken}
                        onClick={() => setLiftId(lift.id)}
                        title={isTaken ? "Already used by another leaderboard" : undefined}
                        className={`text-sm px-3 py-1.5 rounded-full border transition-colors
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
                </div>
              </div>

              {/* End date */}
              <div className="space-y-1.5">
                <Label htmlFor="edit-enddate">
                  End Date{" "}
                  <span className="text-muted-foreground font-normal text-xs">(optional)</span>
                </Label>
                <Input
                  id="edit-enddate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  disabled={isSaving}
                />
                {endDate && (
                  <button
                    type="button"
                    onClick={() => setEndDate("")}
                    className="text-xs text-muted-foreground hover:text-foreground underline"
                  >
                    Clear end date
                  </button>
                )}
              </div>

              {editError && <p className="text-sm text-destructive">{editError}</p>}

              <div className="flex gap-2 justify-end pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditOpen(false)}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isSaving}>
                  {isSaving ? "Saving…" : "Save changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
