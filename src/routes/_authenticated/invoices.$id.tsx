import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RiskBadge, RiskScoreRing } from "@/components/risk-badge";
import { AiSummaryCard } from "@/components/ai-summary-card";
import { formatCurrency, formatCurrencyPrecise, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Building2,
  Calendar,
  Hash,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  Sparkles,
} from "lucide-react";
import { scoreInvoice } from "@/lib/score-invoice.functions";
import { summarizeReport } from "@/lib/summarize-report.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/invoices/$id")({
  component: InvoiceDetail,
});

type Flag = { code: string; label: string; severity: "low" | "medium" | "high"; detail: string };

function InvoiceDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [summary, setSummary] = useState<{ content: string; generatedAt: string } | null>(null);

  const q = useQuery({
    queryKey: ["invoice", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*, invoice_line_items(*), vendors(*)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const scoreFn = useServerFn(scoreInvoice);
  const summarizeFn = useServerFn(summarizeReport);

  const rescore = useMutation({
    mutationFn: async () => scoreFn({ data: { invoiceId: id } }),
    onSuccess: () => {
      toast.success("Fraud analysis updated");
      qc.invalidateQueries({ queryKey: ["invoice", id] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const summarize = useMutation({
    mutationFn: async () => summarizeFn({ data: { scope: "invoice", invoiceId: id, save: true } }),
    onSuccess: (r) => setSummary({ content: r.content, generatedAt: r.generatedAt }),
    onError: (e) => toast.error((e as Error).message),
  });

  const updateStatus = useMutation({
    mutationFn: async (status: "approved" | "held" | "rejected") => {
      const { error } = await supabase.from("invoices").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status updated");
      qc.invalidateQueries({ queryKey: ["invoice", id] });
    },
  });

  const inv = q.data;
  if (q.isLoading) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  if (!inv) return <div className="p-8">Invoice not found.</div>;

  const flags = (Array.isArray(inv.flags) ? inv.flags : []) as unknown as Flag[];
  const amount = Number(inv.total_amount ?? inv.amount ?? 0);

  return (
    <div className="p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      <div>
        <Link
          to="/invoices"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3" />
          Back to invoices
        </Link>
      </div>

      <header className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight font-mono">
              {inv.invoice_number}
            </h1>
            <RiskBadge level={inv.risk_level} score={inv.fraud_score} size="lg" />
          </div>
          <div className="text-sm text-muted-foreground flex flex-wrap gap-x-5 gap-y-1">
            <span className="inline-flex items-center gap-1.5">
              <Building2 className="size-3.5" />
              {inv.vendor_name}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="size-3.5" />
              {formatDate(inv.invoice_date)}
            </span>
            {inv.po_number && (
              <span className="inline-flex items-center gap-1.5">
                <Hash className="size-3.5" />
                PO {inv.po_number}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => rescore.mutate()} disabled={rescore.isPending}>
            {rescore.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Sparkles className="mr-2 size-4" />}
            Re-run AI analysis
          </Button>
          <Button
            variant="outline"
            className="text-risk-low border-risk-low/30 hover:bg-risk-low/10"
            onClick={() => updateStatus.mutate("approved")}
          >
            <CheckCircle2 className="mr-2 size-4" /> Approve
          </Button>
          <Button
            variant="outline"
            className="text-risk-med border-risk-med/30 hover:bg-risk-med/10"
            onClick={() => updateStatus.mutate("held")}
          >
            Hold
          </Button>
          <Button
            variant="outline"
            className="text-risk-high border-risk-high/30 hover:bg-risk-high/10"
            onClick={() => updateStatus.mutate("rejected")}
          >
            <XCircle className="mr-2 size-4" /> Reject
          </Button>
        </div>
      </header>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border bg-surface p-5">
            <div className="flex items-center gap-6">
              <RiskScoreRing score={Number(inv.fraud_score ?? 0)} level={inv.risk_level} />
              <div className="space-y-3 flex-1">
                <RiskBreakdown label="Duplicate risk" value={Number(inv.duplicate_risk ?? 0)} />
                <RiskBreakdown label="Price anomaly" value={Number(inv.price_anomaly_risk ?? 0)} />
                <RiskBreakdown label="Vendor risk" value={Number(inv.vendor_risk ?? 0)} />
              </div>
            </div>
            {inv.ai_recommendation && (
              <div className="mt-5 rounded-lg bg-brand/5 border border-brand/20 p-4">
                <div className="text-xs uppercase tracking-wider text-brand font-medium mb-1">
                  AI Recommendation
                </div>
                <div className="font-semibold">{inv.ai_recommendation}</div>
                {inv.ai_narrative && (
                  <p className="text-sm text-foreground/80 mt-1">{inv.ai_narrative}</p>
                )}
              </div>
            )}
          </div>

          <div className="rounded-xl border bg-surface overflow-hidden">
            <div className="px-5 py-3 border-b">
              <h3 className="font-semibold">Detected fraud signals</h3>
            </div>
            {flags.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                No specific flags raised by the AI engine.
              </div>
            ) : (
              <ul className="divide-y">
                {flags.map((f, i) => (
                  <li key={i} className="px-5 py-3 flex gap-3">
                    <AlertTriangle
                      className={`size-4 mt-0.5 ${
                        f.severity === "high"
                          ? "text-risk-high"
                          : f.severity === "medium"
                            ? "text-risk-med"
                            : "text-risk-low"
                      }`}
                    />
                    <div>
                      <div className="text-sm font-medium">{f.label}</div>
                      <div className="text-xs text-muted-foreground">{f.detail}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl border bg-surface overflow-hidden">
            <div className="px-5 py-3 border-b flex justify-between items-center">
              <h3 className="font-semibold">Line items</h3>
              <div className="text-sm text-muted-foreground">Total: {formatCurrencyPrecise(amount, inv.currency)}</div>
            </div>
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground bg-muted/30">
                <tr>
                  <th className="text-left px-5 py-2">Description</th>
                  <th className="text-right px-5 py-2">Qty</th>
                  <th className="text-right px-5 py-2">Unit</th>
                  <th className="text-right px-5 py-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {(inv.invoice_line_items ?? []).map((li) => (
                  <tr key={li.id} className="border-t">
                    <td className="px-5 py-2">{li.description}</td>
                    <td className="px-5 py-2 text-right tabular-nums">{li.quantity}</td>
                    <td className="px-5 py-2 text-right tabular-nums">
                      {formatCurrencyPrecise(Number(li.unit_price ?? 0), inv.currency)}
                    </td>
                    <td className="px-5 py-2 text-right tabular-nums font-medium">
                      {formatCurrencyPrecise(Number(li.line_total ?? li.total ?? 0), inv.currency)}
                    </td>
                  </tr>
                ))}
                {(inv.invoice_line_items ?? []).length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-6 text-center text-muted-foreground">
                      No line items extracted.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border bg-surface p-5">
            <h3 className="font-semibold text-sm mb-3">Payment details</h3>
            <dl className="text-sm space-y-2">
              <Row label="Amount">{formatCurrencyPrecise(amount, inv.currency)}</Row>
              <Row label="Subtotal">{inv.subtotal ? formatCurrencyPrecise(Number(inv.subtotal), inv.currency) : "—"}</Row>
              <Row label="Tax">{formatCurrencyPrecise(Number(inv.tax_amount ?? 0), inv.currency)}</Row>
              <Row label="Invoice date">{formatDate(inv.invoice_date)}</Row>
              <Row label="Due date">{formatDate(inv.due_date)}</Row>
              <Row label="Status" className="capitalize">{inv.status}</Row>
            </dl>
          </div>

          <div className="rounded-xl border bg-surface p-5">
            <h3 className="font-semibold text-sm mb-3">Vendor</h3>
            <dl className="text-sm space-y-2">
              <Row label="Name">{inv.vendor_name}</Row>
              <Row label="Email">{inv.vendor_email || "—"}</Row>
              <Row label="Tax ID">{inv.vendors?.tax_id || "—"}</Row>
              <Row label="Trusted">{inv.vendors?.is_trusted ? "Yes" : "No"}</Row>
              <Row label="Invoices">{inv.vendors?.invoice_count ?? 0}</Row>
            </dl>
          </div>

          <AiSummaryCard
            title="AI Invoice Summary"
            content={summary?.content}
            generatedAt={summary?.generatedAt}
            loading={summarize.isPending}
            onRegenerate={() => summarize.mutate()}
            error={summarize.error ? (summarize.error as Error).message : null}
          />
        </div>
      </div>
    </div>
  );
}

function Row({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={`font-medium text-right ${className ?? ""}`}>{children}</dd>
    </div>
  );
}

function RiskBreakdown({ label, value }: { label: string; value: number }) {
  const v = Math.max(0, Math.min(100, value));
  const color = v > 66 ? "bg-risk-high" : v > 33 ? "bg-risk-med" : "bg-risk-low";
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums font-medium">{Math.round(v)}%</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${v}%` }} />
      </div>
    </div>
  );
}
