import { createFileRoute, useNavigate, Link, Navigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_app/fields/new")({
  component: NewFieldPage,
});

function NewFieldPage() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [cropType, setCropType] = useState("");
  const [plantingDate, setPlantingDate] = useState("");
  const [agentId, setAgentId] = useState<string>("none");
  const [agents, setAgents] = useState<{ id: string; name: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "field_agent");
      const ids = (roles ?? []).map((r) => r.user_id);
      if (ids.length === 0) return;
      const { data } = await supabase.from("profiles").select("id,name").in("id", ids);
      setAgents((data ?? []).map((d) => ({ id: d.id, name: d.name })));
    })();
  }, []);

  if (profile && profile.role !== "coordinator") return <Navigate to="/dashboard" />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    const { error } = await supabase.from("fields").insert({
      name, crop_type: cropType, planting_date: plantingDate,
      assigned_agent_id: agentId === "none" ? null : agentId,
      created_by: user.id,
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Field created");
    navigate({ to: "/fields" });
  };

  return (
    <div className="max-w-xl">
      <Link to="/fields" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to fields
      </Link>
      <Card>
        <CardHeader><CardTitle>New Field</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Field name</Label>
              <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="crop">Crop type</Label>
              <Input id="crop" required value={cropType} onChange={(e) => setCropType(e.target.value)} placeholder="e.g. Corn (Pioneer 1197)" />
            </div>
            <div>
              <Label htmlFor="date">Planting date</Label>
              <Input id="date" type="date" required value={plantingDate} onChange={(e) => setPlantingDate(e.target.value)} />
            </div>
            <div>
              <Label>Assign agent (optional)</Label>
              <Select value={agentId} onValueChange={setAgentId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {agents.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={submitting}>{submitting ? "Creating…" : "Create Field"}</Button>
              <Button type="button" variant="outline" onClick={() => navigate({ to: "/fields" })}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
