"use client";

import { useApp } from "@/lib/store";
import { LoginScreen } from "@/components/hr/login-screen";
import { AppShell } from "@/components/hr/app-shell";
import { QueryProvider } from "@/components/query-provider";

export default function Home() {
  const isAuthed = useApp((s) => s.isAuthed);

  return (
    <QueryProvider>
      {isAuthed ? <AppShell /> : <LoginScreen />}
    </QueryProvider>
  );
}
