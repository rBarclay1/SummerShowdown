"use client"

import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useUser } from "@clerk/nextjs"
import { useIsAdmin } from "@/components/AdminProvider"

export default function AdminNavItems() {
  const { isLoaded } = useUser()
  const { isAdmin } = useIsAdmin()

  if (!isLoaded || !isAdmin) return null

  return (
    <Link href="/admin/lifts" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
      Manage Activities
    </Link>
  )
}
