'use client'

import { MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useChatContext, ChartContext } from '@/lib/contexts/ChatContextProvider'
import { cn } from '@/lib/utils'

interface AskAIButtonProps {
  context: ChartContext
  question?: string
  variant?: 'default' | 'icon' | 'outline'
  size?: 'sm' | 'default' | 'lg' | 'icon'
  className?: string
}

export function AskAIButton({
  context,
  question,
  variant = 'default',
  size = 'sm',
  className
}: AskAIButtonProps) {
  const { addContextAndOpenChat } = useChatContext()

  const handleClick = () => {
    addContextAndOpenChat(context, question)
  }

  if (variant === 'icon') {
    return (
      <Button
        onClick={handleClick}
        size="icon"
        variant="outline"
        className={cn(
          'h-8 w-8 border-[var(--blur-orange)]/30 hover:border-[var(--blur-orange)] hover:bg-[var(--blur-orange)]/10 transition-all',
          className
        )}
        title={question || 'Ask AI about this chart'}
      >
        <MessageSquare className="h-4 w-4 text-[var(--blur-orange)]" />
      </Button>
    )
  }

  return (
    <Button
      onClick={handleClick}
      size={size}
      variant={variant === 'outline' ? 'outline' : 'default'}
      className={cn(
        variant === 'outline'
          ? 'border-[var(--blur-orange)]/30 hover:border-[var(--blur-orange)] hover:bg-[var(--blur-orange)]/10 text-[var(--blur-orange)]'
          : 'bg-gradient-to-br from-[var(--blur-orange)] to-[var(--blur-orange-bright)] hover:shadow-lg hover:shadow-[var(--blur-orange)]/20',
        'transition-all',
        className
      )}
    >
      <MessageSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
      Ask AI
    </Button>
  )
}
