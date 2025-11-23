import type { Metadata } from "next"
import { Space_Mono } from "next/font/google"
import "./globals.css"
import { QueryProvider } from "@/components/providers/query-provider"
import { ChatContextProvider } from "@/lib/contexts/ChatContextProvider"
import { ChatModal } from "@/components/chat/ChatModal"
import { ModernNav } from "@/components/navigation/modern-nav"

const spaceMono = Space_Mono({
  weight: ['400', '700'],
  subsets: ["latin"],
  variable: '--font-proto-mono',
})

export const metadata: Metadata = {
  title: "OI Trader Hub - Professional Options & Futures Analysis",
  description: "Professional decision support tool for analyzing Futures Open Interest and Options trading data. Real-time IV analysis, support/resistance detection, and market regime insights.",
  icons: {
    icon: '/avatars/THP.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body className={`${spaceMono.variable} font-mono antialiased`}>
        <QueryProvider>
          <ChatContextProvider>
            {children}
            <ChatModal />
          </ChatContextProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
