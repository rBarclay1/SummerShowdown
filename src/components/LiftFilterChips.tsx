"use client"

import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { Badge } from "@/components/ui/badge"

type Lift = { id: number; name: string }

export default function LiftFilterChips({
  lifts,
  mainLiftId,
}: {
  lifts: Lift[]
  mainLiftId: number
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const activeLiftId = searchParams.get("lift") ? parseInt(searchParams.get("lift")!) : null

  function setFilter(liftId: number | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (liftId === null) params.delete("lift")
    else params.set("lift", liftId.toString())
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button onClick={() => setFilter(null)}>
        <Badge
          variant={activeLiftId === null ? "default" : "outline"}
          className="cursor-pointer hover:opacity-80 transition-opacity"
        >
          All Lifts
        </Badge>
      </button>
      {lifts.map((lift) => (
        <button key={lift.id} onClick={() => setFilter(lift.id)}>
          <Badge
            variant={activeLiftId === lift.id ? "default" : "outline"}
            className="cursor-pointer hover:opacity-80 transition-opacity"
          >
            {lift.name}
            {lift.id === mainLiftId && (
              <span className="ml-1 opacity-60 text-[10px]">★</span>
            )}
          </Badge>
        </button>
      ))}
    </div>
  )
}
