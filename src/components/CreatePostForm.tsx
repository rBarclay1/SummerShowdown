"use client"

import { useState, useTransition, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { createPost } from "@/app/community/actions"
import { ImagePlus, X } from "lucide-react"

export default function CreatePostForm({ athleteName }: { athleteName: string }) {
  const [open, setOpen] = useState(false)
  const [content, setContent] = useState("")
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageData, setImageData] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [isPending, startTransition] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 4 * 1024 * 1024) {
      setError("Image must be under 4 MB.")
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      setImageData(result)
      setImagePreview(result)
    }
    reader.readAsDataURL(file)
  }

  function clearImage() {
    setImageData(null)
    setImagePreview(null)
    if (fileRef.current) fileRef.current.value = ""
  }

  function handleCancel() {
    setOpen(false)
    setContent("")
    clearImage()
    setError("")
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    const fd = new FormData()
    fd.append("content", content)
    if (imageData) fd.append("imageData", imageData)

    startTransition(async () => {
      const res = await createPost(fd)
      if (res.success) {
        handleCancel()
      } else {
        setError(res.error)
      }
    })
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full text-left px-4 py-3 rounded-lg border bg-muted/30 text-muted-foreground hover:bg-muted transition-colors text-sm"
      >
        Share something with the group…
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="border rounded-lg p-4 space-y-4 bg-background">
      {/* Author display */}
      <div className="text-sm text-muted-foreground">
        Posting as <span className="font-semibold text-foreground">{athleteName}</span>
      </div>

      {/* Content */}
      <div className="space-y-1">
        <Label htmlFor="post-content">Post</Label>
        <textarea
          id="post-content"
          rows={3}
          placeholder="What's on your mind?"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={isPending}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          maxLength={2000}
        />
        <p className="text-xs text-muted-foreground text-right">{content.length}/2000</p>
      </div>

      {/* Image upload */}
      {imagePreview ? (
        <div className="relative inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imagePreview}
            alt="Preview"
            className="max-h-48 rounded-md border object-cover"
          />
          <button
            type="button"
            onClick={clearImage}
            className="absolute top-1 right-1 bg-background border rounded-full p-0.5 hover:bg-muted"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFile}
            disabled={isPending}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={isPending}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground border rounded-md px-3 py-2 hover:bg-muted transition-colors"
          >
            <ImagePlus className="h-4 w-4" />
            Add photo
          </button>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={handleCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isPending || !content.trim()}
        >
          {isPending ? "Posting…" : "Post"}
        </Button>
      </div>
    </form>
  )
}
