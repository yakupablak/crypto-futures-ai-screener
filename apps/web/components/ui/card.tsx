import type { PropsWithChildren } from "react";

import { cn } from "@/lib/utils";

export function Card({
  children,
  className,
}: PropsWithChildren<{ className?: string }>) {
  return (
    <div
      className={cn(
        "glass-panel relative rounded-[32px] shadow-panel",
        className,
      )}
    >
      {children}
    </div>
  );
}
