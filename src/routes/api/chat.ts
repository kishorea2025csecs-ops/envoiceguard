import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createLovableGateway } from "@/lib/ai-gateway.server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { messages } = (await request.json()) as { messages: UIMessage[] };
        if (!Array.isArray(messages)) {
          return new Response("Messages are required", { status: 400 });
        }

        // Read bearer to load a user-scoped supabase client for context
        const authHeader = request.headers.get("authorization");
        const token = authHeader?.replace(/^Bearer\s+/i, "");
        let contextData: unknown = null;
        if (token) {
          const supabase = createClient<Database>(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_PUBLISHABLE_KEY!,
            {
              global: { headers: { Authorization: `Bearer ${token}` } },
              auth: { persistSession: false, autoRefreshToken: false },
            },
          );
          const { data } = await supabase
            .from("invoices")
            .select(
              "invoice_number, vendor_name, total_amount, amount, currency, invoice_date, risk_level, fraud_score, ai_recommendation, status, flags",
            )
            .order("created_at", { ascending: false })
            .limit(50);
          contextData = data ?? [];
        }

        const gateway = createLovableGateway();
        const model = gateway("openai/gpt-5.5");

        const result = streamText({
          model,
          system: `You are the InvoiceGuard AI assistant, an expert in accounts payable fraud detection.
You help finance and audit teams understand fraud risk in their invoice portfolio.
Be concise, cite specific invoice numbers and dollar amounts, and use markdown.

USER'S RECENT INVOICE DATA (most recent 50):
${JSON.stringify(contextData).slice(0, 20000)}`,
          messages: await convertToModelMessages(messages),
        });

        return result.toUIMessageStreamResponse({
          originalMessages: messages,
        });
      },
    },
  },
});
