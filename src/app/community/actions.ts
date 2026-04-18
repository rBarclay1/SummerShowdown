"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { isAdmin } from "@/lib/admin"
import { auth, currentUser } from "@clerk/nextjs/server"

async function resolveAthleteFromClerk() {
  const { userId } = await auth()
  if (!userId) return null

  let athlete = await prisma.athlete.findUnique({ where: { clerkId: userId } })
  if (!athlete) {
    // Move Clerk API fetch here: only happens during initial user creation
    const clerkUser = await currentUser()
    const athleteName =
      [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ").trim() ||
      clerkUser?.username ||
      ""
    if (!athleteName) return null

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
  return athlete
}

export async function createPost(formData: FormData): Promise<{ success: true; postId: number } | { success: false; error: string }> {
  try {
    const athlete = await resolveAthleteFromClerk()
    if (!athlete) return { success: false, error: "Not authenticated." }

    const content = (formData.get("content") as string).trim()
    const imageDataRaw = formData.get("imageData") as string | null
    const imageData = imageDataRaw && imageDataRaw.trim() ? imageDataRaw.trim() : null

    if (!content) return { success: false, error: "Post content is required." }
    if (content.length > 2000) return { success: false, error: "Post must be under 2000 characters." }

    const post = await prisma.post.create({
      data: { authorId: athlete.id, content, imageData },
    })

    revalidatePath("/community")
    return { success: true, postId: post.id }
  } catch (e) {
    console.error(e)
    return { success: false, error: "Failed to create post." }
  }
}

export async function deletePost(postId: number): Promise<{ success: boolean; error?: string }> {
  if (!(await isAdmin())) return { success: false, error: "Forbidden" }
  try {
    await prisma.post.delete({ where: { id: postId } })
    revalidatePath("/community")
    return { success: true }
  } catch (e) {
    console.error(e)
    return { success: false, error: "Failed to delete post." }
  }
}

export async function createComment(
  postId: number,
  formData: FormData
): Promise<{ success: true; commentId: number } | { success: false; error: string }> {
  try {
    const athlete = await resolveAthleteFromClerk()
    if (!athlete) return { success: false, error: "Not authenticated." }

    const content = (formData.get("content") as string).trim()

    if (!content) return { success: false, error: "Comment cannot be empty." }
    if (content.length > 500) return { success: false, error: "Comment must be under 500 characters." }

    const comment = await prisma.comment.create({
      data: { postId, authorId: athlete.id, content, authorToken: "" },
    })

    revalidatePath("/community")
    return { success: true, commentId: comment.id }
  } catch (e) {
    console.error(e)
    return { success: false, error: "Failed to post comment." }
  }
}

export async function deleteComment(
  commentId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminUser = await isAdmin()
    const { userId } = await auth()

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: { author: true },
    })
    if (!comment) return { success: false, error: "Comment not found." }

    // Allow delete if admin, or if the comment's author matches the current Clerk user
    if (!adminUser) {
      if (!userId) return { success: false, error: "Unauthorized." }
      const athlete = await prisma.athlete.findUnique({ where: { clerkId: userId } })
      if (!athlete || athlete.id !== comment.authorId) {
        return { success: false, error: "Unauthorized." }
      }
    }

    await prisma.comment.delete({ where: { id: commentId } })
    revalidatePath("/community")
    return { success: true }
  } catch (e) {
    console.error(e)
    return { success: false, error: "Failed to delete comment." }
  }
}
