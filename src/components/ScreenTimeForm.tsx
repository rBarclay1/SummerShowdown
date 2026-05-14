"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { logScreenTimeAsUser } from "@/app/log/actions"

function getCurrentMonday(): string {
  const today = new Date()
  const day = today.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(today)
  monday.setDate(today.getDate() + diff)
  return monday.toISOString().slice(0, 10)
}

export default function ScreenTimeForm({ athleteName }: { athleteName: string }) {
  const [weekStart, setWeekStart] = useState(getCurrentMonday)
  const [hours, setHours] = useState("")
  const [result, setResult] = useState<
    | { type: "success"; hours: number; previousHours: number | null }
    | { type: "error"; message: string }
    | null
  >(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setResult(null)

    const fd = new FormData()
    fd.append("weekStart", weekStart)
    fd.append("hours", hours)

    startTransition(async () => {
      const res = await logScreenTimeAsUser(fd)
      if (res.success) {
        setResult({ type: "success", hours: res.hours, previousHours: res.previousHours })
        setHours("")
      } else {
        setResult({ type: "error", message: res.error })
      }
    })
  }

  let successMessage = ""
  if (result?.type === "success") {
    successMessage = `${result.hours}h logged`
    if (result.previousHours !== null) {
      const pct = ((result.hours - result.previousHours) / result.previousHours) * 100
      const dir = pct <= 0 ? "down" : "up"
      successMessage += ` — ${dir} ${Math.abs(pct).toFixed(1)}% from last week`
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-md bg-muted/40 border px-4 py-3 text-sm">
        Logging as <span className="font-semibold">{athleteName}</span>
      </div>

      <div className="space-y-2">
        <Label htmlFor="weekStart">Week starting</Label>
        <Input
          id="weekStart"
          type="date"
          value={weekStart}
          onChange={(e) => { setWeekStart(e.target.value); setResult(null) }}
          disabled={isPending}
        />
        <p className="text-xs text-muted-foreground">Pick the Monday that starts your week.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="hours">Hours of screen time</Label>
        <Input
          id="hours"
          type="number"
          min="0.5"
          step="0.5"
          placeholder="e.g. 4.5"
          value={hours}
          onChange={(e) => { setHours(e.target.value); setResult(null) }}
          disabled={isPending}
        />
        <p className="text-xs text-muted-foreground">
          Total recreational screen time for the week. Lower is better.
        </p>
      </div>

      {result && (
        <div
          className={cn(
            "text-sm px-4 py-3 rounded-md border",
            result.type === "success"
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
              : "bg-destructive/10 text-destructive border-destructive/20"
          )}
        >
          {result.type === "success" ? successMessage : result.message}
        </div>
      )}

      <Button
        type="submit"
        disabled={isPending || !weekStart || !hours}
        className="w-full"
      >
        {isPending ? "Logging…" : "Log Screen Time"}
      </Button>
    </form>
  )
}
