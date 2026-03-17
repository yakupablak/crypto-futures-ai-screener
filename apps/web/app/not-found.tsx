import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <Card className="max-w-xl p-8 text-center">
        <p className="text-xs uppercase tracking-[0.24em] text-accent">404</p>
        <h1 className="mt-4 text-3xl font-semibold text-text">Aradığın sinyal bulunamadı.</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          Link eski olabilir veya mock/live veri kaynağında ilgili kayıt artık yoktur.
        </p>
        <Link href="/" className="mt-6 inline-block">
          <Button>Dashboard'a dön</Button>
        </Link>
      </Card>
    </div>
  );
}
