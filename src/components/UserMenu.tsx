"use client"

import { UserButton } from "@clerk/nextjs"
import { User } from "lucide-react"

export default function UserMenu() {
  return (
    <UserButton>
      <UserButton.MenuItems>
        <UserButton.Link
          label="My Profile"
          labelIcon={<User className="size-4" />}
          href="/athlete/me"
        />
      </UserButton.MenuItems>
    </UserButton>
  )
}
