import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import UserMenu from "@/components/UserMenu"
import AdminNavItems from "@/components/AdminNavItems"

export default function Nav() {
  return (
    <header className="border-b border-white/5 bg-transparent backdrop-blur-md sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-bold text-lg tracking-tight">
          Summer Showdown
        </Link>

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-2">
          <Link href="/" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
            Leaderboards
          </Link>
<Link href="/log" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
            Log PR
          </Link>
          <Link href="/notifications" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
            Notifications
          </Link>
          <AdminNavItems />
          <UserMenu />
        </nav>

        {/* Mobile profile avatar */}
        <div className="sm:hidden">
          <UserMenu />
        </div>
      </div>
    </header>
  )
}
