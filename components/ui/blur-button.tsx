import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const blurButtonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-blur text-xs sm:text-sm font-bold uppercase tracking-wide ring-offset-background transition-all duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-blur-orange text-blur-bg-primary hover:bg-blur-orange-bright shadow-blur-glow hover:shadow-blur-glow",
        outline: "border border-blur-orange text-blur-orange hover:bg-blur-orange/10",
        ghost: "text-blur-text-secondary hover:text-blur-orange hover:bg-blur-orange/5",
        secondary: "bg-blur-bg-tertiary text-blur-text-primary border border-white/8 hover:border-white/12 hover:bg-blur-bg-tertiary/80",
      },
      size: {
        sm: "h-8 px-3",
        md: "h-10 px-4",
        lg: "h-12 px-6",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
)

export interface BlurButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof blurButtonVariants> {
  asChild?: boolean
}

const BlurButton = React.forwardRef<HTMLButtonElement, BlurButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(blurButtonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
BlurButton.displayName = "BlurButton"

export { BlurButton, blurButtonVariants }
