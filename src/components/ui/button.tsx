import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-[14px] font-bold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[2px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground rounded-[14px] shadow-soft glow-coral hover:-translate-y-0.5 hover:shadow-card active:neu-pressed active:translate-y-0",
        destructive:
          "bg-destructive text-white rounded-[14px] shadow-soft hover:-translate-y-0.5 hover:shadow-card active:neu-pressed",
        outline:
          "bg-card text-foreground rounded-[14px] border border-border/40 shadow-soft hover:bg-muted/80 hover:-translate-y-0.5 active:neu-pressed",
        secondary:
          "bg-secondary text-secondary-foreground rounded-[14px] shadow-soft hover:brightness-95 hover:-translate-y-0.5 active:neu-pressed",
        ghost:
          "rounded-[14px] hover:bg-muted/60 hover:text-foreground font-semibold",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-5 py-2 has-[>svg]:px-4",
        sm: "h-8 rounded-[10px] gap-1.5 px-3 has-[>svg]:px-2.5 text-xs",
        lg: "h-12 rounded-[16px] px-8 has-[>svg]:px-6 text-base",
        icon: "size-10 rounded-[14px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
