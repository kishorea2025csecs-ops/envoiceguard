import { Sparkles, Loader2, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";

interface AiSummaryCardProps {
  title?: string;
  loading?: boolean;
  content?: string | null;
  generatedAt?: string | null;
  onRegenerate?: () => void;
  error?: string | null;
}

export function AiSummaryCard({
  title = "AI Summary",
  loading,
  content,
  generatedAt,
  onRegenerate,
  error,
}: AiSummaryCardProps) {
  return (
    <div className="rounded-xl border bg-gradient-to-br from-brand/5 via-surface to-surface p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-brand/10 text-brand grid place-items-center">
            <Sparkles className="size-4" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">{title}</h3>
            {generatedAt && (
              <p className="text-[10px] text-muted-foreground">
                Generated {new Date(generatedAt).toLocaleString()}
              </p>
            )}
          </div>
        </div>
        {onRegenerate && (
          <Button size="sm" variant="ghost" onClick={onRegenerate} disabled={loading}>
            {loading ? <Loader2 className="size-3 animate-spin" /> : <RefreshCcw className="size-3" />}
            <span className="ml-1 text-xs">{content ? "Regenerate" : "Generate"}</span>
          </Button>
        )}
      </div>

      {loading && !content && (
        <div className="space-y-2">
          <div className="h-3 bg-muted rounded animate-pulse w-3/4" />
          <div className="h-3 bg-muted rounded animate-pulse w-full" />
          <div className="h-3 bg-muted rounded animate-pulse w-5/6" />
        </div>
      )}

      {error && <p className="text-sm text-risk-high">{error}</p>}

      {content && (
        <div className="prose prose-sm max-w-none prose-headings:font-semibold prose-headings:text-foreground prose-p:text-foreground/85 prose-li:text-foreground/85 prose-strong:text-foreground">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      )}

      {!loading && !content && !error && (
        <p className="text-sm text-muted-foreground">
          Click Generate to have AI summarize this in seconds.
        </p>
      )}
    </div>
  );
}
