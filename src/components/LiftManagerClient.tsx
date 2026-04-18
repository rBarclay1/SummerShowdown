"use client"

import { useState, useTransition, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Pencil, Trash2, X, Check, Plus } from "lucide-react"
import { addLift, renameLift, deleteLift } from "@/app/admin/lifts/actions"

type ActivityWithUsage = {
  id: number
  name: string
  type: string
  leaderboardCount: number
  entryCount: number
}

export default function LiftManagerClient({ lifts: initial }: { lifts: ActivityWithUsage[] }) {
  // Optimistic local list — server revalidation provides the ground truth
  const [lifts, setLifts] = useState(initial)

  // Keep in sync when the server re-renders the page
  useEffect(() => { setLifts(initial) }, [initial])

  // ── Add form ──────────────────────────────────────────────────
  const [addName, setAddName] = useState("")
  const [addType, setAddType] = useState<"lift" | "time_trial">("lift")
  const [addError, setAddError] = useState("")
  const [isAdding, startAdd] = useTransition()

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setAddError("")
    const trimmed = addName.trim()
    if (!trimmed) { setAddError("Name cannot be blank."); return }

    const fd = new FormData()
    fd.append("name", trimmed)
    fd.append("type", addType)

    startAdd(async () => {
      const res = await addLift(fd)
      if (res.success) {
        setAddName("")
        setAddType("lift")
      } else {
        setAddError(res.error)
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* ── Add activity ─────────────────────────────────────────── */}
      <form onSubmit={handleAdd} className="space-y-3">
        <div className="flex gap-2 items-start">
          <div className="flex-1 space-y-1">
            <Input
              placeholder="New activity name…"
              value={addName}
              onChange={(e) => { setAddName(e.target.value); setAddError("") }}
              disabled={isAdding}
              className={addError ? "border-destructive" : ""}
            />
            {addError && <p className="text-xs text-destructive">{addError}</p>}
          </div>
          <Button type="submit" disabled={isAdding || !addName.trim()} className="gap-1.5 shrink-0">
            <Plus className="h-4 w-4" />
            {isAdding ? "Adding…" : "Add Activity"}
          </Button>
        </div>
        {/* Type selector */}
        <div className="flex gap-2">
          {([
            { value: "lift", label: "Lift (higher is better)" },
            { value: "time_trial", label: "Time Trial (lower is better)" },
          ] as const).map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setAddType(value)}
              disabled={isAdding}
              className={`flex-1 text-sm px-3 py-2 rounded-md border transition-colors ${
                addType === value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "hover:bg-muted"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </form>

      {/* ── Activity list ─────────────────────────────────────────── */}
      {lifts.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center border rounded-lg bg-muted/20">
          No activities yet. Add one above.
        </p>
      ) : (
        <ul className="divide-y border rounded-lg overflow-hidden">
          {lifts.map((lift) => (
            <ActivityRow
              key={lift.id}
              lift={lift}
              onRenamed={(newName) =>
                setLifts((prev) =>
                  prev.map((l) => (l.id === lift.id ? { ...l, name: newName } : l))
                )
              }
              onDeleted={() =>
                setLifts((prev) => prev.filter((l) => l.id !== lift.id))
              }
            />
          ))}
        </ul>
      )}
    </div>
  )
}

// ── Individual row ──────────────────────────────────────────────────────────

function ActivityRow({
  lift,
  onRenamed,
  onDeleted,
}: {
  lift: ActivityWithUsage
  onRenamed: (name: string) => void
  onDeleted: () => void
}) {
  const hasData = lift.leaderboardCount > 0 || lift.entryCount > 0

  // Edit state
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(lift.name)
  const [editError, setEditError] = useState("")
  const [isSaving, startSave] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  function startEdit() {
    setEditName(lift.name)
    setEditError("")
    setEditing(true)
  }

  function cancelEdit() {
    setEditing(false)
    setEditError("")
  }

  function handleRename(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = editName.trim()
    if (!trimmed) { setEditError("Name cannot be blank."); return }
    if (trimmed === lift.name) { setEditing(false); return }

    const fd = new FormData()
    fd.append("name", trimmed)

    startSave(async () => {
      const res = await renameLift(lift.id, fd)
      if (res.success) {
        onRenamed(trimmed)
        setEditing(false)
      } else {
        setEditError(res.error)
      }
    })
  }

  // Delete state
  const [deleteStage, setDeleteStage] = useState<"idle" | "confirm" | "force-confirm">("idle")
  const [deleteError, setDeleteError] = useState("")
  const [isDeleting, startDelete] = useTransition()

  function requestDelete() {
    setDeleteError("")
    setDeleteStage("confirm")
  }

  function handleDelete(force: boolean) {
    startDelete(async () => {
      const res = await deleteLift(lift.id, force)
      if (res.success) {
        onDeleted()
      } else {
        setDeleteError(res.error)
        if (!force) setDeleteStage("force-confirm")
      }
    })
  }

  const typeLabel = lift.type === "time_trial" ? "Time Trial" : "Lift"

  return (
    <li className="bg-background px-4 py-3">
      {editing ? (
        // ── Inline rename form ──
        <form onSubmit={handleRename} className="flex gap-2 items-center">
          <div className="flex-1 space-y-1">
            <Input
              ref={inputRef}
              value={editName}
              onChange={(e) => { setEditName(e.target.value); setEditError("") }}
              disabled={isSaving}
              className={`h-8 text-sm ${editError ? "border-destructive" : ""}`}
            />
            {editError && <p className="text-xs text-destructive">{editError}</p>}
          </div>
          <button
            type="submit"
            disabled={isSaving || !editName.trim()}
            className="text-emerald-600 hover:text-emerald-700 disabled:opacity-40 p-1"
            title="Save"
          >
            <Check className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={cancelEdit}
            disabled={isSaving}
            className="text-muted-foreground hover:text-foreground p-1"
            title="Cancel"
          >
            <X className="h-4 w-4" />
          </button>
        </form>
      ) : deleteStage !== "idle" ? (
        // ── Delete confirmation ──
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              {hasData ? (
                <>
                  <p className="text-sm font-medium text-destructive">
                    Delete &ldquo;{lift.name}&rdquo;?
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Used by{" "}
                    {lift.leaderboardCount > 0 && (
                      <span className="font-medium text-foreground">
                        {lift.leaderboardCount} leaderboard{lift.leaderboardCount !== 1 ? "s" : ""}
                      </span>
                    )}
                    {lift.leaderboardCount > 0 && lift.entryCount > 0 && " and "}
                    {lift.entryCount > 0 && (
                      <span className="font-medium text-foreground">
                        {lift.entryCount} PR {lift.entryCount !== 1 ? "entries" : "entry"}
                      </span>
                    )}
                    . All associated leaderboards and entries will be permanently deleted.
                  </p>
                </>
              ) : (
                <p className="text-sm font-medium">
                  Delete &ldquo;{lift.name}&rdquo;? This cannot be undone.
                </p>
              )}
            </div>
            <button
              onClick={() => { setDeleteStage("idle"); setDeleteError("") }}
              className="text-muted-foreground hover:text-foreground shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {deleteError && <p className="text-xs text-destructive">{deleteError}</p>}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setDeleteStage("idle"); setDeleteError("") }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleDelete(true)}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting…" : hasData ? "Yes, delete everything" : "Delete"}
            </Button>
          </div>
        </div>
      ) : (
        // ── Normal row ──
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-sm font-medium">{lift.name}</span>
            <span className="ml-2 text-xs text-muted-foreground">{typeLabel}</span>
            {hasData && (
              <span className="ml-2 text-xs text-muted-foreground">
                ·{" "}
                {[
                  lift.leaderboardCount > 0
                    ? `${lift.leaderboardCount} leaderboard${lift.leaderboardCount !== 1 ? "s" : ""}`
                    : null,
                  lift.entryCount > 0
                    ? `${lift.entryCount} PR${lift.entryCount !== 1 ? "s" : ""}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={startEdit}
              className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded"
              title="Rename"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={requestDelete}
              className="p-1.5 text-muted-foreground hover:text-destructive transition-colors rounded"
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </li>
  )
}
