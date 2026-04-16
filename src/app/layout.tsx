import type { Metadata } from "next"
import "./globals.css"
import { Geist } from "next/font/google"
import { cn } from "@/lib/utils"
import Nav from "@/components/Nav"

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" })

export const metadata: Metadata = {
  title: "Summer Showdown",
  description: "Track lifting PRs. Compete on % gain from your personal baseline.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body className="min-h-screen bg-background">
        <Nav />
        {children}
      </body>
    </html>
  )
}
