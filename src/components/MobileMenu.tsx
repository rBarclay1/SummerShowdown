"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { adminLogout } from "@/app/admin/login/actions"

export default function MobileMenu({ admin }: { admin: boolean }) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

  useEffect(() => { setOpen(false) }, [pathname])

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [open])

  return (
    <div className="sm:hidden" ref={menuRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        className="flex flex-col justify-center items-center w-11 h-11 gap-[5px] -mr-1"
      >
        <span className={`block h-[2px] w-6 bg-foreground rounded-full transition-all duration-200 origin-center ${open ? "translate-y-[7px] rotate-45" : ""}`} />
        <span className={`block h-[2px] w-6 bg-foreground rounded-full transition-all duration-200 ${open ? "opacity-0 scale-x-0" : ""}`} />
        <span className={`block h-[2px] w-6 bg-foreground rounded-full transition-all duration-200 origin-center ${open ? "-translate-y-[7px] -rotate-45" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-14 left-0 right-0 bg-background border-b shadow-md z-20 px-4 py-3 flex flex-col gap-1">
          <Link
            href="/"
            onClick={() => setOpen(false)}
            className={cn(buttonVariants({ variant: "ghost" }), "justify-start h-11")}
          >
            Leaderboards
          </Link>
<Link
            href="/log"
            onClick={() => setOpen(false)}
            className={cn(buttonVariants({ variant: "ghost" }), "justify-start h-11")}
          >
            Log PR
          </Link>
          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className={cn(buttonVariants({ variant: "ghost" }), "justify-start h-11")}
          >
            Notifications
          </Link>
          {admin ? (
            <>
              <Link
                href="/leaderboard/new"
                onClick={() => setOpen(false)}
                className={cn(buttonVariants(), "justify-start h-11")}
              >
                New Leaderboard
              </Link>
              <Link
                href="/admin/lifts"
                onClick={() => setOpen(false)}
                className={cn(buttonVariants({ variant: "outline" }), "justify-start h-11")}
              >
                Manage Activities
              </Link>
              <form action={adminLogout} className="w-full">
                <button
                  type="submit"
                  className={cn(
                    buttonVariants({ variant: "ghost" }),
                    "w-full justify-start h-11 text-muted-foreground"
                  )}
                >
                  Logout
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/admin/login"
              onClick={() => setOpen(false)}
              className={cn(
                buttonVariants({ variant: "ghost" }),
                "justify-start h-11 text-muted-foreground"
              )}
            >
              Admin
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
