// All monetary values are displayed in INR (Indian Rupees) for the India market.
// Amounts stored in other currencies are converted using static reference rates.
const FX_TO_INR: Record<string, number> = {
  INR: 1,
  USD: 83.5,
  EUR: 90.2,
  GBP: 105.4,
  CAD: 61.2,
  AUD: 55.8,
  JPY: 0.56,
  SGD: 62.1,
  AED: 22.7,
};

function toInr(n: number, currency?: string) {
  const code = (currency || "USD").toUpperCase();
  const rate = FX_TO_INR[code] ?? 1;
  return n * rate;
}

export function formatCurrency(n: number, currency = "USD") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(toInr(n, currency));
}

export function formatCurrencyPrecise(n: number, currency = "USD") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(toInr(n, currency));
}

export function formatCompact(n: number) {
  return "₹" + new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export function formatDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
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
