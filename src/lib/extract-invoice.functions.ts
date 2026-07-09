import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText, Output, NoObjectGeneratedError } from "ai";
import { z } from "zod";
import { createLovableGateway } from "@/lib/ai-gateway.server";

const ExtractInput = z.object({
  fileUrl: z.string(),
  mimeType: z.string(),
});

const ExtractedSchema = z.object({
  vendor_name: z.string().nullable(),
  vendor_email: z.string().nullable(),
  vendor_tax_id: z.string().nullable(),
  invoice_number: z.string().nullable(),
  invoice_date: z.string().nullable(),
  due_date: z.string().nullable(),
  currency: z.string().nullable(),
  subtotal: z.number().nullable(),
  tax_amount: z.number().nullable(),
  total_amount: z.number().nullable(),
  po_number: z.string().nullable(),
  line_items: z
    .array(
      z.object({
        description: z.string(),
        quantity: z.number().nullable(),
        unit_price: z.number().nullable(),
        line_total: z.number().nullable(),
      }),
    )
    .nullable(),
});

export const extractInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ExtractInput.parse(input))
  .handler(async ({ data }) => {
    const gateway = createLovableGateway();
    const model = gateway("google/gemini-2.5-flash");

    try {
      const { output } = await generateText({
        model,
        output: Output.object({ schema: ExtractedSchema }),
        messages: [
          {
            role: "system",
            content:
              "You are an OCR system that extracts structured invoice data. Read the invoice image or PDF and return only the fields present. Use ISO date format YYYY-MM-DD. Numbers should be raw values without currency symbols. If a field is missing, return null.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Extract all invoice fields from this document." },
              // Gemini accepts image/pdf as file parts
              data.mimeType.startsWith("image/")
                ? { type: "image", image: new URL(data.fileUrl) }
                : { type: "file", data: new URL(data.fileUrl), mediaType: data.mimeType },
            ],
          },
        ],
      });
      return output;
    } catch (err) {
      if (NoObjectGeneratedError.isInstance(err)) {
        return {
          vendor_name: null,
          vendor_email: null,
          vendor_tax_id: null,
          invoice_number: null,
          invoice_date: null,
          due_date: null,
          currency: "USD",
          subtotal: null,
          tax_amount: null,
          total_amount: null,
          po_number: null,
          line_items: null,
        } satisfies z.infer<typeof ExtractedSchema>;
      }
      throw err;
    }
  });
