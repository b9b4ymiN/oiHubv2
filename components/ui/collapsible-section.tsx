'use client'

import { useState, ReactNode } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CollapsibleSectionProps {
  title: string
  icon?: string
  badge?: string
  defaultOpen?: boolean
  children: ReactNode
  priority?: 'high' | 'medium' | 'low'
}

export function CollapsibleSection({
  title,
  icon,
  badge,
  defaultOpen = true,
  children,
  priority = 'medium',
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  const priorityColors = {
    high: 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20',
    medium: 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20',
    low: 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/20',
  }

  return (
    <div className={cn('rounded-lg border-2 overflow-hidden', priorityColors[priority])}>
      {/* Header - Always visible, clickable */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-3 sm:p-4 flex items-center justify-between hover:opacity-80 transition-opacity"
      >
        <div className="flex items-center gap-2">
          {icon && <span className="text-base sm:text-xl">{icon}</span>}
          <h3 className="text-sm sm:text-lg font-bold text-gray-900 dark:text-gray-100 text-left">
            {title}
          </h3>
          {badge && (
            <span className="px-2 py-0.5 text-[10px] sm:text-xs font-semibold bg-red-500 text-white rounded">
              {badge}
            </span>
          )}
        </div>
        <div className="flex-shrink-0">
          {isOpen ? (
            <ChevronUp className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-500" />
          )}
        </div>
      </button>

      {/* Content - Collapsible */}
      {isOpen && (
        <div className="px-3 pb-3 sm:px-4 sm:pb-4 space-y-3">
          {children}
        </div>
      )}
    </div>
  )
}
