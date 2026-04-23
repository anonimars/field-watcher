import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { StatCard } from "@/components/app/StatCard";
import { EmptyState } from "@/components/app/EmptyState";
import { StageBadge } from "@/components/app/StageBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sprout, CheckCircle2, AlertTriangle, Activity, UserX } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { timeAgo } from "@/lib/status-utils";

export const Route = createFileRoute("/_app/dashboard")({
  component: DashboardPage,
});

interface FieldRow {
  id: string;
  name: string;
  status: string;
  stage: string;
  assigned_agent_id: string | null;
}
interface UpdateRow {
  id: string;
  field_id: string;
  agent_id: string;
  new_stage: string;
  notes: string | null;
  created_at: string;
}

function DashboardPage() {
  const { profile } = useAuth();
  const isCoord = profile?.role === "coordinator";
  const [fields, setFields] = useState<FieldRow[]>([]);
  const [updates, setUpdates] = useState<UpdateRow[]>([]);
  const [profMap, setProfMap] = useState<Record<string, string>>({});
  const [fieldMap, setFieldMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: f } = await supabase.from("fields").select("id,name,status,stage,assigned_agent_id");
      const fRows = (f ?? []) as FieldRow[];
      setFields(fRows);
      setFieldMap(Object.fromEntries(fRows.map((x) => [x.id, x.name])));

      const limit = isCoord ? 10 : 5;
      const { data: u } = await supabase
        .from("field_updates")
        .select("id,field_id,agent_id,new_stage,notes,created_at")
        .order("created_at", { ascending: false })
        .limit(limit);
      setUpdates((u ?? []) as UpdateRow[]);

      const { data: p } = await supabase.from("profiles").select("id,name");
      setProfMap(Object.fromEntries((p ?? []).map((x) => [x.id, x.name])));
      setLoading(false);
    })();
  }, [isCoord]);

  if (loading) return <div className="text-muted-foreground">Loading…</div>;

  const total = fields.length;
  const active = fields.filter((f) => f.status === "Active").length;
  const atRisk = fields.filter((f) => f.status === "At Risk").length;
  const completed = fields.filter((f) => f.status === "Completed").length;
  const unassigned = fields.filter((f) => !f.assigned_agent_id).length;

  const chartData = [
    { name: "Active", value: active, color: "oklch(0.55 0.15 145)" },
    { name: "At Risk", value: atRisk, color: "oklch(0.55 0.21 25)" },
    { name: "Completed", value: completed, color: "oklch(0.65 0.05 130)" },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{isCoord ? "Coordinator Dashboard" : "My Fields Dashboard"}</h1>
        <p className="text-muted-foreground text-sm">Welcome, {profile?.name}</p>
      </div>

      {!isCoord && total === 0 ? (
        <EmptyState
          title="No fields assigned yet"
          description="Your coordinator will assign fields to you soon. Check back later."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label={isCoord ? "Total Fields" : "My Fields"} value={total} icon={Sprout} />
            <StatCard label="Active" value={active} icon={Activity} tone="success" />
            <StatCard label="At Risk" value={atRisk} icon={AlertTriangle} tone="danger" />
            <StatCard label="Completed" value={completed} icon={CheckCircle2} tone="muted" />
          </div>

          {isCoord && (
            <StatCard label="Unassigned Fields" value={unassigned} icon={UserX} tone={unassigned > 0 ? "warning" : "muted"} />
          )}

          <div className="grid lg:grid-cols-2 gap-6">
            {chartData.length > 0 && (
              <Card>
                <CardHeader><CardTitle>Status Breakdown</CardTitle></CardHeader>
                <CardContent style={{ height: 280 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={chartData} dataKey="value" nameKey="name" outerRadius={90} label>
                        {chartData.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader><CardTitle>Recent Updates</CardTitle></CardHeader>
              <CardContent className="space-y-3 max-h-80 overflow-auto">
                {updates.length === 0 && <p className="text-sm text-muted-foreground">No updates yet.</p>}
                {updates.map((u) => (
                  <Link key={u.id} to="/fields/$id" params={{ id: u.field_id }}
                    className="block p-3 rounded-md border border-border hover:bg-muted transition">
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-medium text-sm">{fieldMap[u.field_id] ?? "Field"}</div>
                      <StageBadge stage={u.new_stage} />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      by {profMap[u.agent_id] ?? "—"} · {timeAgo(u.created_at)}
                    </div>
                    {u.notes && <p className="text-xs mt-1 line-clamp-1 text-foreground/80">{u.notes}</p>}
                  </Link>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
