import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type AppRole } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Leaf, Briefcase, Tractor } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/register")({
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AppRole>("field_agent");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [user, loading, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, role },
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Account created!");
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary via-background to-accent p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="w-14 h-14 rounded-xl bg-primary mx-auto flex items-center justify-center mb-3">
            <Leaf className="w-7 h-7 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Create your account</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>I am a</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <button type="button" onClick={() => setRole("coordinator")}
                  className={`p-3 border-2 rounded-lg text-left transition ${role === "coordinator" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}>
                  <Briefcase className="w-5 h-5 mb-1 text-primary" />
                  <div className="font-medium text-sm">Coordinator</div>
                  <div className="text-xs text-muted-foreground">Manage fields & agents</div>
                </button>
                <button type="button" onClick={() => setRole("field_agent")}
                  className={`p-3 border-2 rounded-lg text-left transition ${role === "field_agent" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}>
                  <Tractor className="w-5 h-5 mb-1 text-primary" />
                  <div className="font-medium text-sm">Field Agent</div>
                  <div className="text-xs text-muted-foreground">Update assigned fields</div>
                </button>
              </div>
            </div>
            <div>
              <Label htmlFor="name">Full name</Label>
              <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Creating…" : "Create Account"}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground mt-4">
            Have an account?{" "}
            <Link to="/login" className="text-primary font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
