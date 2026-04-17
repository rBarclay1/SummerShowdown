import type { Metadata } from "next"
import "./globals.css"
import { Geist } from "next/font/google"
import { cn } from "@/lib/utils"
import Nav from "@/components/Nav"
import BottomTabBar from "@/components/BottomTabBar"
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar"
import { ClerkProvider } from "@clerk/nextjs"

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" })

export const metadata: Metadata = {
  title: "Summer Showdown",
  description: "Track lifting PRs. Compete on % gain from your personal baseline.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider afterSignOutUrl="/login">
      <html lang="en" className={cn("dark font-sans", geist.variable)}>
        <body className="min-h-screen bg-background pb-16 sm:pb-0">
          <Nav />
          <ServiceWorkerRegistrar />
          {children}
          <BottomTabBar />
        </body>
      </html>
    </ClerkProvider>
  )
}
