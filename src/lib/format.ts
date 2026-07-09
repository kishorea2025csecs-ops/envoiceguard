export function formatCurrency(n: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatCurrencyPrecise(n: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n);
}

export function formatCompact(n: number) {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export function formatDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function riskColor(level: "low" | "medium" | "high") {
  if (level === "high") return "text-risk-high";
  if (level === "medium") return "text-risk-med";
  return "text-risk-low";
}

export function riskBg(level: "low" | "medium" | "high") {
  if (level === "high") return "bg-risk-high/10 text-risk-high";
  if (level === "medium") return "bg-risk-med/10 text-risk-med";
  return "bg-risk-low/10 text-risk-low";
}

export function riskLabel(level: "low" | "medium" | "high") {
  if (level === "high") return "Critical Risk";
  if (level === "medium") return "Medium Risk";
  return "Safe";
}
