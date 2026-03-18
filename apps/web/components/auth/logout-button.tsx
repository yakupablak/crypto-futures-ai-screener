"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      className="w-full"
      variant="ghost"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          await fetch("/api/auth/logout", {
            method: "POST",
          });
          router.push("/login");
          router.refresh();
        });
      }}
      title="Gecerli oturumu kapatir."
    >
      {isPending ? "Cikis yapiliyor..." : "Cikis yap"}
    </Button>
  );
}
