export interface EvalOutcome {
  passed: boolean;
  message?: string;
}

export interface EvalCase {
  name: string;
  run: () => EvalOutcome;
}

export interface EvalResult {
  name: string;
  passed: boolean;
  message?: string;
}

export interface EvalSummary {
  total: number;
  passed: number;
  failed: number;
  accuracy: number;
  results: EvalResult[];
}

export function runEvals(cases: EvalCase[]): EvalSummary {
  const results: EvalResult[] = cases.map((c) => {
    const { passed, message } = c.run();
    return { name: c.name, passed, message };
  });

  const passed = results.filter((r) => r.passed).length;

  return {
    total: results.length,
    passed,
    failed: results.length - passed,
    accuracy: results.length === 0 ? 0 : passed / results.length,
    results,
  };
}
