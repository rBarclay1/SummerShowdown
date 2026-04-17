"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Trash2, MessageCircle, ChevronDown, ChevronUp } from "lucide-react"
import { deletePost, createComment, deleteComment } from "@/app/community/actions"

type Comment = {
  id: number
  authorId: number
  author: { id: number; name: string }
  content: string
  createdAt: Date
}

type Post = {
  id: number
  author: { id: number; name: string }
  content: string
  imageData: string | null
  comments: Comment[]
  createdAt: Date
}

function timeAgo(date: Date): string {
  const secs = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (secs < 60) return "just now"
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  return `${Math.floor(secs / 86400)}d ago`
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
  return parts[0].slice(0, 2).toUpperCase()
}

export default function PostCard({
  post,
  isAdmin,
  currentUserName,
}: {
  post: Post
  isAdmin: boolean
  currentUserName: string
}) {
  const [showComments, setShowComments] = useState(false)
  const [commentText, setCommentText] = useState("")
  const [localComments, setLocalComments] = useState(post.comments)
  const [commentError, setCommentError] = useState("")
  const [isPending, startTransition] = useTransition()
  const [isDeleting, startDeleteTransition] = useTransition()

  function handleDeletePost() {
    if (!confirm("Delete this post?")) return
    startDeleteTransition(async () => {
      await deletePost(post.id)
    })
  }

  function handleSubmitComment(e: React.FormEvent) {
    e.preventDefault()
    setCommentError("")

    const fd = new FormData()
    fd.append("content", commentText)

    startTransition(async () => {
      const res = await createComment(post.id, fd)
      if (res.success) {
        setLocalComments((prev) => [
          ...prev,
          {
            id: res.commentId,
            authorId: 0,
            author: { id: 0, name: currentUserName },
            content: commentText,
            createdAt: new Date(),
          },
        ])
        setCommentText("")
      } else {
        setCommentError(res.error)
      }
    })
  }

  function handleDeleteComment(commentId: number) {
    startTransition(async () => {
      const res = await deleteComment(commentId)
      if (res.success) {
        setLocalComments((prev) => prev.filter((c) => c.id !== commentId))
      }
    })
  }

  return (
    <article className="border rounded-lg bg-background overflow-hidden">
      {/* Post header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
              {getInitials(post.author.name)}
            </div>
            <div className="min-w-0">
              <Link
                href={`/athlete/${post.author.id}`}
                className="text-sm font-semibold hover:underline truncate block"
              >
                {post.author.name}
              </Link>
              <p className="text-xs text-muted-foreground">{timeAgo(post.createdAt)}</p>
            </div>
          </div>
          {isAdmin && (
            <button
              onClick={handleDeletePost}
              disabled={isDeleting}
              className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
              title="Delete post"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Content */}
        <p className="mt-3 text-sm whitespace-pre-wrap leading-relaxed">{post.content}</p>
      </div>

      {/* Image */}
      {post.imageData && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.imageData}
          alt="Post image"
          className="w-full max-h-96 object-cover border-t"
        />
      )}

      {/* Comment toggle */}
      <div className="px-4 py-2 border-t flex items-center gap-3">
        <button
          onClick={() => setShowComments((v) => !v)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <MessageCircle className="h-4 w-4" />
          {localComments.length > 0
            ? `${localComments.length} comment${localComments.length !== 1 ? "s" : ""}`
            : "Comment"}
          {showComments ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
        </button>
      </div>

      {/* Comments section */}
      {showComments && (
        <div className="border-t bg-muted/20 px-4 py-3 space-y-3">
          {localComments.length > 0 && (
            <ul className="space-y-2">
              {localComments.map((c) => {
                const isOwn = c.author.name === currentUserName
                const canDelete = isAdmin || isOwn
                return (
                  <li key={c.id} className="flex items-start gap-2 text-sm">
                    <div className="w-6 h-6 rounded-full bg-muted border flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      {getInitials(c.author.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-xs">{c.author.name}</span>
                      <span className="text-muted-foreground text-xs ml-1">
                        {timeAgo(c.createdAt)}
                      </span>
                      <p className="mt-0.5 text-sm leading-snug whitespace-pre-wrap">
                        {c.content}
                      </p>
                    </div>
                    {canDelete && (
                      <button
                        onClick={() => handleDeleteComment(c.id)}
                        disabled={isPending}
                        className="shrink-0 text-muted-foreground hover:text-destructive transition-colors mt-0.5"
                        title="Delete comment"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}

          {/* Add comment form */}
          <form onSubmit={handleSubmitComment} className="space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder="Write a comment…"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                disabled={isPending}
                className="text-sm h-9 flex-1"
                maxLength={500}
              />
              <Button
                type="submit"
                size="sm"
                disabled={isPending || !commentText.trim()}
              >
                Post
              </Button>
            </div>
            {commentError && <p className="text-xs text-destructive">{commentError}</p>}
          </form>
        </div>
      )}
    </article>
  )
}
