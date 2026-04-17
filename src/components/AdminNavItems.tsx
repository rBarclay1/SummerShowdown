"use client"

import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useUser } from "@clerk/nextjs"

export default function AdminNavItems() {
  const { user, isLoaded } = useUser()

  if (!isLoaded) return null
  if ((user?.publicMetadata as { isAdmin?: boolean } | undefined)?.isAdmin !== true) return null

  return (
    <Link href="/admin/lifts" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
      Manage Lifts
    </Link>
  )
}
