import { currentUser } from "@clerk/nextjs/server"

export async function isAdmin(): Promise<boolean> {
  const user = await currentUser()
  if (!user) return false
  return (user.publicMetadata as { isAdmin?: boolean })?.isAdmin === true
}
