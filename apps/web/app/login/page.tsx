import { LoginForm } from "@/components/auth/login-form";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1280px] items-center px-4 py-10 md:px-6 lg:px-8">
      <div className="grid w-full gap-8 lg:grid-cols-[1fr_460px] lg:items-center">
        <div className="space-y-4">
          <p className="text-[11px] uppercase tracking-[0.32em] text-accent">Crypto Futures AI Screener</p>
          <h2 className="max-w-3xl text-4xl font-semibold leading-tight tracking-[-0.04em] text-text md:text-6xl">
            Canli sinyalleri, trade hafizasini ve AI kocunu tek panelde yonet.
          </h2>
          <p className="max-w-2xl text-base leading-8 text-muted">
            Bu panel tek kullanicili production kurulumu icin korunur. Oturum actiktan sonra tum dashboard ve API akislarina erisebilirsin.
          </p>
        </div>

        <LoginForm />
      </div>
    </div>
  );
}
