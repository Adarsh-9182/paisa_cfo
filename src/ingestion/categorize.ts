export interface CategorizationRule {
  accountId: string;
  keywords: string[];
}

export interface CategorizationResult {
  accountId: string;
  confidence: number;
  matchedKeyword: string;
}

function normalize(text: string): string {
  return text.toLowerCase();
}

/**
 * Words that appear on transactions of every kind. Learning one of these as a
 * rule is the failure that makes categorisation worse than having none: teach
 * the books that "neft" means Cloud Hosting and every future NEFT transfer —
 * payroll, rent, a customer payment — books itself to Cloud Hosting silently
 * and with full confidence.
 */
const GENERIC_TOKENS = new Set([
  "neft", "rtgs", "imps", "upi", "ach", "trf", "trfr", "transfer", "payment",
  "pmt", "txn", "ref", "dr", "cr", "misc", "inw", "otw", "chq", "cheque",
  "debit", "credit", "card", "bank", "account", "to", "from", "for", "the",
]);

/**
 * Proposes a keyword to learn from a description, or null when nothing in it is
 * distinctive enough to be safe. Pure digits are dropped because a reference
 * number matches exactly one transaction and would teach a rule that can never
 * fire again; generic banking words are dropped for the opposite reason.
 *
 * The longest survivor is usually the vendor or counterparty — the part a human
 * would actually recognise. This is a suggestion and not a decision: the caller
 * shows it to a person before anything is learned.
 */
export function suggestKeyword(description: string): string | null {
  const candidates = normalize(description)
    .split(/\W+/)
    .filter(Boolean)
    .filter((token) => token.length > 2)
    .filter((token) => !/^\d+$/.test(token))
    .filter((token) => !GENERIC_TOKENS.has(token));

  if (candidates.length === 0) return null;

  return candidates.reduce((longest, token) =>
    token.length > longest.length ? token : longest
  );
}

export class Categorizer {
  private rules: CategorizationRule[] = [];

  learn(accountId: string, keyword: string) {
    const normalized = normalize(keyword);
    const existing = this.rules.find((r) => r.accountId === accountId);
    if (existing) {
      if (!existing.keywords.includes(normalized)) existing.keywords.push(normalized);
    } else {
      this.rules.push({ accountId, keywords: [normalized] });
    }
  }

  categorize(description: string): CategorizationResult | null {
    const words = new Set(normalize(description).split(/\W+/).filter(Boolean));

    for (const rule of this.rules) {
      for (const keyword of rule.keywords) {
        if (words.has(keyword)) {
          return { accountId: rule.accountId, confidence: 1, matchedKeyword: keyword };
        }
      }
    }
    return null;
  }
}
