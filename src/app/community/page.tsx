import { prisma } from "@/lib/prisma"
import { isAdmin } from "@/lib/admin"
import CreatePostForm from "@/components/CreatePostForm"
import PostCard from "@/components/PostCard"
import { currentUser } from "@clerk/nextjs/server"

export const dynamic = "force-dynamic"

export default async function CommunityPage() {
  const [posts, admin, clerkUser] = await Promise.all([
    prisma.post.findMany({
      include: {
        author: true,
        comments: {
          include: { author: true },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    isAdmin(),
    currentUser(),
  ])

  const athleteName =
    [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ").trim() ||
    clerkUser?.username ||
    ""

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Community</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Share updates, celebrate PRs, or just talk lifting.
        </p>
      </div>

      <CreatePostForm athleteName={athleteName} />

      {posts.length === 0 ? (
        <div className="text-center py-16 border rounded-lg bg-muted/30">
          <p className="text-muted-foreground">No posts yet. Be the first to share something!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              isAdmin={admin}
              currentUserName={athleteName}
            />
          ))}
        </div>
      )}
    </main>
  )
}
