import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText, Output, NoObjectGeneratedError } from "ai";
import { z } from "zod";
import { createLovableGateway } from "@/lib/ai-gateway.server";

const ScoreInput = z.object({ invoiceId: z.string().uuid() });

const ScoreSchema = z.object({
  fraud_score: z.number(),
  risk_level: z.enum(["low", "medium", "high"]),
  duplicate_risk: z.number(),
  price_anomaly_risk: z.number(),
  vendor_risk: z.number(),
  flags: z.array(
    z.object({
      code: z.string(),
      label: z.string(),
      severity: z.enum(["low", "medium", "high"]),
      detail: z.string(),
    }),
  ),
  narrative: z.string(),
  recommendation: z.string(),
});

export const scoreInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ScoreInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: invoice, error: invErr } = await supabase
      .from("invoices")
      .select("*, invoice_line_items(*), vendors(*)")
      .eq("id", data.invoiceId)
      .maybeSingle();

    if (invErr || !invoice) throw new Error("Invoice not found");

    // Check for duplicates from same vendor within user's data
    const { data: duplicates } = await supabase
      .from("invoices")
      .select("id, invoice_number, total_amount, invoice_date")
      .eq("user_id", userId)
      .eq("vendor_id", invoice.vendor_id ?? "")
      .neq("id", invoice.id);

    // Historical average per vendor for anomaly heuristic
    const { data: history } = await supabase
      .from("invoices")
      .select("total_amount")
      .eq("user_id", userId)
      .eq("vendor_id", invoice.vendor_id ?? "")
      .neq("id", invoice.id)
      .limit(50);

    const avgAmt =
      history && history.length > 0
        ? history.reduce((s, i) => s + Number(i.total_amount ?? 0), 0) / history.length
        : null;

    const gateway = createLovableGateway();
    const model = gateway("openai/gpt-5-mini");

    const prompt = `Assess this invoice for fraud risk.

INVOICE:
${JSON.stringify(
  {
    number: invoice.invoice_number,
    date: invoice.invoice_date,
    due: invoice.due_date,
    total: invoice.total_amount,
    subtotal: invoice.subtotal,
    tax: invoice.tax_amount,
    currency: invoice.currency,
    po: invoice.po_number,
    line_items: invoice.invoice_line_items,
  },
  null,
  2,
)}

VENDOR:
${JSON.stringify(invoice.vendors, null, 2)}

DUPLICATE CANDIDATES (same vendor):
${JSON.stringify(duplicates, null, 2)}

HISTORICAL AVERAGE TOTAL FOR THIS VENDOR: ${avgAmt ?? "n/a"}

Scoring rules:
- fraud_score: 0-100 (higher = more suspicious)
- risk_level: "low" (0-33), "medium" (34-66), "high" (67-100)
- duplicate_risk, price_anomaly_risk, vendor_risk: each 0-100
- flags: array of specific issues found (e.g. DUPLICATE_INVOICE_NUMBER, PRICE_ANOMALY, MISSING_PO, WEEKEND_DATE, ROUND_NUMBER_TOTAL, UNVERIFIED_VENDOR, TAX_MISCALCULATION)
- narrative: 2-3 sentence plain-English explanation
- recommendation: one of "Approve", "Hold for review", "Reject"`;

    try {
      const { output } = await generateText({
        model,
        output: Output.object({ schema: ScoreSchema }),
        prompt,
      });

      // Persist to invoice
      await supabase
        .from("invoices")
        .update({
          fraud_score: output.fraud_score,
          risk_level: output.risk_level,
          duplicate_risk: output.duplicate_risk,
          price_anomaly_risk: output.price_anomaly_risk,
          vendor_risk: output.vendor_risk,
          flags: output.flags,
          ai_narrative: output.narrative,
          ai_recommendation: output.recommendation,
          status: "analyzed",
          analyzed_at: new Date().toISOString(),
        })
        .eq("id", data.invoiceId);

      return output;
    } catch (err) {
      if (NoObjectGeneratedError.isInstance(err)) {
        throw new Error("AI scoring failed to return a valid response");
      }
      throw err;
    }
  });
