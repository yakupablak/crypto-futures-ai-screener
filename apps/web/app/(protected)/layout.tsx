import { AppShell } from "@/components/layout/app-shell";
import { requirePageSession } from "@/lib/auth/server";

export default async function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await requirePageSession();

  return <AppShell username={session.username}>{children}</AppShell>;
}
