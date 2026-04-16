import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default function Nav() {
  return (
    <header className="border-b bg-background sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-bold text-lg tracking-tight">
          Summer Showdown
        </Link>
        <nav className="flex items-center gap-2">
          <Link href="/" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
            Leaderboards
          </Link>
          <Link href="/log" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
            Log PR
          </Link>
          <Link href="/leaderboard/new" className={cn(buttonVariants({ size: "sm" }))}>
            New Leaderboard
          </Link>
        </nav>
      </div>
    </header>
  )
}
