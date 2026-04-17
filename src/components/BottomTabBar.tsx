"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Trophy, Users, Bell, BarChart2, Plus } from "lucide-react"
import { cn } from "@/lib/utils"

const LEFT_TABS = [
  { href: "/", label: "Leaderboards", icon: Trophy },
  { href: "/community", label: "Community", icon: Users },
]

const RIGHT_TABS = [
  { href: "/charts", label: "Charts", icon: BarChart2 },
  { href: "/notifications", label: "Notifications", icon: Bell },
]

export default function BottomTabBar() {
  const pathname = usePathname()

  function isActive(href: string) {
    return href === "/" ? pathname === "/" : pathname.startsWith(href)
  }

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-20">
      {/* FAB — elevated above the tab bar */}
      <Link
        href="/log"
        aria-label="Log PR"
        className="absolute bottom-9 left-1/2 -translate-x-1/2 flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/40 active:scale-95 transition-transform z-10"
      >
        <Plus className="size-6 text-white" strokeWidth={2.5} />
      </Link>

      {/* Tab bar */}
      <div className="bg-[rgba(10,15,30,0.80)] backdrop-blur-md border-t border-white/10 flex h-16">
        {LEFT_TABS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors",
              isActive(href) ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Icon
              className={cn("size-5 shrink-0", isActive(href) ? "stroke-[2.5]" : "stroke-[1.75]")}
            />
            {label}
          </Link>
        ))}

        {/* Blank slot behind the FAB */}
        <div className="w-16 shrink-0" />

        {RIGHT_TABS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors",
              isActive(href) ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Icon
              className={cn("size-5 shrink-0", isActive(href) ? "stroke-[2.5]" : "stroke-[1.75]")}
            />
            {label}
          </Link>
        ))}
      </div>
    </nav>
  )
}
