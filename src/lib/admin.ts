import { currentUser } from "@clerk/nextjs/server"
import { cookies } from "next/headers"

export async function isRealAdminUser(): Promise<boolean> {
  if (process.env.NODE_ENV === "development" && process.env.DEV_ADMIN === "true") return true
  const user = await currentUser()
  if (!user) return false
  const isAdminMeta = (user.publicMetadata as any)?.isAdmin
  return isAdminMeta === true || isAdminMeta === "True" || isAdminMeta === "true"
}

export async function isAdmin(): Promise<boolean> {
  if (!(await isRealAdminUser())) return false
  const cookieStore = await cookies()
  return cookieStore.get("user_view_active")?.value !== "true"
}