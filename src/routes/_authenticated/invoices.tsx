import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RiskBadge } from "@/components/risk-badge";
import { formatCurrency, formatDate } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Filter } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/invoices")({
  component: InvoicesPage,
});

function InvoicesPage() {
  const [search, setSearch] = useState("");
  const [risk, setRisk] = useState<string>("all");

  const invoicesQuery = useQuery({
    queryKey: ["invoices", "list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });

  const rows = (invoicesQuery.data ?? []).filter((r) => {
    if (risk !== "all" && r.risk_level !== risk) return false;
    if (search) {
      const t = search.toLowerCase();
      return (
        r.invoice_number?.toLowerCase().includes(t) ||
        r.vendor_name?.toLowerCase().includes(t)
      );
    }
    return true;
  });

  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Invoices</h1>
          <p className="text-sm text-muted-foreground">All invoices analyzed by the fraud engine.</p>
        </div>
        <Link to="/upload">
          <Button>Upload new</Button>
        </Link>
      </header>

      <div className="rounded-xl border bg-surface">
        <div className="p-4 border-b flex flex-col md:flex-row gap-3 md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search vendor or invoice number..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={risk} onValueChange={setRisk}>
            <SelectTrigger className="w-full md:w-48">
              <Filter className="size-3.5 mr-2" />
              <SelectValue placeholder="All risk levels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All risk levels</SelectItem>
              <SelectItem value="high">Critical only</SelectItem>
              <SelectItem value="medium">Medium risk</SelectItem>
              <SelectItem value="low">Safe</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wider text-muted-foreground bg-muted/30">
              <tr>
                <th className="text-left px-5 py-3">Invoice</th>
                <th className="text-left px-5 py-3">Vendor</th>
                <th className="text-left px-5 py-3">Date</th>
                <th className="text-right px-5 py-3">Amount</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-left px-5 py-3">Risk</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((inv) => (
                <tr key={inv.id} className="border-t hover:bg-muted/30">
                  <td className="px-5 py-3">
                    <Link
                      to="/invoices/$id"
                      params={{ id: inv.id }}
                      className="font-medium hover:underline"
                    >
                      {inv.invoice_number}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{inv.vendor_name}</td>
                  <td className="px-5 py-3 text-muted-foreground">{formatDate(inv.invoice_date)}</td>
                  <td className="px-5 py-3 text-right tabular-nums font-medium">
                    {formatCurrency(Number(inv.total_amount ?? inv.amount ?? 0), inv.currency)}
                  </td>
                  <td className="px-5 py-3">
                    <span className="capitalize text-xs px-2 py-0.5 rounded-full bg-muted">
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <RiskBadge level={inv.risk_level} score={inv.fraud_score} />
                  </td>
                </tr>
              ))}
              {!invoicesQuery.isLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">
                    No invoices match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
