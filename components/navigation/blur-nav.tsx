'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { BlurButton } from '@/components/ui/blur-button'
import { Menu, X } from 'lucide-react'

export function BlurNav() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navItems = [
    { href: '/', label: 'Home' },
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/intelligence', label: 'Intelligence' },
    { href: '/options-volume', label: 'Options' },
    { href: '/options-pro', label: 'Pro Flow' },
    { href: '/learn', label: 'Learn' },
  ]

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 h-[52px] sm:h-[62px] backdrop-blur-blur bg-blur-bg-primary/90 border-b border-white/8">
        <div className="container mx-auto h-full flex items-center justify-between px-3 sm:px-lg">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-1.5 sm:space-x-2 group">
            <div className="w-7 h-7 sm:w-10 sm:h-10 bg-blur-orange rounded-blur flex items-center justify-center shadow-blur-glow">
              <span className="text-blur-bg-primary font-bold text-xs sm:text-base">OI</span>
            </div>
            <span className="text-blur-text-primary font-bold text-xs sm:text-base uppercase tracking-wide group-hover:text-blur-orange transition-colors">
              Trader Hub
            </span>
          </Link>

          {/* Desktop Navigation Items */}
          <div className="hidden lg:flex items-center space-x-2 sm:space-x-4">
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

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-blur-text-primary hover:text-blur-orange transition-colors touch-manipulation"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed top-[52px] left-0 right-0 z-40 lg:hidden bg-blur-bg-secondary/95 backdrop-blur-lg border-b border-white/8 animate-in slide-in-from-top duration-200">
          <div className="container mx-auto px-3 py-3 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "block px-4 py-2.5 text-sm font-bold uppercase tracking-wide rounded-lg transition-all duration-200",
                  pathname === item.href
                    ? "text-blur-orange bg-blur-orange/10 border border-blur-orange/20"
                    : "text-blur-text-secondary hover:text-blur-orange hover:bg-blur-orange/5"
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
