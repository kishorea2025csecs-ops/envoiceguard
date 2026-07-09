import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SAMPLE_VENDORS = [
  { name: "Acme Office Supplies", tax_id: "US-84-2957501", trusted: true },
  { name: "Northwind Cloud Services", tax_id: "US-27-1938471", trusted: true },
  { name: "Meridian Consulting LLC", tax_id: "US-11-4488712", trusted: true },
  { name: "Vector Logistics", tax_id: "US-98-2761009", trusted: false },
  { name: "Globex Marketing", tax_id: null, trusted: false },
];

const SAMPLE_INVOICES = [
  { vendor: 0, num: "INV-24081", days_ago: 3, amount: 4820, risk: "low" as const, score: 12, flags: [] },
  { vendor: 1, num: "NW-100294", days_ago: 5, amount: 12450, risk: "low" as const, score: 18, flags: [] },
  { vendor: 2, num: "MC-2024-88", days_ago: 7, amount: 26400, risk: "medium" as const, score: 52, flags: [{ code: "MISSING_PO", label: "Missing PO reference", severity: "medium", detail: "No purchase order attached to this invoice." }] },
  { vendor: 3, num: "VL-778211", days_ago: 9, amount: 89750, risk: "high" as const, score: 87, flags: [
    { code: "PRICE_ANOMALY", label: "Unusual price vs vendor average", severity: "high", detail: "Total is 4.2× the historical average for this vendor." },
    { code: "UNVERIFIED_VENDOR", label: "Vendor not fully verified", severity: "medium", detail: "Vendor tax ID has never been confirmed." },
  ] },
  { vendor: 4, num: "GMX-4402", days_ago: 12, amount: 32000, risk: "high" as const, score: 91, flags: [
    { code: "DUPLICATE_INVOICE_NUMBER", label: "Duplicate invoice number", severity: "high", detail: "Invoice number was submitted twice within 30 days." },
    { code: "MISSING_TAX_ID", label: "Missing tax identifier", severity: "high", detail: "Vendor has no tax ID on file." },
  ] },
  { vendor: 0, num: "INV-24102", days_ago: 15, amount: 3210, risk: "low" as const, score: 9, flags: [] },
  { vendor: 1, num: "NW-100311", days_ago: 20, amount: 12450, risk: "medium" as const, score: 44, flags: [{ code: "ROUND_NUMBER_TOTAL", label: "Suspiciously round total", severity: "low", detail: "Total is a perfectly round number." }] },
  { vendor: 2, num: "MC-2024-91", days_ago: 26, amount: 18800, risk: "low" as const, score: 22, flags: [] },
];

export const seedSampleData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    // create vendors
    const vendorIds: string[] = [];
    for (const v of SAMPLE_VENDORS) {
      const { data } = await supabase
        .from("vendors")
        .insert({
          user_id: userId,
          name: v.name,
          tax_id: v.tax_id,
          is_trusted: v.trusted,
          first_seen: new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10),
        })
        .select("id")
        .single();
      if (data) vendorIds.push(data.id);
    }

    // create invoices
    for (const s of SAMPLE_INVOICES) {
      const invoiceDate = new Date(Date.now() - s.days_ago * 86400000).toISOString().slice(0, 10);
      const dueDate = new Date(Date.now() + (30 - s.days_ago) * 86400000).toISOString().slice(0, 10);
      const subtotal = s.amount * 0.92;
      const tax = s.amount - subtotal;

      const { data: inv } = await supabase
        .from("invoices")
        .insert({
          user_id: userId,
          vendor_id: vendorIds[s.vendor],
          vendor_name: SAMPLE_VENDORS[s.vendor].name,
          invoice_number: s.num,
          invoice_date: invoiceDate,
          due_date: dueDate,
          currency: "USD",
          subtotal,
          tax_amount: tax,
          total_amount: s.amount,
          po_number: s.vendor < 3 ? `PO-${1000 + s.vendor * 10 + s.days_ago}` : null,
          status: "analyzed",
          fraud_score: s.score,
          risk_level: s.risk,
          duplicate_risk: s.risk === "high" ? 78 : s.risk === "medium" ? 30 : 5,
          price_anomaly_risk: s.risk === "high" ? 82 : s.risk === "medium" ? 45 : 8,
          vendor_risk: s.risk === "high" ? 65 : s.risk === "medium" ? 28 : 4,
          flags: s.flags,
          ai_narrative:
            s.risk === "high"
              ? "This invoice shows multiple high-severity anomalies compared to the vendor's historical pattern. Recommend holding payment for manual verification."
              : s.risk === "medium"
                ? "Minor concerns detected. Review before approval."
                : "No fraud indicators detected. Safe to approve.",
          ai_recommendation:
            s.risk === "high" ? "Hold for review" : s.risk === "medium" ? "Hold for review" : "Approve",
          analyzed_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (inv) {
        await supabase.from("invoice_line_items").insert([
          {
            invoice_id: inv.id,
            user_id: userId,
            description: "Professional services — line 1",
            quantity: 1,
            unit_price: subtotal * 0.6,
            total: subtotal * 0.6,
            line_total: subtotal * 0.6,
          },
          {
            invoice_id: inv.id,
            user_id: userId,
            description: "Materials & fees",
            quantity: 2,
            unit_price: subtotal * 0.2,
            total: subtotal * 0.4,
            line_total: subtotal * 0.4,
          },
        ]);
      }
    }

    return { ok: true, count: SAMPLE_INVOICES.length };
  });
