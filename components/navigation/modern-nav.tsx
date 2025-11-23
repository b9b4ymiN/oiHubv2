'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { BlurButton } from '@/components/ui/blur-button'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Menu, 
  X, 
  Search, 
  Bell, 
  Settings, 
  TrendingUp,
  BarChart3,
  Brain,
  BookOpen,
  User
} from 'lucide-react'

export function ModernNav() {
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const navItems = [
    { href: '/', label: 'Home', icon: TrendingUp },
    { href: '/dashboard', label: 'Dashboard', icon: BarChart3 },
    { href: '/intelligence', label: 'Intelligence', icon: Brain },
    { href: '/options-volume', label: 'Options', icon: BarChart3 },
    { href: '/options-pro', label: 'Pro Flow', icon: TrendingUp },
    { href: '/learn', label: 'Learn', icon: BookOpen },
  ]

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-[72px] backdrop-blur-blur bg-blur-bg-primary/90 border-b border-white/10 shadow-lg">
      <div className="container mx-auto h-full flex items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-3 group">
          <div className="w-10 h-10 bg-gradient-to-br from-blur-orange to-blur-orange-bright rounded-xl flex items-center justify-center shadow-blur-glow transform transition-transform group-hover:scale-105">
            <span className="text-blur-bg-primary font-bold text-lg">OI</span>
          </div>
          <div className="flex flex-col">
            <span className="text-blur-text-primary font-bold text-lg uppercase tracking-wide group-hover:text-blur-orange transition-colors">
              Trader Hub
            </span>
            <span className="text-blur-text-muted text-xs">Professional Analysis</span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center space-x-1">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center space-x-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200",
                  pathname === item.href
                    ? "text-blur-orange bg-blur-orange/10 border border-blur-orange/20 shadow-sm"
                    : "text-blur-text-secondary hover:text-blur-orange hover:bg-blur-orange/5"
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center space-x-3">
          {/* Search Button */}
          <Button
            variant="ghost"
            size="sm"
            className="hidden sm:flex items-center space-x-2 text-blur-text-secondary hover:text-blur-orange"
          >
            <Search className="w-4 h-4" />
            <span className="text-sm">Search</span>
          </Button>

          {/* Notifications */}
          <Button
            variant="ghost"
            size="sm"
            className="relative text-blur-text-secondary hover:text-blur-orange"
          >
            <Bell className="w-5 h-5" />
            <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center bg-red-500 text-white text-xs">
              3
            </Badge>
          </Button>

          {/* Market Status */}
          <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-green-400 text-xs font-medium">LIVE</span>
          </div>

          {/* User Menu */}
          <Button
            variant="ghost"
            size="sm"
            className="text-blur-text-secondary hover:text-blur-orange"
          >
            <User className="w-5 h-5" />
          </Button>

          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden text-blur-text-secondary hover:text-blur-orange"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden absolute top-full left-0 right-0 bg-blur-bg-primary/95 backdrop-blur-blur border-b border-white/10 shadow-xl">
          <div className="container mx-auto px-4 py-4 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center space-x-3 w-full px-4 py-3 rounded-lg font-medium transition-all duration-200",
                    pathname === item.href
                      ? "text-blur-orange bg-blur-orange/10 border border-blur-orange/20"
                      : "text-blur-text-secondary hover:text-blur-orange hover:bg-blur-orange/5"
                  )}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
            
            {/* Mobile Search */}
            <div className="pt-4 border-t border-white/10">
              <Button
                variant="ghost"
                className="w-full justify-start space-x-3 text-blur-text-secondary hover:text-blur-orange"
              >
                <Search className="w-5 h-5" />
                <span>Search Markets</span>
              </Button>
            </div>

            {/* Mobile Settings */}
            <Button
              variant="ghost"
              className="w-full justify-start space-x-3 text-blur-text-secondary hover:text-blur-orange"
            >
              <Settings className="w-5 h-5" />
              <span>Settings</span>
            </Button>
          </div>
        </div>
      )}
    </nav>
  )
}
