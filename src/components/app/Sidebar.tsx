import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, Sprout, Users, LogOut, Leaf } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function Sidebar() {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isCoord = profile?.role === "coordinator";

  const links = isCoord
    ? [
        { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { to: "/fields", label: "Fields", icon: Sprout },
        { to: "/agents", label: "Agents", icon: Users },
      ]
    : [
        { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { to: "/fields", label: "My Fields", icon: Sprout },
      ];

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  return (
    <aside className="w-64 shrink-0 bg-card border-r border-border flex flex-col h-screen sticky top-0">
      <div className="p-5 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
            <Leaf className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <div className="font-bold text-foreground leading-tight">SmartSeason</div>
            <div className="text-xs text-muted-foreground">Field Monitoring</div>
          </div>
        </div>
      </div>

      <div className="p-4 border-b border-border">
        <div className="text-xs text-muted-foreground mb-1">Logged in as</div>
        <div className="font-medium text-sm truncate">{profile?.name ?? "…"}</div>
        <Badge variant="secondary" className="mt-2 capitalize">
          {profile?.role?.replace("_", " ") ?? "—"}
        </Badge>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {links.map((l) => {
          const active = location.pathname === l.to || (l.to !== "/dashboard" && location.pathname.startsWith(l.to));
          const Icon = l.icon;
          return (
            <Link
              key={l.to}
              to={l.to}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition ${
                active ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
              }`}
            >
              <Icon className="w-4 h-4" />
              {l.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-border">
        <Button variant="outline" className="w-full" onClick={handleSignOut}>
          <LogOut className="w-4 h-4 mr-2" /> Sign Out
        </Button>
      </div>
    </aside>
  );
}
