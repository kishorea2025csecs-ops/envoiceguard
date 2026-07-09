import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { AiSummaryCard } from "@/components/ai-summary-card";
import { RiskBadge } from "@/components/risk-badge";
import { formatCurrency, formatCompact, formatDate } from "@/lib/format";
import { summarizeReport } from "@/lib/summarize-report.functions";
import {
  ShieldAlert,
  Wallet,
  FileText,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

type InvoiceRow = {
  id: string;
  invoice_number: string;
  vendor_name: string;
  total_amount: number | null;
  amount: number | null;
  currency: string;
  invoice_date: string | null;
  risk_level: "low" | "medium" | "high";
  fraud_score: number;
  status: string;
};

function DashboardPage() {
  const invoicesQuery = useQuery({
    queryKey: ["invoices", "recent"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("id, invoice_number, vendor_name, total_amount, amount, currency, invoice_date, risk_level, fraud_score, status")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as InvoiceRow[];
    },
  });

  const invoices = invoicesQuery.data ?? [];
  const totalValue = invoices.reduce((s, i) => s + Number(i.total_amount ?? i.amount ?? 0), 0);
  const highRisk = invoices.filter((i) => i.risk_level === "high").length;
  const medRisk = invoices.filter((i) => i.risk_level === "medium").length;
  const savings = invoices
    .filter((i) => i.risk_level === "high")
    .reduce((s, i) => s + Number(i.total_amount ?? i.amount ?? 0), 0);

  const summarize = useServerFn(summarizeReport);
  const [summary, setSummary] = useState<{ content: string; generatedAt: string } | null>(null);
  const summaryMutation = useMutation({
    mutationFn: async () => summarize({ data: { scope: "dashboard", save: false } }),
    onSuccess: (r) => setSummary({ content: r.content, generatedAt: r.generatedAt }),
  });

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Fraud Intelligence Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Real-time risk view across your invoice pipeline.
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/upload">
            <Button variant="outline">Upload invoice</Button>
          </Link>
          <Link to="/reports">
            <Button>Open reports</Button>
          </Link>
        </div>
      </header>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={FileText}
          label="Total invoices"
          value={formatCompact(invoices.length)}
          sub="Last 200"
        />
        <KpiCard
          icon={Wallet}
          label="AP value analyzed"
          value={formatCurrency(totalValue)}
          sub="Across all vendors"
        />
        <KpiCard
          icon={ShieldAlert}
          label="Critical risk"
          value={String(highRisk)}
          sub={`${medRisk} medium risk`}
          tone="high"
        />
        <KpiCard
          icon={TrendingUp}
          label="Potential fraud caught"
          value={formatCurrency(savings)}
          sub="At-risk invoice value"
          tone="high"
        />
      </section>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl border bg-surface overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Recent invoices</h2>
              <p className="text-xs text-muted-foreground">Latest additions with AI fraud verdict</p>
            </div>
            <Link to="/invoices" className="text-xs text-brand inline-flex items-center gap-1">
              View all <ArrowUpRight className="size-3" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground bg-muted/30">
                <tr>
                  <th className="text-left px-5 py-3">Invoice</th>
                  <th className="text-left px-5 py-3">Vendor</th>
                  <th className="text-left px-5 py-3">Date</th>
                  <th className="text-right px-5 py-3">Amount</th>
                  <th className="text-left px-5 py-3">Risk</th>
                </tr>
              </thead>
              <tbody>
                {invoicesQuery.isLoading &&
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="border-t">
                      <td colSpan={5} className="px-5 py-4">
                        <div className="h-4 bg-muted rounded animate-pulse" />
                      </td>
                    </tr>
                  ))}
                {invoices.slice(0, 10).map((inv) => (
                  <tr key={inv.id} className="border-t hover:bg-muted/30">
                    <td className="px-5 py-3">
                      <Link to="/invoices/$id" params={{ id: inv.id }} className="font-medium hover:underline">
                        {inv.invoice_number}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{inv.vendor_name}</td>
                    <td className="px-5 py-3 text-muted-foreground">{formatDate(inv.invoice_date)}</td>
                    <td className="px-5 py-3 text-right tabular-nums font-medium">
                      {formatCurrency(Number(inv.total_amount ?? inv.amount ?? 0), inv.currency)}
                    </td>
                    <td className="px-5 py-3">
                      <RiskBadge level={inv.risk_level} score={inv.fraud_score} />
                    </td>
                  </tr>
                ))}
                {!invoicesQuery.isLoading && invoices.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-muted-foreground">
                      No invoices yet.{" "}
                      <Link to="/upload" className="text-brand underline">
                        Upload your first
                      </Link>
                      .
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <AiSummaryCard
            title="AI Portfolio Summary"
            content={summary?.content}
            generatedAt={summary?.generatedAt}
            loading={summaryMutation.isPending}
            error={summaryMutation.error ? (summaryMutation.error as Error).message : null}
            onRegenerate={() => summaryMutation.mutate()}
          />

          <div className="rounded-xl border bg-surface p-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="size-4 text-risk-high" />
              <h3 className="font-semibold text-sm">Top risk flags</h3>
            </div>
            <ul className="text-sm space-y-2">
              {invoices
                .filter((i) => i.risk_level === "high")
                .slice(0, 5)
                .map((inv) => (
                  <li key={inv.id} className="flex justify-between items-center">
                    <Link to="/invoices/$id" params={{ id: inv.id }} className="hover:underline truncate">
                      {inv.invoice_number} · {inv.vendor_name}
                    </Link>
                    <span className="font-medium tabular-nums text-risk-high">
                      {formatCurrency(Number(inv.total_amount ?? inv.amount ?? 0), inv.currency)}
                    </span>
                  </li>
                ))}
              {invoices.filter((i) => i.risk_level === "high").length === 0 && (
                <li className="text-muted-foreground text-xs">No critical risks detected.</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
  tone?: "high";
}) {
  return (
    <div className="rounded-xl border bg-surface p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground uppercase tracking-wider">{label}</span>
        <div
          className={`size-8 rounded-lg grid place-items-center ${
            tone === "high" ? "bg-risk-high/10 text-risk-high" : "bg-brand/10 text-brand"
          }`}
        >
          <Icon className="size-4" />
        </div>
      </div>
      <div className="mt-3 text-2xl font-semibold tabular-nums">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}
