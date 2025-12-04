import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-blur text-sm font-bold uppercase tracking-wide transition-all duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blur-orange focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover-lift",
  {
    variants: {
      variant: {
        default: "bg-blur-orange text-blur-bg-primary hover:bg-blur-orange-bright shadow-blur-glow hover:shadow-blur-glow-lg",
        destructive:
          "bg-blur-red text-white hover:bg-blur-red/90 shadow-lg",
        outline:
          "border border-blur-orange text-blur-orange hover:bg-blur-orange/10 backdrop-blur-blur",
        secondary:
          "bg-blur-bg-tertiary text-blur-text-primary border border-white/8 hover:border-white/12 hover:bg-blur-bg-tertiary/80",
        ghost: "text-blur-text-secondary hover:text-blur-orange hover:bg-blur-orange/5",
        link: "text-blur-orange underline-offset-4 hover:underline hover:text-blur-orange-bright",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3 text-xs",
        lg: "h-12 px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
