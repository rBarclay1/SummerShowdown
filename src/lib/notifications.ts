import webpush from "web-push"
import { Resend } from "resend"
import { prisma } from "./prisma"

// Configure web-push VAPID
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY
const vapidReady = !!(vapidPublicKey && vapidPrivateKey)

if (vapidReady) {
  webpush.setVapidDetails(
    process.env.VAPID_CONTACT ?? "mailto:admin@example.com",
    vapidPublicKey!,
    vapidPrivateKey!
  )
}

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export type SurpassEvent = {
  surpassedAthleteId: number
  surpassedAthleteName: string
  surpassedByName: string
  leaderboardName: string
  liftName: string
  /** New leader's gain minus surpassed athlete's gain, in percentage points */
  gainDiff: number
}

export async function sendSurpassNotifications(events: SurpassEvent[]) {
  if (events.length === 0) return

  // Fetch all notification preferences in one query instead of one per event.
  const athleteIds = events.map((e) => e.surpassedAthleteId)
  const allPrefs = await prisma.notificationPreferences.findMany({
    where: { athleteId: { in: athleteIds } },
  })
  const prefsMap = new Map(allPrefs.map((p) => [p.athleteId, p]))

  for (const event of events) {
    const prefs = prefsMap.get(event.surpassedAthleteId)

    const emailEnabled = prefs?.emailEnabled ?? true
    const pushEnabled = prefs?.pushEnabled ?? true
    const email = prefs?.email

    const title = `You've been passed on ${event.leaderboardName}!`
    const body = `${event.surpassedByName} just surpassed you on ${event.liftName} by ${event.gainDiff.toFixed(1)}%.`

    if (pushEnabled) {
      await sendPushToAthlete(event.surpassedAthleteId, title, body)
    }

    if (emailEnabled && email) {
      await sendEmail(email, title, body, event)
    }
  }
}

async function sendPushToAthlete(athleteId: number, title: string, body: string) {
  if (!vapidReady) {
    console.warn("VAPID keys not set — skipping push notification")
    return
  }
  const subs = await prisma.pushSubscription.findMany({ where: { athleteId } })

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({ title, body }),
        { TTL: 60 * 60 * 24 } // 24 hours TTL
      )
    } catch (err: unknown) {
      // Remove stale / expired subscriptions
      if (err && typeof err === "object" && "statusCode" in err && (err as { statusCode: number }).statusCode === 410) {
        await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {})
      } else {
        console.error("Push send error:", err)
      }
    }
  }
}

async function sendEmail(
  to: string,
  subject: string,
  body: string,
  event: SurpassEvent
) {
  if (!resend) {
    console.warn("RESEND_API_KEY not set — skipping email notification")
    return
  }

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM ?? "Summer Showdown <noreply@example.com>",
      to,
      subject,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2 style="margin-top: 0; color: #111;">📣 ${subject}</h2>
          <p style="color: #444; font-size: 16px; line-height: 1.5;">
            <strong>${event.surpassedByName}</strong> just surpassed you on the
            <strong>${event.leaderboardName}</strong> leaderboard
            (<strong>${event.liftName}</strong>) by
            <strong style="color: #ef4444;">${event.gainDiff.toFixed(1)}%</strong>.
          </p>
          <p style="color: #444; font-size: 15px;">
            Time to get back in the gym and reclaim your spot! 💪
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
          <p style="color: #999; font-size: 13px;">
            You can manage notification preferences in the Summer Showdown app.
          </p>
        </div>
      `,
    })
  } catch (err) {
    console.error("Email send error:", err)
  }
}
