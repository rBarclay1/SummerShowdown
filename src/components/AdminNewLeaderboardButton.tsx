"use client"

import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useUser } from "@clerk/nextjs"
import { useIsAdmin } from "@/components/AdminProvider"

export default function AdminNewLeaderboardButton({
  size = "default",
  className,
}: {
  size?: "default" | "sm"
  className?: string
}) {
  const { isLoaded } = useUser()
  const { isAdmin } = useIsAdmin()

  if (!isLoaded || !isAdmin) return null

  return (
    <Link
      href="/leaderboard/new"
      className={cn(buttonVariants({ size }), className)}
    >
      New Leaderboard
    </Link>
  )
}
