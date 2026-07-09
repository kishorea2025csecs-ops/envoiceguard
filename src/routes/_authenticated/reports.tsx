import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { summarizeReport } from "@/lib/summarize-report.functions";
import { AiSummaryCard } from "@/components/ai-summary-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/format";
import { FileBarChart, Trash2 } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

export const Route = createFileRoute("/_authenticated/reports")({
  component: ReportsPage,
});

function ReportsPage() {
  const qc = useQueryClient();
  const summarize = useServerFn(summarizeReport);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [preview, setPreview] = useState<{ title: string; content: string } | null>(null);

  const summariesQuery = useQuery({
    queryKey: ["summaries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("report_summaries")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const generate = useMutation({
    mutationFn: async () =>
      summarize({
        data: {
          scope: "audit_range",
          dateFrom: from || undefined,
          dateTo: to || undefined,
          save: true,
        },
      }),
    onSuccess: (r) => {
      setPreview({ title: r.title, content: r.content });
      qc.invalidateQueries({ queryKey: ["summaries"] });
      toast.success("Report generated");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("report_summaries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["summaries"] }),
  });

  return (
    <div className="p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground">
          AI-generated audit reports across your invoice portfolio.
        </p>
      </header>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="rounded-xl border bg-surface p-5 space-y-4">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <FileBarChart className="size-4 text-brand" />
              New audit report
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Filter by date range. AI summarizer condenses findings into an executive report.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="from" className="text-xs">From</Label>
              <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="to" className="text-xs">To</Label>
              <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>
          <Button className="w-full" onClick={() => generate.mutate()} disabled={generate.isPending}>
            {generate.isPending ? "Generating…" : "Generate report"}
          </Button>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {preview && (
            <AiSummaryCard
              title={preview.title}
              content={preview.content}
              generatedAt={new Date().toISOString()}
            />
          )}

          <div className="rounded-xl border bg-surface">
            <div className="px-5 py-3 border-b">
              <h3 className="font-semibold">Report library</h3>
            </div>
            <ul className="divide-y">
              {(summariesQuery.data ?? []).map((r) => (
                <li key={r.id} className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <div className="font-medium">{r.title ?? `${r.scope} report`}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(r.created_at)} · {r.scope}
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => remove.mutate(r.id)}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                  {r.content && (
                    <div className="prose prose-sm max-w-none prose-headings:font-semibold prose-p:text-foreground/85 prose-li:text-foreground/85">
                      <ReactMarkdown>{r.content}</ReactMarkdown>
                    </div>
                  )}
                </li>
              ))}
              {!summariesQuery.isLoading && (summariesQuery.data ?? []).length === 0 && (
                <li className="p-10 text-center text-sm text-muted-foreground">
                  No reports yet. Generate your first audit report.
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
