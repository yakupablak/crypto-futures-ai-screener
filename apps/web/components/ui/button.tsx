import * as React from "react";

import { cn } from "@/lib/utils";

const variants = {
  primary:
    "border-accent/60 bg-accent text-[#1b120a] shadow-[0_16px_40px_rgba(255,154,71,0.18)] hover:-translate-y-0.5 hover:brightness-110 focus-visible:ring-accent/40",
  secondary:
    "border-white/10 bg-accentSoft text-text hover:-translate-y-0.5 hover:border-accent/40 hover:bg-[#182838] focus-visible:ring-accent/30",
  ghost:
    "border-white/5 bg-transparent text-text hover:border-white/10 hover:bg-white/5 focus-visible:ring-accent/30",
  danger: "border-danger/60 bg-danger text-white hover:-translate-y-0.5 hover:brightness-110 focus-visible:ring-danger/40",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
}

export function Button({
  className,
  variant = "primary",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center rounded-[18px] border px-4 py-2.5 text-sm font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
