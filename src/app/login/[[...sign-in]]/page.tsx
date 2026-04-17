import { SignIn } from "@clerk/nextjs"

export default function LoginPage() {
  return (
    <main className="flex items-center justify-center min-h-[calc(100vh-3.5rem)] px-4">
      <SignIn />
    </main>
  )
}
