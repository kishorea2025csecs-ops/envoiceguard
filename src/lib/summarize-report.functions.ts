import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableGateway } from "@/lib/ai-gateway.server";

const SummarizeInput = z.object({
  scope: z.enum(["dashboard", "invoice", "audit_range"]),
  invoiceId: z.string().uuid().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  save: z.boolean().default(true),
});

export const summarizeReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SummarizeInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    let dataSnapshot: unknown;
    let title: string;

    if (data.scope === "invoice" && data.invoiceId) {
      const { data: inv } = await supabase
        .from("invoices")
        .select("*, invoice_line_items(*), vendors(*)")
        .eq("id", data.invoiceId)
        .maybeSingle();
      if (!inv) throw new Error("Invoice not found");
      title = `Invoice ${inv.invoice_number ?? inv.id.slice(0, 8)}`;
      dataSnapshot = inv;
    } else {
      const q = supabase
        .from("invoices")
        .select("id, invoice_number, vendor_name, total_amount, currency, invoice_date, risk_level, fraud_score, status, flags, ai_recommendation")
        .eq("user_id", userId)
        .order("invoice_date", { ascending: false })
        .limit(200);
      if (data.dateFrom) q.gte("invoice_date", data.dateFrom);
      if (data.dateTo) q.lte("invoice_date", data.dateTo);
      const { data: invs } = await q;
      title =
        data.scope === "audit_range"
          ? `Audit report ${data.dateFrom ?? "all"} → ${data.dateTo ?? "now"}`
          : "Portfolio overview";
      dataSnapshot = invs ?? [];
    }

    const gateway = createLovableGateway();
    const model = gateway("openai/gpt-5.5");

    const prompt = `You are the AI Report Summarizer for InvoiceGuard AI. Produce a crisp executive summary of the data below.

Format as markdown with these sections:
### TL;DR
One or two sentences with the headline finding.

### Key insights
- 3-5 bullet points, each with a concrete number.

### Top risks
- List highest-severity items with reasoning and dollar impact.

### Recommendations
- 2-4 clear next actions.

Keep it under ~250 words. Be direct. Use dollar figures.

DATA:
${JSON.stringify(dataSnapshot).slice(0, 40000)}`;

    const { text } = await generateText({
      model,
      prompt,
      providerOptions: { lovable: { service_tier: "priority" } },
    });

    if (data.save) {
      await supabase.from("report_summaries").insert({
        user_id: userId,
        scope: data.scope,
        title,
        content: text,
        invoice_id: data.invoiceId ?? null,
        date_from: data.dateFrom ?? null,
        date_to: data.dateTo ?? null,
      });
    }

    return { title, content: text, generatedAt: new Date().toISOString() };
  });
