import * as React from "react"
import { cn } from "@/lib/utils"

export interface BlurCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'glass' | 'solid' | 'bordered'
  glow?: boolean
}

const BlurCard = React.forwardRef<HTMLDivElement, BlurCardProps>(
  ({ className, variant = 'glass', glow = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-blur transition-all duration-200 ease-in-out",
          {
            // Glass variant - frosted glass effect
            "backdrop-blur-blur bg-blur-bg-secondary/30 border border-white/8 hover:bg-blur-bg-secondary/40":
              variant === 'glass',
            // Solid variant - opaque background
            "bg-blur-bg-secondary border border-white/8 hover:border-white/12":
              variant === 'solid',
            // Bordered variant - minimal style
            "border border-blur-orange/20 hover:border-blur-orange/40":
              variant === 'bordered',
            // Glow effect
            "shadow-blur-glow hover:shadow-blur-glow": glow,
          },
          className
        )}
        {...props}
      />
    )
  }
)
BlurCard.displayName = "BlurCard"

export interface BlurCardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

const BlurCardHeader = React.forwardRef<HTMLDivElement, BlurCardHeaderProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex flex-col space-y-1.5 p-md sm:p-lg", className)}
      {...props}
    />
  )
)
BlurCardHeader.displayName = "BlurCardHeader"

export interface BlurCardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  glow?: boolean
}

const BlurCardTitle = React.forwardRef<HTMLParagraphElement, BlurCardTitleProps>(
  ({ className, glow = false, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn(
        "text-sm sm:text-base font-bold leading-none tracking-tight text-blur-text-primary uppercase",
        {
          "text-glow-orange": glow,
        },
        className
      )}
      {...props}
    />
  )
)
BlurCardTitle.displayName = "BlurCardTitle"

export interface BlurCardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

const BlurCardDescription = React.forwardRef<HTMLParagraphElement, BlurCardDescriptionProps>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn("text-xs sm:text-sm text-blur-text-muted", className)}
      {...props}
    />
  )
)
BlurCardDescription.displayName = "BlurCardDescription"

export interface BlurCardContentProps extends React.HTMLAttributes<HTMLDivElement> {}

const BlurCardContent = React.forwardRef<HTMLDivElement, BlurCardContentProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-md sm:p-lg pt-0", className)} {...props} />
  )
)
BlurCardContent.displayName = "BlurCardContent"

export interface BlurCardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

const BlurCardFooter = React.forwardRef<HTMLDivElement, BlurCardFooterProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-center p-md sm:p-lg pt-0", className)}
      {...props}
    />
  )
)
BlurCardFooter.displayName = "BlurCardFooter"

export {
  BlurCard,
  BlurCardHeader,
  BlurCardFooter,
  BlurCardTitle,
  BlurCardDescription,
  BlurCardContent,
}
