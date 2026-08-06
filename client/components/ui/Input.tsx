import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, id, className = "", ...props }, ref) => {
    const inputId = id ?? props.name;
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-ink">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`rounded-lg border bg-card px-3.5 py-2.5 text-sm text-ink placeholder:text-ink/40
            transition-colors duration-150
            focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo focus:border-indigo
            ${error ? "border-signal-red" : "border-border"} ${className}`}
          aria-invalid={!!error}
          {...props}
        />
        {error && <p className="text-xs text-signal-red">{error}</p>}
      </div>
    );
  },
);
Input.displayName = "Input";
