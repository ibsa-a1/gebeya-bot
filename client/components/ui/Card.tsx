import { HTMLAttributes } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-xl border border-border bg-card shadow-[0_1px_2px_rgba(28,30,38,0.04),0_4px_12px_rgba(28,30,38,0.04)] ${className}`}
      {...props}
    />
  );
}
