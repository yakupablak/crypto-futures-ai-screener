"use client";

import Link from "next/link";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const isFirestoreDisabled =
    error.message.includes("Cloud Firestore API has not been used") ||
    error.message.includes("SERVICE_DISABLED");

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-10">
      <Card className="max-w-2xl p-8">
        <p className="text-xs uppercase tracking-[0.24em] text-accent">Runtime Error</p>
        <h2 className="mt-4 text-3xl font-semibold text-text">
          {isFirestoreDisabled
            ? "Firestore henuz aktif degil"
            : "Canli runtime su anda baslatilamadi"}
        </h2>
        <p className="mt-4 leading-7 text-muted">
          {isFirestoreDisabled
            ? "Firebase projectin icin Cloud Firestore API kapali oldugu icin uygulama canli veri durumuna gecemiyor. Firestore API'yi aktif ettiginde mevcut lokal kurulumla devam edecegiz."
            : error.message}
        </p>
        {isFirestoreDisabled ? (
          <div className="mt-6 space-y-3 text-sm text-muted">
            <p>1. Google Cloud Console icinde Cloud Firestore API'yi enable et.</p>
            <p>2. Firebase Console icinde Firestore Database olustur.</p>
            <p>3. Sonra sayfayi yeniden yukle veya local worker'i tekrar baslat.</p>
            <Link
              href="https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=ctypto-8399b"
              target="_blank"
              className="inline-block text-accent underline underline-offset-4"
            >
              Firestore API acma sayfasini ac
            </Link>
          </div>
        ) : null}
        <div className="mt-6">
          <Button onClick={reset} variant="secondary">
            Tekrar Dene
          </Button>
        </div>
      </Card>
    </div>
  );
}
