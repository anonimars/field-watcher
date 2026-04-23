import { createFileRoute, Navigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/app/EmptyState";
import { User, Mail, Sprout } from "lucide-react";
import { format } from "date-fns";

export const Route = createFileRoute("/_app/agents")({
  component: AgentsPage,
});

interface AgentInfo {
  id: string;
  name: string;
  email: string;
  fieldCount: number;
  lastActivity: string | null;
  fields: { id: string; name: string }[];
}

function AgentsPage() {
  const { profile } = useAuth();
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "field_agent");
      const ids = (roles ?? []).map((r) => r.user_id);
      if (ids.length === 0) { setLoading(false); return; }

      const [{ data: profs }, { data: fields }, { data: updates }] = await Promise.all([
        supabase.from("profiles").select("id,name,email").in("id", ids),
        supabase.from("fields").select("id,name,assigned_agent_id").in("assigned_agent_id", ids),
        supabase.from("field_updates").select("agent_id,created_at").in("agent_id", ids).order("created_at", { ascending: false }),
      ]);

      const lastByAgent: Record<string, string> = {};
      (updates ?? []).forEach((u) => {
        if (!lastByAgent[u.agent_id]) lastByAgent[u.agent_id] = u.created_at;
      });

      setAgents((profs ?? []).map((p) => {
        const myFields = (fields ?? []).filter((f) => f.assigned_agent_id === p.id);
        return {
          id: p.id, name: p.name, email: p.email,
          fieldCount: myFields.length,
          fields: myFields.map((f) => ({ id: f.id, name: f.name })),
          lastActivity: lastByAgent[p.id] ?? null,
        };
      }));
      setLoading(false);
    })();
  }, []);

  if (profile && profile.role !== "coordinator") return <Navigate to="/dashboard" />;
  if (loading) return <div className="text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Field Agents</h1>
      {agents.length === 0 ? (
        <EmptyState title="No agents yet" description="Agents will appear once they register." />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {agents.map((a) => (
            <Card key={a.id} className="cursor-pointer" onClick={() => setOpenId(openId === a.id ? null : a.id)}>
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold">{a.name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Mail className="w-3 h-3" /> {a.email}
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-sm">
                      <span className="inline-flex items-center gap-1">
                        <Sprout className="w-4 h-4 text-primary" /> {a.fieldCount} field{a.fieldCount === 1 ? "" : "s"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Last activity: {a.lastActivity ? format(new Date(a.lastActivity), "MMM d") : "—"}
                      </span>
                    </div>
                    {openId === a.id && a.fields.length > 0 && (
                      <ul className="mt-3 space-y-1 text-sm">
                        {a.fields.map((f) => (
                          <li key={f.id}>
                            <Link to="/fields/$id" params={{ id: f.id }} className="text-primary hover:underline">
                              · {f.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
