"use client"

import { useState, useTransition, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { saveNotificationPrefs } from "@/app/notifications/actions"
import { Bell, BellOff, Mail, MailX } from "lucide-react"

export default function NotificationPrefsForm({ athleteName }: { athleteName: string }) {
  const [email, setEmail] = useState("")
  const [emailEnabled, setEmailEnabled] = useState(true)
  const [pushEnabled, setPushEnabled] = useState(true)
  const [pushSupported, setPushSupported] = useState(false)
  const [pushSubscribed, setPushSubscribed] = useState(false)
  const [pushStatus, setPushStatus] = useState<"idle" | "subscribing" | "error">("idle")
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState("")
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    const supported =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window
    setPushSupported(supported)

    if (supported) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          setPushSubscribed(!!sub)
        })
      })
    }
  }, [])

  async function subscribeToPush(): Promise<boolean> {
    try {
      setPushStatus("subscribing")
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""
        ) as unknown as BufferSource,
      })

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub }),
      })

      if (!res.ok) throw new Error("Subscribe API failed")
      setPushSubscribed(true)
      setPushStatus("idle")
      return true
    } catch (err) {
      console.error("Push subscribe error:", err)
      setPushStatus("error")
      return false
    }
  }

  async function unsubscribeFromPush() {
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })
        await sub.unsubscribe()
        setPushSubscribed(false)
      }
    } catch (err) {
      console.error("Unsubscribe error:", err)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSaved(false)

    // If push toggled on and not yet subscribed, subscribe now
    if (pushEnabled && pushSupported && !pushSubscribed) {
      const ok = await subscribeToPush()
      if (!ok) {
        setError("Could not enable push notifications. Check browser permissions.")
        return
      }
    }

    // If push toggled off and currently subscribed, unsubscribe
    if (!pushEnabled && pushSubscribed) {
      await unsubscribeFromPush()
    }

    const fd = new FormData()
    fd.append("emailEnabled", emailEnabled.toString())
    fd.append("pushEnabled", pushEnabled.toString())
    if (email.trim()) fd.append("email", email.trim())

    startTransition(async () => {
      const res = await saveNotificationPrefs(fd)
      if (res.success) {
        setSaved(true)
      } else {
        setError(res.error ?? "Failed to save.")
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-md">
      {/* Current user display */}
      <div className="rounded-md bg-muted/40 border px-4 py-3 text-sm">
        Saving preferences for <span className="font-semibold">{athleteName}</span>
      </div>

      {/* Email notifications */}
      <div className="rounded-lg border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {emailEnabled ? <Mail className="h-4 w-4 text-primary" /> : <MailX className="h-4 w-4 text-muted-foreground" />}
            <div>
              <p className="text-sm font-medium">Email notifications</p>
              <p className="text-xs text-muted-foreground">Get emailed when someone surpasses you</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { setEmailEnabled((v) => !v); setSaved(false) }}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
              emailEnabled ? "bg-primary" : "bg-muted-foreground/30"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                emailEnabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {emailEnabled && (
          <div className="space-y-1">
            <Label htmlFor="notif-email" className="text-xs text-muted-foreground">
              Email address
            </Label>
            <Input
              id="notif-email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setSaved(false) }}
              disabled={isPending}
              className="text-sm"
            />
          </div>
        )}
      </div>

      {/* Push notifications */}
      <div className="rounded-lg border p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {pushEnabled ? <Bell className="h-4 w-4 text-primary" /> : <BellOff className="h-4 w-4 text-muted-foreground" />}
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">Push notifications</p>
                {pushSubscribed && (
                  <Badge variant="secondary" className="text-[10px]">active</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Browser pop-up when passed on a leaderboard</p>
            </div>
          </div>
          <button
            type="button"
            disabled={!pushSupported}
            onClick={() => { setPushEnabled((v) => !v); setSaved(false) }}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-40 ${
              pushEnabled && pushSupported ? "bg-primary" : "bg-muted-foreground/30"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                pushEnabled && pushSupported ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
        {!pushSupported && (
          <p className="text-xs text-muted-foreground">
            Push notifications are not supported in this browser.
          </p>
        )}
        {pushStatus === "error" && (
          <p className="text-xs text-destructive">
            Permission denied. Enable notifications in your browser settings.
          </p>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {saved && (
        <p className="text-sm text-emerald-600">Preferences saved!</p>
      )}

      <Button type="submit" disabled={isPending || pushStatus === "subscribing"}>
        {isPending || pushStatus === "subscribing" ? "Saving…" : "Save Preferences"}
      </Button>
    </form>
  )
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}
