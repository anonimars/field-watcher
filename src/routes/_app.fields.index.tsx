import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StageBadge } from "@/components/app/StageBadge";
import { StatusBadge } from "@/components/app/StatusBadge";
import { EmptyState } from "@/components/app/EmptyState";
import { Plus, Eye, Trash2, Download } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const Route = createFileRoute("/_app/fields/")({
  component: FieldsList,
});

interface FieldRow {
  id: string;
  name: string;
  crop_type: string;
  planting_date: string;
  stage: string;
  status: string;
  assigned_agent_id: string | null;
  updated_at: string;
}

function FieldsList() {
  const { profile } = useAuth();
  const isCoord = profile?.role === "coordinator";
  const navigate = useNavigate();
  const [rows, setRows] = useState<FieldRow[]>([]);
  const [agents, setAgents] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("fields").select("*").order("created_at", { ascending: false });
    setRows((data ?? []) as FieldRow[]);
    const { data: ps } = await supabase.from("profiles").select("id,name");
    setAgents(Object.fromEntries((ps ?? []).map((p) => [p.id, p.name])));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this field?")) return;
    const { error } = await supabase.from("fields").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Field deleted"); load(); }
  };

  const handleDownloadPdf = () => {
    if (rows.length === 0) {
      toast.error("No fields to export");
      return;
    }
    const doc = new jsPDF({ orientation: "landscape" });
    const title = isCoord ? "All Fields" : "My Fields";
    doc.setFontSize(16);
    doc.text("SmartSeason — " + title, 14, 15);
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(`Generated ${format(new Date(), "MMM d, yyyy HH:mm")} • ${rows.length} field(s)`, 14, 22);

    const head = [[
      "Field", "Crop", "Planted",
      ...(isCoord ? ["Agent"] : []),
      "Stage", "Status", "Updated",
    ]];
    const body = rows.map((r) => [
      r.name,
      r.crop_type,
      format(new Date(r.planting_date), "MMM d, yyyy"),
      ...(isCoord ? [r.assigned_agent_id ? (agents[r.assigned_agent_id] ?? "—") : "Unassigned"] : []),
      r.stage,
      r.status,
      format(new Date(r.updated_at), "MMM d, yyyy HH:mm"),
    ]);

    autoTable(doc, {
      head,
      body,
      startY: 28,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [34, 139, 34] },
    });

    doc.save(`smartseason-fields-${format(new Date(), "yyyy-MM-dd")}.pdf`);
    toast.success("PDF downloaded");
  };

  if (loading) return <div className="text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{isCoord ? "All Fields" : "My Fields"}</h1>
          <p className="text-sm text-muted-foreground">{rows.length} field{rows.length === 1 ? "" : "s"}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDownloadPdf} disabled={rows.length === 0}>
            <Download className="w-4 h-4 mr-1" /> Download PDF
          </Button>
          {isCoord && (
            <Button onClick={() => navigate({ to: "/fields/new" })}>
              <Plus className="w-4 h-4 mr-1" /> New Field
            </Button>
          )}
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title={isCoord ? "No fields yet" : "You have no assigned fields yet"}
          description={isCoord ? "Create your first field to get started." : "Your coordinator will assign you fields soon."}
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Field</th>
                  <th className="px-4 py-3 font-medium">Crop</th>
                  <th className="px-4 py-3 font-medium">Planted</th>
                  {isCoord && <th className="px-4 py-3 font-medium">Agent</th>}
                  <th className="px-4 py-3 font-medium">Stage</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Updated</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{r.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.crop_type}</td>
                    <td className="px-4 py-3 text-muted-foreground">{format(new Date(r.planting_date), "MMM d, yyyy")}</td>
                    {isCoord && (
                      <td className="px-4 py-3">
                        {r.assigned_agent_id ? (
                          agents[r.assigned_agent_id] ?? "—"
                        ) : (
                          <span className="text-orange-600 font-medium">Unassigned</span>
                        )}
                      </td>
                    )}
                    <td className="px-4 py-3"><StageBadge stage={r.stage} /></td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{format(new Date(r.updated_at), "MMM d, HH:mm")}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-1">
                        <Link to="/fields/$id" params={{ id: r.id }}>
                          <Button size="sm" variant="ghost"><Eye className="w-4 h-4" /></Button>
                        </Link>
                        {isCoord && (
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(r.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
