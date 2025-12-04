import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-blur-sm px-2.5 py-0.5 text-[10px] sm:text-xs font-bold uppercase tracking-wide transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blur-orange focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border border-blur-orange/30 bg-blur-orange/10 text-blur-orange hover:bg-blur-orange/20 hover:border-blur-orange/50",
        secondary:
          "border border-white/10 bg-blur-bg-tertiary text-blur-text-secondary hover:bg-blur-bg-tertiary/80 hover:border-white/20",
        destructive:
          "border border-blur-red/30 bg-blur-red/10 text-blur-red hover:bg-blur-red/20 hover:border-blur-red/50",
        outline: "border border-blur-text-muted text-blur-text-primary hover:border-blur-orange hover:text-blur-orange",
        success: "border border-blur-green/30 bg-blur-green/10 text-blur-green hover:bg-blur-green/20 hover:border-blur-green/50",
        warning: "border border-blur-yellow/30 bg-blur-yellow/10 text-blur-yellow hover:bg-blur-yellow/20 hover:border-blur-yellow/50",
        danger: "border border-blur-red/30 bg-blur-red/10 text-blur-red hover:bg-blur-red/20 hover:border-blur-red/50",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
