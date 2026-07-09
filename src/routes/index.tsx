import { createFileRoute, redirect } from "@tanstack/react-router";
import { Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  component: IndexRedirect,
  beforeLoad: () => {
    // client-side check handled in component; SSR-safe redirect fallback below
  },
});

function IndexRedirect() {
  const [state, setState] = useState<"loading" | "in" | "out">("loading");
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setState(data.session ? "in" : "out");
    });
  }, []);
  if (state === "loading") return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Loading…</div>;
  if (state === "in") return <Navigate to="/dashboard" />;
  return <Navigate to="/auth" />;
}
