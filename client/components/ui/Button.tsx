import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-gold text-ink hover:bg-gold-dark active:bg-gold-dark disabled:bg-gold/50",
  secondary:
    "bg-indigo text-white hover:bg-indigo-light active:bg-indigo-light disabled:bg-indigo/50",
  ghost:
    "bg-transparent text-ink border border-border hover:bg-black/[0.03] disabled:opacity-50",
  danger:
    "bg-signal-red text-white hover:bg-signal-red/90 disabled:bg-signal-red/50",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", loading, disabled, className = "", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium
          transition-colors duration-150 ease-out
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo
          disabled:cursor-not-allowed
          ${variantClasses[variant]} ${className}`}
        {...props}
      >
        {loading && (
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";
