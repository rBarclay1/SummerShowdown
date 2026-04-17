import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth, currentUser } from "@clerk/nextjs/server"

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

    const { subscription } = await req.json()

    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return NextResponse.json({ error: "Invalid subscription" }, { status: 400 })
    }

    const clerkUser = await currentUser()
    const athleteName =
      [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ").trim() ||
      clerkUser?.username ||
      ""
    if (!athleteName) {
      return NextResponse.json({ error: "Profile needs a name" }, { status: 400 })
    }

    let athlete = await prisma.athlete.findUnique({ where: { clerkId: userId } })
    if (!athlete) {
      const existing = await prisma.athlete.findUnique({ where: { name: athleteName } })
      if (existing && !existing.clerkId) {
        athlete = await prisma.athlete.update({
          where: { id: existing.id },
          data: { clerkId: userId },
        })
      } else if (!existing) {
        athlete = await prisma.athlete.create({
          data: { name: athleteName, clerkId: userId },
        })
      } else {
        athlete = await prisma.athlete.create({
          data: { name: `${athleteName} (${userId.slice(-4)})`, clerkId: userId },
        })
      }
    }

    await prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      update: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        athleteId: athlete.id,
      },
      create: {
        athleteId: athlete.id,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Failed to save subscription" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { endpoint } = await req.json()
    if (!endpoint) return NextResponse.json({ error: "endpoint required" }, { status: 400 })
    await prisma.pushSubscription.deleteMany({ where: { endpoint } })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Failed to remove subscription" }, { status: 500 })
  }
}
