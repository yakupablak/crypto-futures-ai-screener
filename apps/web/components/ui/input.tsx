import * as React from "react";

import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "w-full rounded-[20px] border border-white/10 bg-black/20 px-4 py-3 text-sm text-text outline-none transition placeholder:text-muted focus:border-accent/60 focus:ring-4 focus:ring-[color:var(--color-focus)]",
        className,
      )}
      {...props}
    />
  ),
);

Input.displayName = "Input";
