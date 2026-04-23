import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StageBadge } from "@/components/app/StageBadge";
import { StatusBadge } from "@/components/app/StatusBadge";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { timeAgo } from "@/lib/status-utils";

export const Route = createFileRoute("/_app/fields/$id")({
  component: FieldDetail,
});

interface Field {
  id: string;
  name: string;
  crop_type: string;
  planting_date: string;
  stage: string;
  status: string;
  assigned_agent_id: string | null;
}
interface Update {
  id: string;
  agent_id: string;
  previous_stage: string | null;
  new_stage: string;
  notes: string | null;
  created_at: string;
}

function FieldDetail() {
  const { id } = Route.useParams();
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const isCoord = profile?.role === "coordinator";

  const [field, setField] = useState<Field | null>(null);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [profMap, setProfMap] = useState<Record<string, string>>({});
  const [agents, setAgents] = useState<{ id: string; name: string }[]>([]);
  const [stage, setStage] = useState("Planted");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data: f } = await supabase.from("fields").select("*").eq("id", id).maybeSingle();
    if (!f) { setLoading(false); return; }
    setField(f as Field);
    setStage(f.stage);
    const { data: u } = await supabase.from("field_updates").select("*").eq("field_id", id).order("created_at", { ascending: false });
    setUpdates((u ?? []) as Update[]);
    const { data: p } = await supabase.from("profiles").select("id,name");
    setProfMap(Object.fromEntries((p ?? []).map((x) => [x.id, x.name])));
    if (isCoord) {
      const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "field_agent");
      const ids = (roles ?? []).map((r) => r.user_id);
      if (ids.length) {
        const { data: ag } = await supabase.from("profiles").select("id,name").in("id", ids);
        setAgents((ag ?? []).map((x) => ({ id: x.id, name: x.name })));
      }
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id, isCoord]);

  const submitUpdate = async (e: FormEvent) => {
    e.preventDefault();
    if (!field || !user) return;
    setSubmitting(true);
    const { error } = await supabase.from("field_updates").insert({
      field_id: field.id, agent_id: user.id,
      previous_stage: field.stage, new_stage: stage, notes: notes || null,
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Update submitted");
    setNotes("");
    load();
  };

  const reassign = async (newAgent: string) => {
    if (!field) return;
    const { error } = await supabase.from("fields").update({
      assigned_agent_id: newAgent === "none" ? null : newAgent,
    }).eq("id", field.id);
    if (error) toast.error(error.message);
    else { toast.success("Agent updated"); load(); }
  };

  if (loading) return <div className="text-muted-foreground">Loading…</div>;
  if (!field) return <div className="text-muted-foreground">Field not found.</div>;

  const canUpdate = !isCoord && field.assigned_agent_id === user?.id;
  const isAgentNotAssigned = !isCoord && field.assigned_agent_id !== user?.id;

  return (
    <div className="space-y-6 max-w-4xl">
      <Link to="/fields" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back
      </Link>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">{field.name}</CardTitle>
            <div className="flex gap-2">
              <StageBadge stage={field.stage} />
              <StatusBadge status={field.status} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4 text-sm">
          <div><span className="text-muted-foreground">Crop:</span> <span className="font-medium">{field.crop_type}</span></div>
          <div><span className="text-muted-foreground">Planted:</span> <span className="font-medium">{format(new Date(field.planting_date), "PPP")}</span></div>
          <div className="sm:col-span-2">
            <span className="text-muted-foreground">Assigned agent:</span>{" "}
            {isCoord ? (
              <Select value={field.assigned_agent_id ?? "none"} onValueChange={reassign}>
                <SelectTrigger className="inline-flex w-auto min-w-[200px] mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {agents.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <span className="font-medium">{field.assigned_agent_id ? profMap[field.assigned_agent_id] : "Unassigned"}</span>
            )}
          </div>
        </CardContent>
      </Card>

      {canUpdate && (
        <Card>
          <CardHeader><CardTitle>Submit Update</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={submitUpdate} className="space-y-3">
              <div>
                <Label>Stage</Label>
                <Select value={stage} onValueChange={setStage}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Planted", "Growing", "Ready", "Harvested"].map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add observations..." rows={3} />
                <p className="text-xs text-muted-foreground mt-1">
                  Tip: mentioning keywords like <em>pest</em>, <em>drought</em> or <em>disease</em> will automatically flag this field as At Risk.
                </p>
              </div>
              <Button type="submit" disabled={submitting}>{submitting ? "Submitting…" : "Submit Update"}</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {isAgentNotAssigned && (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            You can only submit updates for fields assigned to you. Ask a coordinator to assign this field to you.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Update History</CardTitle></CardHeader>
        <CardContent>
          {updates.length === 0 ? (
            <p className="text-sm text-muted-foreground">No updates yet.</p>
          ) : (
            <ol className="space-y-3">
              {updates.map((u) => (
                <li key={u.id} className="border-l-2 border-primary pl-4 pb-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">{profMap[u.agent_id] ?? "Agent"}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">{timeAgo(u.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-1 text-xs">
                    {u.previous_stage && <><StageBadge stage={u.previous_stage} /><ArrowRight className="w-3 h-3 text-muted-foreground" /></>}
                    <StageBadge stage={u.new_stage} />
                  </div>
                  {u.notes && <p className="text-sm mt-1 text-foreground/80">{u.notes}</p>}
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
