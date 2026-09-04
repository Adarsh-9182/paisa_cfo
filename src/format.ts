const whole = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const withPaise = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// Agents write prose a human reads next to formatted figures elsewhere in the
// product, so amounts are formatted here rather than left as raw numbers.
// Paise are shown only when they exist, so a whole-rupee figure does not carry
// a meaningless ".00" while a real fraction is never silently dropped.
// Currency is fixed to INR while the product is India-first; this is the one
// place that has to change when a second currency arrives.
export function formatAmount(value: number): string {
  return Number.isInteger(value) ? whole.format(value) : withPaise.format(value);
}

export function formatSignedAmount(value: number): string {
  return `${value >= 0 ? "+" : ""}${formatAmount(value)}`;
}
