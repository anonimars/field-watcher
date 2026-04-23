-- Enum types
CREATE TYPE public.app_role AS ENUM ('coordinator', 'field_agent');
CREATE TYPE public.field_stage AS ENUM ('Planted', 'Growing', 'Ready', 'Harvested');
CREATE TYPE public.field_status AS ENUM ('Active', 'At Risk', 'Completed');

-- Profiles table (linked to auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles (separate table for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);

-- has_role security definer
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- get_my_role helper
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1
$$;

-- Fields table
CREATE TABLE public.fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  crop_type TEXT NOT NULL,
  planting_date DATE NOT NULL,
  stage field_stage NOT NULL DEFAULT 'Planted',
  status field_status NOT NULL DEFAULT 'Active',
  assigned_agent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Field updates
CREATE TABLE public.field_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_id UUID NOT NULL REFERENCES public.fields(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES auth.users(id),
  previous_stage TEXT,
  new_stage TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-create profile + role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'field_agent'::app_role)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER fields_touch_updated_at
  BEFORE UPDATE ON public.fields
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Compute & save status on field update
CREATE OR REPLACE FUNCTION public.recompute_field_status(_field_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stage field_stage;
  v_last_update TIMESTAMPTZ;
  v_last_notes TEXT;
  v_new_status field_status;
  v_risk_keywords TEXT[] := ARRAY['pest','drought','disease','flood','damage','wilting','infection'];
  v_kw TEXT;
  v_at_risk BOOLEAN := FALSE;
BEGIN
  SELECT stage INTO v_stage FROM public.fields WHERE id = _field_id;
  IF v_stage = 'Harvested' THEN
    UPDATE public.fields SET status = 'Completed' WHERE id = _field_id;
    RETURN;
  END IF;

  SELECT created_at, notes INTO v_last_update, v_last_notes
  FROM public.field_updates WHERE field_id = _field_id
  ORDER BY created_at DESC LIMIT 1;

  IF v_last_update IS NULL OR v_last_update < (now() - INTERVAL '7 days') THEN
    v_at_risk := TRUE;
  END IF;

  IF v_last_notes IS NOT NULL THEN
    FOREACH v_kw IN ARRAY v_risk_keywords LOOP
      IF position(lower(v_kw) in lower(v_last_notes)) > 0 THEN
        v_at_risk := TRUE;
      END IF;
    END LOOP;
  END IF;

  v_new_status := CASE WHEN v_at_risk THEN 'At Risk'::field_status ELSE 'Active'::field_status END;
  UPDATE public.fields SET status = v_new_status WHERE id = _field_id;
END;
$$;

-- After field_update insert: update field stage + recompute
CREATE OR REPLACE FUNCTION public.handle_field_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.fields SET stage = NEW.new_stage::field_stage WHERE id = NEW.field_id;
  PERFORM public.recompute_field_status(NEW.field_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_field_update_inserted
  AFTER INSERT ON public.field_updates
  FOR EACH ROW EXECUTE FUNCTION public.handle_field_update();

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.field_updates ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Authenticated can view all profiles"
  ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- user_roles policies
CREATE POLICY "Authenticated can view all roles"
  ON public.user_roles FOR SELECT TO authenticated USING (true);

-- Fields policies
CREATE POLICY "Coordinator sees all fields"
  ON public.fields FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'coordinator'));
CREATE POLICY "Agent sees assigned fields"
  ON public.fields FOR SELECT TO authenticated
  USING (assigned_agent_id = auth.uid());
CREATE POLICY "Coordinator inserts fields"
  ON public.fields FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'coordinator'));
CREATE POLICY "Coordinator updates fields"
  ON public.fields FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'coordinator'));
CREATE POLICY "Coordinator deletes fields"
  ON public.fields FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'coordinator'));

-- Field updates policies
CREATE POLICY "Coordinator views all updates"
  ON public.field_updates FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'coordinator'));
CREATE POLICY "Agent views own field updates"
  ON public.field_updates FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.fields f WHERE f.id = field_id AND f.assigned_agent_id = auth.uid())
  );
CREATE POLICY "Agent inserts updates for assigned fields"
  ON public.field_updates FOR INSERT TO authenticated
  WITH CHECK (
    agent_id = auth.uid() AND
    EXISTS (SELECT 1 FROM public.fields f WHERE f.id = field_id AND f.assigned_agent_id = auth.uid())
  );

-- Indexes
CREATE INDEX idx_fields_agent ON public.fields(assigned_agent_id);
CREATE INDEX idx_field_updates_field ON public.field_updates(field_id, created_at DESC);