"use client"

import { UserButton, useUser } from "@clerk/nextjs"
import { Eye, Shield, User } from "lucide-react"
import { useIsAdmin } from "@/components/AdminProvider"
import { toggleUserView } from "@/app/actions/admin"

export default function UserMenu() {
  const { isLoaded } = useUser()
  const { isRealAdmin, isAdmin, isUserView } = useIsAdmin()

  return (
    <UserButton>
      <UserButton.MenuItems>
        <UserButton.Link
          label="My Profile"
          labelIcon={<User className="size-4" />}
          href="/athlete/me"
        />
        {isLoaded && isRealAdmin && (
          <UserButton.Action
            label={isUserView ? "Exit User View" : "User View"}
            labelIcon={isUserView ? <Shield className="size-4" /> : <Eye className="size-4" />}
            onClick={async () => {
              await toggleUserView(!isUserView)
              window.location.reload()
            }}
          />
        )}
        {isLoaded && isAdmin && (
          <UserButton.Link
            label="Admin View"
            labelIcon={<Shield className="size-4" />}
            href="/admin/lifts"
          />
        )}
      </UserButton.MenuItems>
    </UserButton>
  )
}
