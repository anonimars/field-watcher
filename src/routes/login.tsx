import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Leaf, Database } from "lucide-react";
import { toast } from "sonner";
import { seedDemo } from "@/lib/seed.functions";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [user, loading, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Welcome back!");
    navigate({ to: "/dashboard" });
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const r = await seedDemo();
      toast.success(`Demo data ready: ${r.users} users, ${r.fields} fields.`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSeeding(false);
    }
  };

  const fillDemo = (e: string, p: string) => {
    setEmail(e);
    setPassword(p);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary via-background to-accent p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="w-14 h-14 rounded-xl bg-primary mx-auto flex items-center justify-center mb-3">
            <Leaf className="w-7 h-7 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">SmartSeason</CardTitle>
          <p className="text-sm text-muted-foreground">Field Monitoring System</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Signing in…" : "Sign In"}
            </Button>
          </form>

          <p className="text-center text-sm mt-3">
            <Link to="/forgot-password" className="text-primary hover:underline">
              Forgot password?
            </Link>
          </p>

          <p className="text-center text-sm text-muted-foreground mt-2">
            No account?{" "}
            <Link to="/register" className="text-primary font-medium hover:underline">
              Register
            </Link>
          </p>

          <div className="mt-6 pt-4 border-t border-border">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-muted-foreground">DEMO ACCOUNTS</p>
              <Button size="sm" variant="outline" onClick={handleSeed} disabled={seeding}>
                <Database className="w-3 h-3 mr-1" />
                {seeding ? "Seeding…" : "Seed Data"}
              </Button>
            </div>
            <div className="space-y-1 text-xs">
              <button type="button" onClick={() => fillDemo("coordinator@smartseason.com", "coord123")}
                className="w-full text-left px-2 py-1 rounded hover:bg-muted">
                <span className="font-medium">Coordinator:</span><span> coordinator@smartseason.com / coord123</span>
              </button>
              <button type="button" onClick={() => fillDemo("john@smartseason.com", "agent123")}
                className="w-full text-left px-2 py-1 rounded hover:bg-muted">
                <span className="font-medium">Agent:</span><span> john@smartseason.com / agent123</span>
              </button>
              <button type="button" onClick={() => fillDemo("sarah@smartseason.com", "agent123")}
                className="w-full text-left px-2 py-1 rounded hover:bg-muted">
                <span className="font-medium">Agent:</span><span> sarah@smartseason.com / agent123</span>
              </button>
              <button type="button" onClick={() => fillDemo("newagent@smartseason.com", "agent123")}
                className="w-full text-left px-2 py-1 rounded hover:bg-muted">
                <span className="font-medium">New Agent:</span><span> newagent@smartseason.com / agent123</span>
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
