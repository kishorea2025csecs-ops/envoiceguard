import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Sparkles, MessageSquare, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";

export const Route = createFileRoute("/_authenticated/assistant")({
  component: AssistantPage,
});

const suggestions = [
  "Which invoices have the highest fraud risk right now?",
  "Summarize duplicate invoice risk across all vendors.",
  "Which vendors have unusual pricing patterns?",
  "How should I prioritize this week's invoice reviews?",
];

function AssistantPage() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      fetch: async (url, init) => {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        const headers = new Headers(init?.headers);
        if (token) headers.set("Authorization", `Bearer ${token}`);
        return fetch(url, { ...init, headers });
      },
    }),
  });
  const isLoading = status === "submitted" || status === "streaming";

  async function submit(text: string) {
    if (!text.trim() || isLoading) return;
    setInput("");
    await sendMessage({ text: text.trim() });
  }

  return (
    <div className="flex flex-col h-[calc(100vh-0px)] lg:h-screen">
      <header className="border-b bg-surface px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <div className="size-9 rounded-lg bg-brand/10 text-brand grid place-items-center">
            <Sparkles className="size-4" />
          </div>
          <div>
            <h1 className="font-semibold">AI Explanation Assistant</h1>
            <p className="text-xs text-muted-foreground">
              Ask about your invoices, vendors, or fraud patterns.
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          {messages.length === 0 && (
            <div className="text-center py-14">
              <div className="size-14 mx-auto rounded-2xl bg-brand/10 text-brand grid place-items-center mb-4">
                <MessageSquare className="size-6" />
              </div>
              <h2 className="text-lg font-semibold">Start a conversation</h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Get context on any invoice, ask why the AI flagged it, or explore trends.
              </p>
              <div className="grid sm:grid-cols-2 gap-2 max-w-xl mx-auto mt-6">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => submit(s)}
                    className="text-left text-sm rounded-lg border bg-surface px-4 py-3 hover:border-brand/50 hover:bg-brand/5 transition"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => {
            const text = m.parts
              .map((p) => (p.type === "text" ? p.text : ""))
              .join("");
            return (
              <div
                key={m.id}
                className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}
              >
                {m.role !== "user" && (
                  <div className="size-8 rounded-lg bg-brand/10 text-brand grid place-items-center shrink-0">
                    <Sparkles className="size-4" />
                  </div>
                )}
                <div
                  className={`rounded-2xl px-4 py-3 max-w-[80%] ${
                    m.role === "user"
                      ? "bg-brand text-brand-foreground"
                      : "bg-surface border"
                  }`}
                >
                  {m.role === "user" ? (
                    <p className="text-sm whitespace-pre-wrap">{text}</p>
                  ) : (
                    <div className="prose prose-sm max-w-none prose-p:text-foreground/85 prose-li:text-foreground/85">
                      <ReactMarkdown>{text}</ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {isLoading && messages[messages.length - 1]?.role === "user" && (
            <div className="flex gap-3">
              <div className="size-8 rounded-lg bg-brand/10 text-brand grid place-items-center">
                <Loader2 className="size-4 animate-spin" />
              </div>
              <div className="rounded-2xl px-4 py-3 bg-surface border text-sm text-muted-foreground">
                Thinking…
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="border-t bg-surface px-6 py-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(input);
          }}
          className="max-w-4xl mx-auto flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your invoices..."
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            <Send className="size-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
