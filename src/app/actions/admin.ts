"use server"

import { cookies } from "next/headers"
import { isRealAdminUser } from "@/lib/admin"
import { revalidatePath } from "next/cache"

export async function toggleUserView(active: boolean) {
  if (!(await isRealAdminUser())) return

  const cookieStore = await cookies()
  if (active) {
    cookieStore.set("user_view_active", "true", { path: "/" })
  } else {
    cookieStore.delete("user_view_active")
  }
  
  // Revalidate to ensure the layout/pages reflect the new state
  revalidatePath("/", "layout")
}