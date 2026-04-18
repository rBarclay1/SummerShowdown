import type { Metadata } from "next"
import "./globals.css"
import { Geist } from "next/font/google"
import { cn } from "@/lib/utils"
import Nav from "@/components/Nav"
import BottomTabBar from "@/components/BottomTabBar"
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar"
import { ClerkProvider } from "@clerk/nextjs"
import { AdminProvider } from "@/components/AdminProvider"
import { cookies } from "next/headers"

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" })

export const metadata: Metadata = {
  title: "Summer Showdown",
  description: "Track lifting PRs. Compete on % gain from your personal baseline.",
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const isUserView = cookieStore.get("user_view_active")?.value === "true"

  return (
    <ClerkProvider afterSignOutUrl="/login">
      <html lang="en" className={cn("dark font-sans", geist.variable)}>
        <body className="min-h-screen bg-background pb-16 sm:pb-0">
          <AdminProvider isUserView={isUserView}>
            <Nav />
            <ServiceWorkerRegistrar />
            {children}
            <BottomTabBar />
          </AdminProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
