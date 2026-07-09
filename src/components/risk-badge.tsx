import { cn } from "@/lib/utils";
import { riskBg, riskLabel } from "@/lib/format";

export function RiskBadge({
  level,
  score,
  size = "sm",
}: {
  level: "low" | "medium" | "high";
  score?: number | null;
  size?: "sm" | "lg";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium",
        riskBg(level),
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm",
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {riskLabel(level)}
      {score != null && <span className="opacity-70">· {Math.round(score)}</span>}
    </span>
  );
}

export function RiskScoreRing({ score, level }: { score: number; level: "low" | "medium" | "high" }) {
  const pct = Math.max(0, Math.min(100, score));
  const color =
    level === "high" ? "var(--color-risk-high)" : level === "medium" ? "var(--color-risk-med)" : "var(--color-risk-low)";
  return (
    <div
      className="relative size-32 rounded-full grid place-items-center"
      style={{
        background: `conic-gradient(${color} ${pct * 3.6}deg, var(--color-muted) 0)`,
      }}
    >
      <div className="absolute inset-2 rounded-full bg-surface grid place-items-center flex-col text-center">
        <div className="text-3xl font-semibold tabular-nums" style={{ color }}>
          {Math.round(score)}
        </div>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Risk score</div>
      </div>
    </div>
  );
}
