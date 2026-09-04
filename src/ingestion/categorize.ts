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
