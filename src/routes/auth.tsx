import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ShieldCheck, Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState<"admin" | "finance_manager" | "auditor">("finance_manager");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back");
        navigate({ to: "/dashboard" });
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName, company, role },
          },
        });
        if (error) throw error;
        toast.success("Account created — signing you in");
        // If email confirmation is off (default), a session exists
        const { data } = await supabase.auth.getSession();
        if (data.session) navigate({ to: "/dashboard" });
        else setMode("signin");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) throw result.error;
      if (result.redirected) return;
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Google sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Left panel — brand */}
      <div className="hidden lg:flex flex-col justify-between p-10 bg-sidebar text-sidebar-foreground">
        <div className="flex items-center gap-2">
          <div className="size-9 rounded-lg bg-brand grid place-items-center font-bold text-brand-foreground">IG</div>
          <span className="font-semibold text-lg tracking-tight">InvoiceGuard AI</span>
        </div>
        <div>
          <h1 className="text-3xl font-semibold leading-tight text-balance">
            Real-time fraud detection for every invoice you pay.
          </h1>
          <p className="mt-4 text-sm text-sidebar-muted max-w-md">
            Enterprise-grade OCR, duplicate detection, price anomaly analysis, vendor verification, and AI-summarized audit reports — from upload to payment.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-3 text-xs">
            {["OCR extraction", "Fraud scoring", "AI summaries"].map((k) => (
              <div key={k} className="rounded-lg border border-sidebar-border/50 p-3">
                <ShieldCheck className="size-4 text-brand mb-2" />
                <p className="text-sidebar-foreground/90 font-medium">{k}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-sidebar-muted">© {new Date().getFullYear()} InvoiceGuard AI</p>
      </div>

      {/* Right — form */}
      <div className="flex items-center justify-center p-6 lg:p-10">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="size-8 rounded-lg bg-brand grid place-items-center font-bold text-brand-foreground">IG</div>
            <span className="font-semibold tracking-tight">InvoiceGuard AI</span>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight">
            {mode === "signin" ? "Sign in to your workspace" : "Create your workspace"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === "signin" ? "Access the fraud analysis engine." : "Start protecting your AP pipeline in minutes."}
          </p>

          <Tabs value={mode} onValueChange={(v) => setMode(v as "signin" | "signup")} className="mt-6">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Sign up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" />
            <TabsContent value="signup" />
          </Tabs>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <>
                <div>
                  <Label htmlFor="fullName">Full name</Label>
                  <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="company">Company</Label>
                  <Input id="company" value={company} onChange={(e) => setCompany(e.target.value)} />
                </div>
                <div>
                  <Label>Role</Label>
                  <RadioGroup value={role} onValueChange={(v) => setRole(v as typeof role)} className="grid grid-cols-3 gap-2 mt-2">
                    {(
                      [
                        { v: "admin", l: "Admin" },
                        { v: "finance_manager", l: "Finance Mgr" },
                        { v: "auditor", l: "Auditor" },
                      ] as const
                    ).map((r) => (
                      <label
                        key={r.v}
                        className={`flex items-center gap-2 rounded-md border px-3 py-2 text-xs cursor-pointer ${
                          role === r.v ? "border-brand bg-brand/5" : "border-border"
                        }`}
                      >
                        <RadioGroupItem value={r.v} className="sr-only" />
                        <span className="font-medium">{r.l}</span>
                      </label>
                    ))}
                  </RadioGroup>
                </div>
              </>
            )}
            <div>
              <Label htmlFor="email">Work email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>
            <Button type="submit" disabled={busy} className="w-full">
              {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
              {mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t" /></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">or</span></div>
          </div>
          <Button variant="outline" className="w-full" onClick={handleGoogle} disabled={busy}>
            Continue with Google
          </Button>

          <p className="mt-6 text-xs text-muted-foreground text-center">
            By continuing you agree to our Terms and acknowledge our Privacy Policy.
            {" "}
            <Link to="/" className="underline">Back home</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
