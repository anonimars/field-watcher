import { type ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { useAuth } from "@/lib/auth";

export function AppShell({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-border bg-card px-6 flex items-center justify-between sticky top-0 z-10">
          <div className="font-semibold text-foreground">SmartSeason</div>
          <div className="text-sm text-muted-foreground">Welcome, {profile?.name}</div>
        </header>
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
