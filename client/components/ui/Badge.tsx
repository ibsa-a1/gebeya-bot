import { HTMLAttributes } from "react";

type Tone = "neutral" | "gold" | "green" | "red" | "indigo";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-ink/5 text-ink/70",
  gold: "bg-gold/15 text-gold-dark",
  green: "bg-market-green/10 text-market-green",
  red: "bg-signal-red/10 text-signal-red",
  indigo: "bg-indigo/10 text-indigo",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

export function Badge({ tone = "neutral", className = "", ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${toneClasses[tone]} ${className}`}
      {...props}
    />
  );
}
