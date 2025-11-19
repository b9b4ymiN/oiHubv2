'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { BlurButton } from '@/components/ui/blur-button'

export function BlurNav() {
  const pathname = usePathname()

  const navItems = [
    { href: '/', label: 'Home' },
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/learn', label: 'Learn' },
  ]

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-[62px] backdrop-blur-blur bg-blur-bg-primary/80 border-b border-white/8">
      <div className="container mx-auto h-full flex items-center justify-between px-md sm:px-lg">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2 group">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blur-orange rounded-blur flex items-center justify-center shadow-blur-glow">
            <span className="text-blur-bg-primary font-bold text-sm sm:text-base">OI</span>
          </div>
          <span className="text-blur-text-primary font-bold text-sm sm:text-base uppercase tracking-wide group-hover:text-blur-orange transition-colors">
            Trader Hub
          </span>
        </Link>

        {/* Navigation Items */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "px-3 py-2 text-xs sm:text-sm font-bold uppercase tracking-wide rounded-blur transition-all duration-200",
                pathname === item.href
                  ? "text-blur-orange bg-blur-orange/10 border border-blur-orange/20"
                  : "text-blur-text-secondary hover:text-blur-orange hover:bg-blur-orange/5"
              )}
            >
              {item.label}
            </Link>
          ))}

          {/* CTA Button */}
          <BlurButton
            variant="primary"
            size="sm"
            asChild
            className="hidden sm:inline-flex"
          >
            <Link href="/dashboard">
              Start Trading
            </Link>
          </BlurButton>
        </div>
      </div>
    </nav>
  )
}
