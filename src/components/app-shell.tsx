import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard,
  FileText,
  Upload,
  BarChart3,
  MessageSquare,
  ShieldCheck,
  LogOut,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/invoices", label: "Invoices", icon: FileText },
  { to: "/upload", label: "Upload", icon: Upload },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/assistant", label: "AI Assistant", icon: MessageSquare },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{ full_name: string | null; email: string | null; company: string | null } | null>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase
        .from("profiles")
        .select("full_name, company")
        .eq("id", u.user.id)
        .maybeSingle();
      setProfile({
        full_name: data?.full_name ?? null,
        email: u.user.email ?? null,
        company: data?.company ?? null,
      });
    })();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <aside className="hidden lg:flex w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
        <div className="px-5 py-5 flex items-center gap-2 border-b border-sidebar-border">
          <div className="size-8 rounded-lg bg-brand grid place-items-center font-bold text-brand-foreground text-sm">IG</div>
          <div>
            <div className="font-semibold tracking-tight">InvoiceGuard</div>
            <div className="text-[10px] uppercase tracking-widest text-sidebar-muted">AI Fraud Engine</div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {nav.map((item) => {
            const active = location.pathname === item.to || location.pathname.startsWith(item.to + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition ${
                  active
                    ? "bg-white/10 text-sidebar-foreground font-medium"
                    : "text-sidebar-muted hover:text-sidebar-foreground hover:bg-white/5"
                }`}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          <div className="rounded-md bg-white/5 p-3">
            <div className="flex items-center gap-2 text-sm">
              <div className="size-8 rounded-full bg-brand/20 grid place-items-center text-brand text-xs font-semibold">
                {(profile?.full_name || profile?.email || "U").slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sidebar-foreground text-xs font-medium">
                  {profile?.full_name || profile?.email || "User"}
                </div>
                {profile?.company && (
                  <div className="truncate text-[10px] text-sidebar-muted flex items-center gap-1">
                    <Building2 className="size-3" />
                    {profile.company}
                  </div>
                )}
              </div>
              <button onClick={signOut} className="text-sidebar-muted hover:text-sidebar-foreground" title="Sign out">
                <LogOut className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b bg-surface">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-brand grid place-items-center font-bold text-brand-foreground text-sm">IG</div>
            <span className="font-semibold">InvoiceGuard</span>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}>Sign out</Button>
        </header>
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
