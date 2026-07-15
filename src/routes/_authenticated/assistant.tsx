import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useRef, useState } from "react";
import { Mic, Volume2, Sparkles, ShieldCheck, AlertTriangle, Loader2, Send } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/assistant")({
  component: VoiceAssistantPage,
});

// Minimal Web Speech API typing
type SR = {
  new (): {
    lang: string;
    interimResults: boolean;
    continuous: boolean;
    onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
    onerror: (e: unknown) => void;
    onend: () => void;
    start: () => void;
    stop: () => void;
  };
};

const suggestions = [
  "Explain this invoice",
  "Is this invoice genuine or fake?",
  "Why was this invoice flagged?",
  "Highlight duplicate invoices",
  "Summarize suspicious invoices",
  "Explain GST and vendor details",
];

function VoiceAssistantPage() {
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const recRef = useRef<InstanceType<SR> | null>(null);
  const supportedRef = useRef<boolean>(false);

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

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: SR; webkitSpeechRecognition?: SR };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    supportedRef.current = !!Ctor;
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = "en-IN";
    rec.interimResults = true;
    rec.continuous = true;
    rec.onresult = (e) => {
      let finalText = "";
      let interimText = "";
      for (let i = 0; i < e.results.length; i++) {
        const res = e.results[i] as ArrayLike<{ transcript: string }> & { isFinal?: boolean };
        const t = res[0].transcript;
        if ((res as { isFinal?: boolean }).isFinal) finalText += t;
        else interimText += t;
      }
      if (finalText) setInput((p) => (p ? p + " " : "") + finalText.trim());
      setInterim(interimText);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => {
      setListening(false);
      setInterim("");
    };
    recRef.current = rec;
    return () => {
      try { rec.stop(); } catch { /* noop */ }
    };
  }, []);

  function startListening() {
    if (!recRef.current || listening) return;
    setInput("");
    setInterim("");
    setListening(true);
    try { recRef.current.start(); } catch { /* noop */ }
  }

  async function stopAndSend() {
    if (recRef.current && listening) {
      try { recRef.current.stop(); } catch { /* noop */ }
    }
    setListening(false);
    // small delay to allow final result
    setTimeout(async () => {
      const text = (input + " " + interim).trim();
      setInterim("");
      if (text) {
        setInput("");
        await sendMessage({ text });
      }
    }, 150);
  }

  async function submitText(text: string) {
    if (!text.trim() || isLoading) return;
    setInput("");
    await sendMessage({ text: text.trim() });
  }

  function speak(text: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "en-IN";
    utter.rate = 1;
    window.speechSynthesis.speak(utter);
  }

  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
  const lastAssistantText = lastAssistant?.parts.map((p) => (p.type === "text" ? p.text : "")).join("") ?? "";
  const risk = detectRisk(lastAssistantText);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#05070f] text-white">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[600px] w-[900px] rounded-full bg-cyan-500/20 blur-[140px]" />
        <div className="absolute top-1/3 -left-40 h-[400px] w-[400px] rounded-full bg-blue-600/25 blur-[140px]" />
        <div className="absolute bottom-0 right-0 h-[500px] w-[500px] rounded-full bg-indigo-500/20 blur-[140px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.05)_1px,transparent_0)] [background-size:32px_32px]" />
        <Particles />
      </div>

      <div className="relative mx-auto max-w-5xl px-6 py-10 lg:py-14">
        {/* Hero */}
        <div className="flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-widest text-cyan-300/90 backdrop-blur">
            <Sparkles className="size-3" /> InvoiceGuard Voice AI
          </div>
          <h1 className="mt-5 text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
            Talk to Your AI Invoice Assistant
          </h1>
          <p className="mt-4 max-w-2xl text-sm md:text-base text-white/60 leading-relaxed">
            Press and hold the microphone to ask questions about your invoices. Our AI understands
            natural language, analyzes invoice details, detects fraud, explains every field, verifies
            authenticity, and provides instant insights using advanced artificial intelligence.
          </p>

          {/* Mic */}
          <div className="relative mt-12 grid place-items-center">
            {/* pulsing rings */}
            <div className={cn("absolute rounded-full bg-cyan-400/20 blur-2xl transition-all", listening ? "size-72 animate-pulse" : "size-56")} />
            <div className={cn("absolute size-56 rounded-full border border-cyan-400/30", listening && "animate-ping")} />
            <div className={cn("absolute size-44 rounded-full border border-cyan-300/40", listening && "animate-ping [animation-delay:200ms]")} />
            <div className={cn("absolute size-32 rounded-full border border-white/20", listening && "animate-ping [animation-delay:400ms]")} />

            <button
              onMouseDown={startListening}
              onMouseUp={stopAndSend}
              onMouseLeave={() => listening && stopAndSend()}
              onTouchStart={(e) => { e.preventDefault(); startListening(); }}
              onTouchEnd={(e) => { e.preventDefault(); stopAndSend(); }}
              disabled={isLoading}
              className={cn(
                "relative size-28 md:size-32 rounded-full grid place-items-center transition-all duration-300",
                "bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600",
                "shadow-[0_0_60px_-5px_rgba(56,189,248,0.7)] hover:shadow-[0_0_90px_-5px_rgba(56,189,248,0.9)]",
                "active:scale-95 disabled:opacity-60",
                listening && "scale-110 shadow-[0_0_120px_-5px_rgba(56,189,248,1)]",
              )}
              aria-label="Hold to talk"
            >
              <Mic className="size-10 md:size-12 text-white drop-shadow" />
              {listening && (
                <span className="absolute inset-0 rounded-full ring-4 ring-cyan-300/60 animate-pulse" />
              )}
            </button>
          </div>

          {/* Status */}
          <div className="mt-6 h-10 flex items-center gap-3">
            {listening ? (
              <>
                <SoundWaves />
                <span className="text-cyan-300 text-sm font-medium tracking-wide">Listening…</span>
              </>
            ) : isLoading ? (
              <span className="text-white/70 text-sm flex items-center gap-2"><Loader2 className="size-4 animate-spin" /> Thinking…</span>
            ) : (
              <span className="text-white/40 text-xs">
                {supportedRef.current ? "Press and hold the mic to speak" : "Voice input not supported — type below"}
              </span>
            )}
          </div>

          {/* Live transcript */}
          {(input || interim) && (
            <div className="mt-2 max-w-2xl rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 backdrop-blur">
              {input} <span className="text-cyan-300/80">{interim}</span>
            </div>
          )}

          {/* Text fallback */}
          <form
            onSubmit={(e) => { e.preventDefault(); submitText(input); }}
            className="mt-6 w-full max-w-2xl flex gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="…or type a question"
              disabled={isLoading}
              className="flex-1 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-cyan-400/50 backdrop-blur"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="rounded-full bg-white/10 hover:bg-white/20 border border-white/10 px-4 grid place-items-center disabled:opacity-40"
            >
              <Send className="size-4" />
            </button>
          </form>

          {/* Suggestions */}
          {messages.length === 0 && (
            <div className="mt-8 flex flex-wrap justify-center gap-2 max-w-3xl">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => submitText(s)}
                  className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs text-white/70 hover:text-white hover:bg-white/10 hover:border-cyan-400/40 transition backdrop-blur"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Response panel */}
        {lastAssistant && (
          <div className="mt-14">
            <div className="relative rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-6 md:p-8 shadow-[0_0_60px_-20px_rgba(56,189,248,0.4)]">
              <div className="flex items-start gap-4">
                <div className="size-11 shrink-0 rounded-2xl bg-gradient-to-br from-cyan-400 to-indigo-600 grid place-items-center shadow-lg">
                  <Sparkles className="size-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="font-semibold">InvoiceGuard AI</div>
                    <RiskChip level={risk.level} />
                    <span className="text-xs text-white/50">Confidence · {risk.confidence}%</span>
                    <button
                      onClick={() => speak(lastAssistantText)}
                      className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70 hover:bg-white/10"
                    >
                      <Volume2 className="size-3.5" /> Play
                    </button>
                  </div>
                  <div className="prose prose-invert prose-sm mt-3 max-w-none prose-p:text-white/85 prose-strong:text-white prose-li:text-white/80">
                    <ReactMarkdown>{lastAssistantText}</ReactMarkdown>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Transcript history (older) */}
        {messages.length > 1 && (
          <div className="mt-8 space-y-4">
            <div className="text-xs uppercase tracking-widest text-white/40">Conversation</div>
            {messages.slice(0, -1).map((m) => {
              const text = m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
              const isUser = m.role === "user";
              return (
                <div key={m.id} className={cn("flex", isUser ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-4 py-3 text-sm backdrop-blur border",
                      isUser
                        ? "bg-gradient-to-br from-cyan-500/30 to-blue-600/30 border-cyan-400/30 text-white"
                        : "bg-white/[0.04] border-white/10 text-white/85",
                    )}
                  >
                    {isUser ? (
                      <p className="whitespace-pre-wrap">{text}</p>
                    ) : (
                      <div className="prose prose-invert prose-sm max-w-none prose-p:text-white/85">
                        <ReactMarkdown>{text}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function SoundWaves() {
  return (
    <div className="flex items-end gap-1 h-8">
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <span
          key={i}
          className="w-1 rounded-full bg-gradient-to-t from-cyan-400 to-blue-300 animate-pulse"
          style={{
            height: `${30 + ((i * 37) % 60)}%`,
            animationDelay: `${i * 90}ms`,
            animationDuration: "700ms",
          }}
        />
      ))}
    </div>
  );
}

function Particles() {
  const dots = Array.from({ length: 24 });
  return (
    <div className="absolute inset-0 overflow-hidden">
      {dots.map((_, i) => (
        <span
          key={i}
          className="absolute size-1 rounded-full bg-cyan-300/40 animate-pulse"
          style={{
            top: `${(i * 53) % 100}%`,
            left: `${(i * 37) % 100}%`,
            animationDelay: `${(i % 6) * 400}ms`,
            animationDuration: `${2000 + (i % 5) * 500}ms`,
          }}
        />
      ))}
    </div>
  );
}

function RiskChip({ level }: { level: "low" | "medium" | "high" }) {
  const map = {
    low: { c: "text-emerald-300 border-emerald-400/40 bg-emerald-500/10", Icon: ShieldCheck, label: "Low Risk" },
    medium: { c: "text-amber-300 border-amber-400/40 bg-amber-500/10", Icon: AlertTriangle, label: "Medium Risk" },
    high: { c: "text-rose-300 border-rose-400/40 bg-rose-500/10", Icon: AlertTriangle, label: "High Risk" },
  } as const;
  const { c, Icon, label } = map[level];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs", c)}>
      <Icon className="size-3" /> {label}
    </span>
  );
}

function detectRisk(text: string): { level: "low" | "medium" | "high"; confidence: number } {
  const t = text.toLowerCase();
  if (/high risk|fraud|fake|manipulat|suspicious/.test(t)) return { level: "high", confidence: 92 };
  if (/medium risk|unusual|anomaly|flagged|duplicate/.test(t)) return { level: "medium", confidence: 84 };
  return { level: "low", confidence: 96 };
}
