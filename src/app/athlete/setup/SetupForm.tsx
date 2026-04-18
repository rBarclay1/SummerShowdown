"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { claimAthlete, createAndClaimAthlete } from "./actions"

type Athlete = { id: number; name: string; claimed?: boolean }

export default function SetupForm({
  athletes,
  defaultName,
}: {
  athletes: Athlete[]
  defaultName: string
}) {
  const router = useRouter()
  const firstUnclaimed = athletes.find((a) => !a.claimed)
  const [mode, setMode] = useState<"claim" | "create">(athletes.length > 0 ? "claim" : "create")
  const [selectedId, setSelectedId] = useState<number | null>(firstUnclaimed?.id ?? athletes[0]?.id ?? null)
  const [newName, setNewName] = useState(defaultName)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  function switchToClaim(existingId?: number) {
    setMode("claim")
    if (existingId != null) setSelectedId(existingId)
    setError("")
  }

  async function handleSubmit() {
    setError("")
    setLoading(true)
    try {
      if (mode === "claim") {
        if (!selectedId) { setError("Select an athlete."); return }
        const result = await claimAthlete(selectedId)
        if (result?.error) { setError(result.error); return }
      } else {
        const name = newName.trim()
        if (!name) { setError("Name is required."); return }
        const result = await createAndClaimAthlete(name)
        if (result?.error) {
          if (result.existingId != null) {
            // Auto-switch to claim mode with the matching athlete pre-selected
            switchToClaim(result.existingId)
            setError(`"${name}" already exists — select it below and click Continue.`)
          } else {
            setError(result.error)
          }
          return
        }
      }
      router.push("/athlete/me")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      {athletes.length > 0 && (
        <div className="flex gap-2">
          <Button
            variant={mode === "claim" ? "default" : "outline"}
            size="sm"
            onClick={() => switchToClaim()}
          >
            Claim existing
          </Button>
          <Button
            variant={mode === "create" ? "default" : "outline"}
            size="sm"
            onClick={() => { setMode("create"); setError("") }}
          >
            Create new
          </Button>
        </div>
      )}

      {mode === "claim" ? (
        <div className="space-y-2">
          <Label>I am…</Label>
          <Select
            value={selectedId?.toString() ?? ""}
            onValueChange={(v) => setSelectedId(Number(v))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select your name">
                {athletes.find((a) => a.id === selectedId)?.name ?? "Select your name"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {athletes.map((a) => (
                <SelectItem key={a.id} value={a.id.toString()} disabled={a.claimed}>
                  {a.name}{a.claimed ? " (already claimed)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <div className="space-y-2">
          <Label>Your name</Label>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Full name"
          />
        </div>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      <Button onClick={handleSubmit} disabled={loading} className="w-full">
        {loading ? "Saving…" : "Continue"}
      </Button>
    </div>
  )
}
