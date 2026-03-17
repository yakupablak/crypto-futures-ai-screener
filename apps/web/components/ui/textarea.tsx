import * as React from "react";

import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "min-h-28 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-text outline-none transition placeholder:text-muted focus:border-accent/60 focus:ring-4 focus:ring-[color:var(--color-focus)]",
      className,
    )}
    {...props}
  />
));

Textarea.displayName = "Textarea";
