import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const DEMO_USERS = [
  { email: "coordinator@smartseason.com", password: "coord123", name: "Kriss Quine", role: "coordinator" as const },
  { email: "john@smartseason.com", password: "agent123", name: "John Smith", role: "field_agent" as const },
  { email: "sarah@smartseason.com", password: "agent123", name: "Sarah Johnson", role: "field_agent" as const },
  { email: "newagent@smartseason.com", password: "agent123", name: "New Agent", role: "field_agent" as const },
];

export const seedDemo = createServerFn({ method: "POST" }).handler(async () => {
  const ids: Record<string, string> = {};

  for (const u of DEMO_USERS) {
    // Try to find existing
    const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const existing = list.users.find((x) => x.email === u.email);
    if (existing) {
      ids[u.email] = existing.id;
      // Ensure role row
      await supabaseAdmin.from("user_roles").upsert({ user_id: existing.id, role: u.role }, { onConflict: "user_id,role" });
      await supabaseAdmin.from("profiles").upsert({ id: existing.id, name: u.name, email: u.email });
      continue;
    }
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { name: u.name, role: u.role },
    });
    if (error || !data.user) throw new Error(`Failed creating ${u.email}: ${error?.message}`);
    ids[u.email] = data.user.id;
  }

  const coordinatorId = ids["coordinator@smartseason.com"];
  const johnId = ids["john@smartseason.com"];
  const sarahId = ids["sarah@smartseason.com"];

  // Wipe existing demo fields (by created_by = coordinator) to keep seed idempotent
  await supabaseAdmin.from("fields").delete().eq("created_by", coordinatorId);

  const fieldsSpec = [
    { name: "North Field", crop_type: "Corn (Pioneer 1197)", planting_date: "2026-03-14", stage: "Growing", agent: johnId },
    { name: "South Field", crop_type: "Wheat (Winter Jagger)", planting_date: "2025-10-19", stage: "Ready", agent: johnId },
    { name: "East Field", crop_type: "Soybeans (Asgrow 2734)", planting_date: "2026-03-31", stage: "Growing", agent: sarahId },
    { name: "West Field", crop_type: "Rice (Jasmine)", planting_date: "2026-02-09", stage: "Planted", agent: sarahId },
    { name: "Central Field", crop_type: "Barley (Conlon)", planting_date: "2025-11-04", stage: "Harvested", agent: johnId },
    { name: "Row 11", crop_type: "Cow Peas", planting_date: "2026-04-01", stage: "Planted", agent: null },
  ];

  const insertedFields: { id: string; name: string; agent: string | null; stage: string }[] = [];
  for (const f of fieldsSpec) {
    const { data, error } = await supabaseAdmin
      .from("fields")
      .insert({
        name: f.name,
        crop_type: f.crop_type,
        planting_date: f.planting_date,
        stage: f.stage as "Planted" | "Growing" | "Ready" | "Harvested",
        assigned_agent_id: f.agent,
        created_by: coordinatorId,
      })
      .select("id,name")
      .single();
    if (error || !data) throw new Error(`Failed creating field ${f.name}: ${error?.message}`);
    insertedFields.push({ id: data.id, name: f.name, agent: f.agent, stage: f.stage });
  }

  const fById = Object.fromEntries(insertedFields.map((f) => [f.name, f]));
  const now = new Date();
  const daysAgo = (n: number) => new Date(now.getTime() - n * 86400_000).toISOString();

  const updates = [
    { field: "Central Field", agent: johnId, prev: "Ready", stage: "Harvested", notes: "Good yield, clean harvest", at: daysAgo(2) },
    { field: "South Field", agent: johnId, prev: "Growing", stage: "Ready", notes: "Grain filling complete", at: daysAgo(1) },
    { field: "West Field", agent: sarahId, prev: "Planted", stage: "Planted", notes: "Slight pest activity detected", at: daysAgo(3) },
    { field: "East Field", agent: sarahId, prev: "Planted", stage: "Growing", notes: "Healthy growth observed", at: daysAgo(8) },
    { field: "North Field", agent: johnId, prev: "Planted", stage: "Growing", notes: "Strong germination", at: daysAgo(4) },
  ];

  for (const u of updates) {
    const f = fById[u.field];
    if (!f) continue;
    await supabaseAdmin.from("field_updates").insert({
      field_id: f.id,
      agent_id: u.agent!,
      previous_stage: u.prev,
      new_stage: u.stage,
      notes: u.notes,
      created_at: u.at,
    });
  }

  // Recompute statuses for all seeded fields
  for (const f of insertedFields) {
    await supabaseAdmin.rpc("recompute_field_status", { _field_id: f.id });
  }

  return { ok: true, users: DEMO_USERS.length, fields: insertedFields.length, updates: updates.length };
});
