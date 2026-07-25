import { forwardRef } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "destructive";
type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  asChild?: boolean;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-[#800020] text-white hover:bg-[#66001A] focus-visible:ring-[#800020]",
  secondary:
    "bg-[#FFF0E8] text-[#1C1C1C] hover:bg-[#F5E0D0] focus-visible:ring-[#800020]",
  outline:
    "border border-[#1C1C1C] text-[#1C1C1C] bg-transparent hover:bg-[#FFF0E8] focus-visible:ring-[#800020]",
  ghost:
    "text-[#6B6B6B] hover:bg-[#FFF0E8] hover:text-[#1C1C1C] focus-visible:ring-[#800020]",
  destructive:
    "bg-[#C41E3A] text-white hover:bg-[#A03024] focus-visible:ring-[#C41E3A]",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      fullWidth = false,
      asChild = false,
      className,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const Component = asChild ? Slot : "button";

    return (
      <Component
        ref={ref}
        disabled={asChild ? undefined : disabled || loading}
        aria-disabled={disabled || loading || undefined}
        className={cn(
          "inline-flex items-center justify-center gap-2",
          "rounded font-medium tracking-wide",
          "transition-colors duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          "disabled:pointer-events-none disabled:opacity-50",
          variantClasses[variant],
          sizeClasses[size],
          fullWidth && "w-full",
          className
        )}
        {...props}
      >
        {asChild ? (
          children
        ) : (
          <>
            {loading && (
              <svg
                className="h-4 w-4 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            )}
            {children}
          </>
        )}
      </Component>
    );
  }
);

Button.displayName = "Button";