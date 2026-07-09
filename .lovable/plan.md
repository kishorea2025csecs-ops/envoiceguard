## InvoiceGuard AI — Build Plan (updated)

An enterprise SaaS for real-time invoice fraud detection: upload → AI OCR extraction → AI fraud scoring → dashboard analytics → AI explanation chat → **AI-summarized reports** → downloadable exports.

Visual direction locked to the selected "High-fidelity institutional" prototype: dark slate-950 sidebar, white surfaces on `#F8FAFC`, blue `#0047FF` primary, red/amber/green risk semantics, Inter + JetBrains Mono.

---

### 1. Backend (Lovable Cloud)

Tables (all with RLS + explicit GRANTs):
- `profiles`, `user_roles` (admin/finance_manager/auditor) with `has_role()` SECURITY DEFINER
- `vendors` (name, tax_id, bank_account, first_seen, invoice_count, avg_amount)
- `invoices` (invoice_number, vendor, date, amount, tax, file_path, extracted_json, fraud_score, risk_level, fraud_reasons jsonb, recommendation)
- `invoice_line_items`
- `chat_messages`
- **`report_summaries`** (id, user_id, scope: `dashboard`|`invoice`|`audit_range`, scope_ref, period_start, period_end, tl_dr, key_insights jsonb, risks jsonb, recommendations jsonb, source_stats jsonb, model, created_at)

Trigger auto-creates profile + default role on signup. Private `invoices` storage bucket, RLS scoped to `auth.uid()`.

### 2. Auth
`/auth` email/password with role picker + Google OAuth via broker. `_authenticated/` layout gates the app. Root `onAuthStateChange` invalidates router.

### 3. AI server functions (createServerFn, Lovable AI Gateway)

- `extractInvoice` — `google/gemini-3-flash-preview` multimodal on PDF/image; xlsx parsed via `xlsx`. Returns structured JSON via `Output.object`.
- `scoreInvoice` — deterministic checks (duplicate, price anomaly vs vendor avg ±2σ, new-vendor) + `openai/gpt-5.5` synthesizes 0–100 score, risk level, reasons, recommendation.
- `explainInvoice` — streaming chat route `src/routes/api/chat.ts` with AI Elements; tool access to invoice + reasons.
- **`summarizeReport`** — new. Takes `{ scope, scope_ref?, period_start?, period_end? }`, gathers the corresponding data server-side (single invoice detail, dashboard KPIs + top risks, or an audit date range with vendor/risk rollups), and asks `openai/gpt-5.5` (structured output) for:
  - `tl_dr` (2–3 sentences)
  - `key_insights[]` (bulleted, ranked)
  - `top_risks[]` (with severity + affected invoice/vendor refs)
  - `recommendations[]` (concrete next actions)
  Persists to `report_summaries` and returns it. Cache-keyed by scope+range so repeat views are instant; "Regenerate" forces a fresh call.
- `generateReport` — server fn returning a PDF (pdf-lib) that embeds the AI summary at the top followed by the raw data tables.

### 4. Routes (`_authenticated/`)
- `/dashboard` — KPI cards, fraud trend area chart, risk donut, vendor risk bar, high-risk table, upload dropzone. **"AI Summary" card** at the top calling `summarizeReport({ scope: 'dashboard', period_start, period_end })` with a period selector and Regenerate button.
- `/invoices` — list, filters, search.
- `/invoices/$id` — extracted fields, gauge, reason cards, recommended action, history, right-rail AI chat, "Download Report" button. **"AI Summary" panel** calling `summarizeReport({ scope: 'invoice', scope_ref: id })`.
- `/upload` — drag/drop PDF/image/xlsx with Extracting → Scoring → Done progress.
- `/vendors` — vendor risk table.
- `/reports` — date-range picker → shows AI-generated audit summary (`summarizeReport({ scope: 'audit_range', ... })`) then a table of underlying invoices, with "Export PDF" (summary + data) and "Export CSV".
- `/settings` — profile, role (admin can promote users).

### 5. AI Report Summarizer UX
Reusable `<AiSummaryCard>` component used on dashboard, invoice detail, and reports pages:
- Header: title + period + `model` badge + Regenerate icon button.
- Body: TL;DR paragraph, then collapsible sections for Key Insights / Top Risks (red/amber chips) / Recommendations.
- Loading: Shimmer skeleton via AI Elements shimmer.
- Errors: inline retry, 402/429 surfaced with clear copy.
- "Copy summary" and "Download as PDF" actions.

### 6. Layout shell
Fixed dark sidebar + top header + main + optional right rail. Mobile: sidebar → sheet. Light/dark mode toggle.

### 7. Sample data
Migration seeds 40 realistic invoices across 8 vendors over 90 days with duplicates, price spikes, and unknown-vendor cases so summaries have real signal on first login.

### 8. Design tokens & metadata
Update `src/styles.css` with brand/risk oklch tokens; load Inter + JetBrains Mono via `<link>` in `__root.tsx`; set real title/description/OG tags for "InvoiceGuard AI — Real-Time Invoice Fraud Detection".

### Technical notes
- Summaries use AI SDK `Output.object` with `structuredOutputs: true` on OpenAI provider; guarded with `NoObjectGeneratedError` fallback to plain text.
- All summary inputs assembled server-side under `requireSupabaseAuth` — RLS ensures the user only summarizes their own data.
- Charts: Recharts with semantic tokens; no hardcoded colors.

Ready to build?