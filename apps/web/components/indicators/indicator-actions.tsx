"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";

export function ApproveProposalButton({ proposalId }: { proposalId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="secondary"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          await fetch(`/api/indicator-proposals/${proposalId}/approve`, {
            method: "POST",
          });
          router.refresh();
        });
      }}
    >
      {isPending ? "Onaylanıyor..." : "Shadow Olarak Ekle"}
    </Button>
  );
}

export function ToggleIndicatorButton({ indicatorId }: { indicatorId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          await fetch(`/api/indicator-catalog/${indicatorId}/toggle`, {
            method: "POST",
          });
          router.refresh();
        });
      }}
    >
      {isPending ? "Güncelleniyor..." : "Durumu Değiştir"}
    </Button>
  );
}
