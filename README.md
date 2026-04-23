# SmartSeason — Field Monitoring System

A full-stack crop monitoring application where coordinators manage fields and assign them to field agents who post real-time stage updates. Built as a technical assessment for a Software Engineer role.

---

## Live Demo

🔗 **[Add your Netlify link here]**

---

## Demo Credentials

| Role | Email | Password |
|---|---|---|
| Coordinator | coordinator@smartseason.com | coord123 |
| Field Agent (John) | john@smartseason.com | agent123 |
| Field Agent (Sarah) | sarah@smartseason.com | agent123 |
| New Agent (empty state) | newagent@smartseason.com | agent123 |

> Click **Seed Data** on the login screen to (re)create all demo users, fields, and update history.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TanStack Router + Vite |
| Styling | TailwindCSS + shadcn/ui |
| Charts | Recharts |
| Backend | Supabase (Postgres + Auth + Row Level Security) |
| Auth | Supabase Auth — email/password, JWT sessions |
| Status Logic | Postgres trigger (server-side, auto-computed) |

---

## Setup Instructions

### Prerequisites
- Node.js 18+ ([nodejs.org](https://nodejs.org))
- A Supabase account ([supabase.com](https://supabase.com)) — free tier is sufficient

### 1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/field-watcher.git
cd field-watcher
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
Create a `.env` file in the root folder:
```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
```
Find these in your Supabase project under **Settings → API**.

### 4. Run database migrations
In your Supabase dashboard, go to **SQL Editor** and run the migration files
in order from the `/supabase/migrations/` folder.

### 5. Start the development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 6. Seed demo data
On the login screen, click the **Seed Data** button. This creates all demo
accounts, fields, and update history.

---

## Features

### Coordinator
- Overview dashboard with total fields, active/at-risk/completed counts, and unassigned field warnings
- Status breakdown pie chart and recent updates feed across all agents
- Create, view, and delete fields
- Assign or reassign fields to any registered field agent
- View full update history for any field
- Agents management page showing each agent's assigned fields and last activity
- Export fields list to PDF

### Field Agent
- Personal dashboard showing only assigned fields and their own activity
- Friendly empty state when no fields are assigned yet (no crashes)
- Update field stage (Planted → Growing → Ready → Harvested)
- Add observations and notes with each update
- View full update history for their fields

---

## Status Logic

Status is computed automatically in Postgres via a trigger that fires after every `field_updates` insert — never on the frontend. This ensures accuracy regardless of how data enters the system.

**Rules (evaluated in order):**

| Status | Condition |
|---|---|
| **Completed** | Stage is `Harvested` |
| **At Risk** | No update in the last 7 days, OR latest notes contain a risk keyword |
| **Active** | All other cases |

**Risk keywords:** `pest`, `drought`, `disease`, `flood`, `damage`, `wilting`, `infection`

Storing status as a persisted column (not derived at query time) keeps reads fast and logic centralised in one place.

---

## Security & Access Control

Access rules are enforced at the **database level** via Supabase Row Level Security (RLS) — not just the frontend. This means even direct API calls respect role boundaries.

- **Coordinators** can see and manage all fields, assign agents, create and delete fields
- **Field Agents** can only see fields where they are the `assigned_agent_id`, and can only post updates on those fields
- **Roles** are stored in a separate `user_roles` table (never on the `profiles` table) to prevent privilege escalation

---

## Design Decisions

**Why Postgres triggers for status?**
Status could have been computed on the frontend, but that creates stale data risks. A Postgres trigger ensures status is always accurate the moment a field update is saved, regardless of who or what writes to the database.

**Why a separate `user_roles` table?**
Storing roles directly on the `profiles` table would allow a user to update their own role via a profile update. A separate table with strict RLS policies prevents this.

**Why self-registration with role selection?**
The brief did not specify how agents are onboarded. Self-registration with role selection was chosen because it is simpler to demonstrate and test — evaluators can create their own accounts without coordinator involvement. In a production system, coordinator-controlled invitations would be more appropriate.

**Why one agent per field?**
The brief states fields are "assigned to field agents" (singular), implying one-to-one assignment. This keeps the data model simple and accountability clear.

---

## Assumptions

- One field can be assigned to at most one agent at a time
- New agents see an empty dashboard with a friendly message until assigned — no errors or crashes
- Stage history is append-only via the `field_updates` table — no edits or deletions
- Only coordinators can create or delete fields
- Agents cannot see or update fields that are not assigned to them