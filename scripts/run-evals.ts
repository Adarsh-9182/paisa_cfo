import { runEvals } from "../src/ai/eval";
import { evalCases } from "../src/ai/evals/cases";

const summary = runEvals(evalCases);

for (const result of summary.results) {
  const status = result.passed ? "PASS" : "FAIL";
  console.log(`[${status}] ${result.name}${result.message ? ` — ${result.message}` : ""}`);
}

console.log(`\n${summary.passed}/${summary.total} passed (${(summary.accuracy * 100).toFixed(1)}%)`);

if (summary.failed > 0) {
  process.exit(1);
}
