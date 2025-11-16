import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { QueryProvider } from "@/components/providers/query-provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "OI Trader Hub - Professional Futures Open Interest Analysis Platform",
  description: "Professional decision support tool for analyzing Futures Open Interest trading data. 8.5/10 rating with 90% information sufficiency. Statistical analysis, OI divergence detection, and AI-powered opportunity finder.",
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('theme') ||
                  (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
                document.documentElement.classList.toggle('dark', theme === 'dark');
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className={`${inter.className} bg-gray-50 dark:bg-gray-900 transition-colors duration-200`}>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  )
}
