import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-none text-sm font-extrabold tracking-[-0.01em] transition-[background-color,border-color,color,box-shadow,opacity,transform] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A45C] focus-visible:ring-offset-2 focus-visible:ring-offset-background active:translate-y-px disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-[#C9A45C] text-[#1C1612] hover:bg-[#D4B06A] active:bg-[#B8862D]",
        primary:
          "bg-[#C9A45C] text-[#1C1612] hover:bg-[#D4B06A] active:bg-[#B8862D]",
        secondary:
          "border border-[#C9A45C]/70 bg-[#FFFDF8] text-[#2C241C] hover:border-[#C9A45C] hover:bg-white",
        outline:
          "border border-[#C9A45C]/70 bg-transparent text-[#2C241C] hover:bg-[#FFFDF8]",
        tertiary:
          "border border-transparent bg-transparent text-[#2C241C] hover:bg-[#2C241C]/06",
        ghost: "hover:bg-[#2C241C]/06 hover:text-[#2C241C]",
        link: "text-[#8B6220] underline-offset-4 hover:underline",
        destructive:
          "border border-[#C45C5C] bg-[#FFF5F5] text-[#8B1E1E] hover:bg-[#FFE8E8] focus-visible:ring-[#C45C5C]",
        danger:
          "border border-[#C45C5C] bg-[#FFF5F5] text-[#8B1E1E] hover:bg-[#FFE8E8] focus-visible:ring-[#C45C5C]",
      },
      size: {
        default: "h-12 min-h-12 min-w-[44px] px-7 py-3",
        sm: "h-11 min-h-11 min-w-[44px] px-5 py-2.5 text-sm",
        lg: "h-[52px] min-h-[52px] min-w-[44px] px-9 py-3.5 text-base",
        icon: "h-11 w-11 min-h-[44px] min-w-[44px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size }), loading && "cursor-wait opacity-70", className)}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading ? (
          <>
            <span
              className="inline-block h-4 w-4 animate-spin rounded-none border-2 border-current border-r-transparent"
              aria-hidden
            />
            <span>{children}</span>
          </>
        ) : (
          children
        )}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
