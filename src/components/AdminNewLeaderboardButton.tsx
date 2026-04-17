"use client"

import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useUser } from "@clerk/nextjs"

export default function AdminNewLeaderboardButton({
  size = "default",
  className,
}: {
  size?: "default" | "sm"
  className?: string
}) {
  const { user, isLoaded } = useUser()

  if (!isLoaded) return null
  if ((user?.publicMetadata as { isAdmin?: boolean } | undefined)?.isAdmin !== true) return null

  return (
    <Link
      href="/leaderboard/new"
      className={cn(buttonVariants({ size }), className)}
    >
      New Leaderboard
    </Link>
  )
}
