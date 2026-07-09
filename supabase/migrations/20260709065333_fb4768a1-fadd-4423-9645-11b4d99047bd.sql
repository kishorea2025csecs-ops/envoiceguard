
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS total_amount numeric,
  ADD COLUMN IF NOT EXISTS subtotal numeric,
  ADD COLUMN IF NOT EXISTS due_date date,
  ADD COLUMN IF NOT EXISTS po_number text,
  ADD COLUMN IF NOT EXISTS vendor_email text,
  ADD COLUMN IF NOT EXISTS ai_narrative text,
  ADD COLUMN IF NOT EXISTS ai_recommendation text,
  ADD COLUMN IF NOT EXISTS duplicate_risk numeric,
  ADD COLUMN IF NOT EXISTS price_anomaly_risk numeric,
  ADD COLUMN IF NOT EXISTS vendor_risk numeric,
  ADD COLUMN IF NOT EXISTS flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS analyzed_at timestamptz;

-- keep amount in sync with total_amount when only one is provided
CREATE OR REPLACE FUNCTION public.sync_invoice_amount()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.total_amount IS NULL AND NEW.amount IS NOT NULL THEN
    NEW.total_amount := NEW.amount;
  END IF;
  IF NEW.total_amount IS NOT NULL THEN
    NEW.amount := NEW.total_amount;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS sync_invoice_amount_trg ON public.invoices;
CREATE TRIGGER sync_invoice_amount_trg
  BEFORE INSERT OR UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.sync_invoice_amount();

ALTER TABLE public.invoice_line_items
  ADD COLUMN IF NOT EXISTS line_total numeric;

UPDATE public.invoice_line_items SET line_total = total WHERE line_total IS NULL;

ALTER TABLE public.report_summaries
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS content text,
  ADD COLUMN IF NOT EXISTS invoice_id uuid REFERENCES public.invoices(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS date_from date,
  ADD COLUMN IF NOT EXISTS date_to date;

-- tl_dr is required in the current schema; relax it so we can store markdown-only summaries
ALTER TABLE public.report_summaries ALTER COLUMN tl_dr DROP NOT NULL;
