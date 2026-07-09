import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useDropzone } from "react-dropzone";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { extractInvoice } from "@/lib/extract-invoice.functions";
import { scoreInvoice } from "@/lib/score-invoice.functions";
import { Button } from "@/components/ui/button";
import { UploadCloud, FileText, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/upload")({
  component: UploadPage,
});

type Step = "idle" | "uploading" | "extracting" | "scoring" | "done" | "error";

function UploadPage() {
  const navigate = useNavigate();
  const extractFn = useServerFn(extractInvoice);
  const scoreFn = useServerFn(scoreInvoice);
  const [step, setStep] = useState<Step>("idle");
  const [fileName, setFileName] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const onDrop = useCallback(
    async (accepted: File[]) => {
      const file = accepted[0];
      if (!file) return;
      setFileName(file.name);
      setErrorMsg(null);
      try {
        const { data: userRes } = await supabase.auth.getUser();
        if (!userRes.user) throw new Error("Not signed in");
        const uid = userRes.user.id;

        setStep("uploading");
        const path = `${uid}/${Date.now()}-${file.name}`;
        const { error: upErr } = await supabase.storage.from("invoices").upload(path, file);
        if (upErr) throw upErr;

        const { data: signed } = await supabase.storage
          .from("invoices")
          .createSignedUrl(path, 60 * 10);
        if (!signed?.signedUrl) throw new Error("Could not sign URL");

        setStep("extracting");
        const extracted = await extractFn({
          data: { fileUrl: signed.signedUrl, mimeType: file.type || "application/pdf" },
        });

        // Find or create vendor
        let vendorId: string | null = null;
        if (extracted.vendor_name) {
          const { data: existing } = await supabase
            .from("vendors")
            .select("id")
            .eq("user_id", uid)
            .eq("name", extracted.vendor_name)
            .maybeSingle();
          if (existing) vendorId = existing.id;
          else {
            const { data: v } = await supabase
              .from("vendors")
              .insert({
                user_id: uid,
                name: extracted.vendor_name,
                tax_id: extracted.vendor_tax_id,
                first_seen: extracted.invoice_date ?? new Date().toISOString().slice(0, 10),
              })
              .select("id")
              .single();
            vendorId = v?.id ?? null;
          }
        }

        // Insert invoice
        const { data: inv, error: invErr } = await supabase
          .from("invoices")
          .insert({
            user_id: uid,
            vendor_id: vendorId,
            vendor_name: extracted.vendor_name ?? "Unknown vendor",
            vendor_email: extracted.vendor_email,
            invoice_number: extracted.invoice_number ?? `AUTO-${Date.now()}`,
            invoice_date: extracted.invoice_date,
            due_date: extracted.due_date,
            currency: extracted.currency ?? "USD",
            subtotal: extracted.subtotal,
            tax_amount: extracted.tax_amount ?? 0,
            total_amount: extracted.total_amount ?? 0,
            po_number: extracted.po_number,
            file_path: path,
            file_type: file.type,
            extracted_json: extracted as unknown as Json,
            status: "processing",
          })
          .select("id")
          .single();
        if (invErr) throw invErr;

        // Insert line items
        if (extracted.line_items?.length && inv) {
          await supabase.from("invoice_line_items").insert(
            extracted.line_items.map((li) => ({
              invoice_id: inv.id,
              user_id: uid,
              description: li.description,
              quantity: li.quantity ?? 1,
              unit_price: li.unit_price ?? 0,
              total: li.line_total ?? 0,
              line_total: li.line_total ?? 0,
            })),
          );
        }

        setStep("scoring");
        await scoreFn({ data: { invoiceId: inv!.id } });

        setStep("done");
        toast.success("Invoice analyzed");
        setTimeout(() => navigate({ to: "/invoices/$id", params: { id: inv!.id } }), 700);
      } catch (err) {
        console.error(err);
        setErrorMsg(err instanceof Error ? err.message : "Upload failed");
        setStep("error");
      }
    },
    [extractFn, scoreFn, navigate],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/webp": [".webp"],
    },
    maxFiles: 1,
    disabled: step !== "idle" && step !== "error" && step !== "done",
  });

  return (
    <div className="p-6 lg:p-10 max-w-3xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Upload invoice</h1>
        <p className="text-sm text-muted-foreground">
          PDF, PNG, JPG, or WebP. The AI engine will extract fields and score the fraud risk.
        </p>
      </header>

      <div
        {...getRootProps()}
        className={`rounded-2xl border-2 border-dashed p-14 text-center transition cursor-pointer ${
          isDragActive ? "border-brand bg-brand/5" : "border-border bg-surface hover:border-brand/50"
        }`}
      >
        <input {...getInputProps()} />
        <UploadCloud className="size-10 mx-auto text-brand" />
        <p className="mt-3 font-medium">
          {isDragActive ? "Drop the file here" : "Drag & drop an invoice, or click to browse"}
        </p>
        <p className="text-xs text-muted-foreground mt-1">Up to 10MB per file</p>
      </div>

      {fileName && (
        <div className="rounded-xl border bg-surface p-5">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="size-5 text-brand" />
            <div className="min-w-0">
              <div className="font-medium truncate">{fileName}</div>
              <div className="text-xs text-muted-foreground">Processing pipeline</div>
            </div>
          </div>
          <ol className="space-y-2 text-sm">
            <StepRow label="Uploading document" state={stepState("uploading", step)} />
            <StepRow label="AI OCR extraction" state={stepState("extracting", step)} />
            <StepRow label="Fraud scoring & analysis" state={stepState("scoring", step)} />
          </ol>
          {step === "error" && (
            <div className="mt-4 text-sm text-risk-high">
              {errorMsg}
              <Button
                size="sm"
                variant="outline"
                className="ml-3"
                onClick={() => {
                  setStep("idle");
                  setFileName(null);
                }}
              >
                Try again
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function stepState(target: Step, current: Step): "pending" | "active" | "done" {
  const order: Step[] = ["uploading", "extracting", "scoring", "done"];
  const ti = order.indexOf(target);
  const ci = order.indexOf(current);
  if (current === "error") return ti < ci ? "done" : ti === ci ? "active" : "pending";
  if (ci > ti) return "done";
  if (ci === ti) return "active";
  return "pending";
}

function StepRow({ label, state }: { label: string; state: "pending" | "active" | "done" }) {
  return (
    <li className="flex items-center gap-3">
      {state === "done" ? (
        <CheckCircle2 className="size-4 text-risk-low" />
      ) : state === "active" ? (
        <Loader2 className="size-4 animate-spin text-brand" />
      ) : (
        <div className="size-4 rounded-full border-2 border-muted" />
      )}
      <span className={state === "pending" ? "text-muted-foreground" : ""}>{label}</span>
    </li>
  );
}
