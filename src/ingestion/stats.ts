import type { BankBookingResult } from "./bank";

export function autoBookRate(results: BankBookingResult[]): number {
  if (results.length === 0) return 0;
  const autoBooked = results.filter((r) => r.autoBooked).length;
  return autoBooked / results.length;
}
