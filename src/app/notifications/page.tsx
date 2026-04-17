import NotificationPrefsForm from "@/components/NotificationPrefsForm"
import { currentUser } from "@clerk/nextjs/server"

export const dynamic = "force-dynamic"

export default async function NotificationsPage() {
  const clerkUser = await currentUser()
  const athleteName =
    [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ").trim() ||
    clerkUser?.username ||
    ""

  return (
    <main className="max-w-lg mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Get notified when another athlete surpasses you on a leaderboard.
          Choose how you want to be alerted.
        </p>
      </div>
      <NotificationPrefsForm athleteName={athleteName} />
    </main>
  )
}
