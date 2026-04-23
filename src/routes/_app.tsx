import { createFileRoute, Outlet, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/app/AppShell";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const { user, loading, profile } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  if (!user) return <Navigate to="/login" />;
  if (!profile) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading profile…</div>;
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
