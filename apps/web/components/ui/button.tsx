import * as React from "react";

import { cn } from "@/lib/utils";

const variants = {
  primary:
    "bg-accent text-[#1b120a] hover:brightness-110 focus-visible:ring-accent/40",
  secondary:
    "bg-accentSoft text-text hover:border-accent/50 hover:bg-[#172330] focus-visible:ring-accent/30",
  ghost:
    "bg-transparent text-text hover:bg-white/5 focus-visible:ring-accent/30",
  danger: "bg-danger text-white hover:brightness-110 focus-visible:ring-danger/40",
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
        "inline-flex items-center justify-center rounded-full border border-transparent px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
