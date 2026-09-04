import type { Ledger } from "../ledger/ledger";
import type { Account } from "../ledger/types";
import type { AgentProposal } from "./types";
import type { ProposalDisposition } from "../books";
import { snapshot, closeChecklist, type Period } from "../metrics";
import { formatAmount } from "../format";

/**
 * Every answer carries the entries it was computed from. A figure with no
 * citation is a figure nobody can check, and on financial data that is the
 * difference between a tool and a rumour — so a tool that cannot cite the
 * ledger returns no answer rather than an unsupported one.
 */
export interface ToolResult {
  answer: string;
  citations: Array<{ label: string; entryId: string }>;
}

export interface ToolContext {
  ledger: Ledger;
  accounts: Account[];
  proposals: AgentProposal[];
  dispositions: Record<string, ProposalDisposition>;
  unmatchedCount: number;
  balanced: boolean;
  period: Period;
  priorPeriod: Period;
}

export interface Tool {
  name: string;
  description: string;
  run: (ctx: ToolContext, argument?: string) => ToolResult | null;
}

function entriesTouching(ledger: Ledger, accountId: string, period?: Period) {
  return ledger.getEntries().filter((entry) => {
    if (period && (entry.date < period.start || entry.date > period.end)) return false;
    return entry.lines.some((line) => line.accountId === accountId);
  });
}

function findAccount(accounts: Account[], term: string): Account | undefined {
  const needle = term.toLowerCase();
  return accounts.find(
    (a) => a.name.toLowerCase().includes(needle) || a.id.toLowerCase().includes(needle)
  );
}

export const TOOLS: Tool[] = [
  {
    name: "account_balance",
    description: "The balance of a named account as of the end of the period.",
    run: (ctx, argument) => {
      if (!argument) return null;
      const account = findAccount(ctx.accounts, argument);
      if (!account) return null;

      const balance = ctx.ledger.balanceAsOf(account.id, ctx.period.end);
      const natural =
        account.type === "revenue" || account.type === "liability" || account.type === "equity"
          ? -balance
          : balance;

      const backing = entriesTouching(ctx.ledger, account.id);
      return {
        answer: `${account.name} stands at ${formatAmount(natural)} as of ${ctx.period.end}, across ${backing.length} ${backing.length === 1 ? "entry" : "entries"}.`,
        citations: backing.slice(-5).map((e) => ({ label: e.memo, entryId: e.id })),
      };
    },
  },
  {
    name: "period_activity",
    description: "How much moved through an account during the current period.",
    run: (ctx, argument) => {
      if (!argument) return null;
      const account = findAccount(ctx.accounts, argument);
      if (!account) return null;

      const raw = ctx.ledger.activityBetween(account.id, ctx.period.start, ctx.period.end);
      const natural = account.type === "revenue" || account.type === "liability" ? -raw : raw;
      const backing = entriesTouching(ctx.ledger, account.id, ctx.period);

      if (backing.length === 0) {
        return {
          answer: `Nothing posted to ${account.name} between ${ctx.period.start} and ${ctx.period.end}.`,
          citations: [],
        };
      }

      return {
        answer: `${formatAmount(natural)} moved through ${account.name} this period, across ${backing.length} ${backing.length === 1 ? "entry" : "entries"}.`,
        citations: backing.map((e) => ({ label: e.memo, entryId: e.id })),
      };
    },
  },
  {
    name: "burn_and_runway",
    description: "Cash burn for the period and how long the current balance lasts.",
    run: (ctx) => {
      const snap = snapshot(ctx.ledger, ctx.accounts, ctx.period, ctx.priorPeriod);
      const cashEntries = entriesTouching(ctx.ledger, "cash", ctx.period);

      const answer =
        snap.runwayMonths === null
          ? `Cash grew by ${formatAmount(-snap.netBurn)} this period — ${formatAmount(snap.grossBurn)} went out and more came in — so there is no runway to count down.`
          : `Net burn is ${formatAmount(snap.netBurn)} against ${formatAmount(snap.cash)} of cash, which is about ${snap.runwayMonths.toFixed(0)} months.`;

      return {
        answer,
        citations: cashEntries.map((e) => ({ label: e.memo, entryId: e.id })),
      };
    },
  },
  {
    name: "pending_work",
    description: "What is still waiting on a human before the period can close.",
    run: (ctx) => {
      const pending = ctx.proposals.filter((p) => !ctx.dispositions[p.id]);
      const posts = pending.filter((p) => p.suggestedLines.length > 0).length;

      if (pending.length === 0 && ctx.unmatchedCount === 0) {
        return { answer: "Nothing is waiting. Every proposal is decided and every line is categorised.", citations: [] };
      }

      return {
        answer: `${pending.length} ${pending.length === 1 ? "proposal is" : "proposals are"} open — ${posts} would post an entry, the rest are advisory — and ${ctx.unmatchedCount} bank ${ctx.unmatchedCount === 1 ? "line has" : "lines have"} no category yet.`,
        citations: [],
      };
    },
  },
  {
    name: "close_status",
    description: "How far along the period close is, and what is blocking it.",
    run: (ctx) => {
      const pending = ctx.proposals.filter((p) => !ctx.dispositions[p.id]).length;
      const checklist = closeChecklist(ctx.ledger, ctx.accounts, ctx.period, {
        linesNeedingReview: ctx.unmatchedCount,
        pendingProposals: pending,
        balanced: ctx.balanced,
      });
      const done = checklist.filter((c) => c.done);
      const blocking = checklist.filter((c) => !c.done);

      return {
        answer:
          blocking.length === 0
            ? `The close is complete: all ${checklist.length} checks pass.`
            : `${done.length} of ${checklist.length} checks pass. Still blocking: ${blocking.map((b) => b.label.toLowerCase()).join("; ")}.`,
        citations: [],
      };
    },
  },
];

const INTENTS: Array<{ tool: string; test: RegExp; argumentFrom?: RegExp }> = [
  { tool: "burn_and_runway", test: /\b(burn|runway|how long|cash last)\b/i },
  { tool: "close_status", test: /\b(close|checklist|month end|ready)\b/i },
  { tool: "pending_work", test: /\b(pending|waiting|needs? (me|action|approval)|to ?do|open)\b/i },
  {
    tool: "period_activity",
    test: /\b(spend|spent|moved|activity|this (month|period))\b/i,
    argumentFrom: /\b(?:on|through|in|for)\s+([a-z ]+?)(?:\s+this|\?|$)/i,
  },
  {
    tool: "account_balance",
    test: /\b(balance|how much|what is|whats|what's)\b/i,
    argumentFrom: /\b(?:balance of|much|is|in)\s+([a-z ]+?)(?:\s+(?:as of|now|today))?[?.]?$/i,
  },
];

export interface Answer {
  tool: string | null;
  result: ToolResult | null;
  /** Why nothing was answered, when nothing was. */
  refusal?: string;
}

/**
 * Routes a question to a tool by intent. This is deliberately a matcher and not
 * a model: it either recognises a question and answers it from the ledger, or
 * says it cannot. The alternative — guessing — is the failure mode that makes
 * financial software untrustworthy, and swapping this for an LLM later changes
 * how the tool is chosen, not what the tool is allowed to invent.
 */
export function answerQuestion(question: string, ctx: ToolContext): Answer {
  const trimmed = question.trim();
  if (!trimmed) return { tool: null, result: null, refusal: "Ask a question about these books." };

  for (const intent of INTENTS) {
    if (!intent.test.test(trimmed)) continue;

    const tool = TOOLS.find((t) => t.name === intent.tool);
    if (!tool) continue;

    const argument = intent.argumentFrom
      ? trimmed.match(intent.argumentFrom)?.[1]?.trim()
      : undefined;

    const result = tool.run(ctx, argument);
    if (result) return { tool: tool.name, result };
  }

  return {
    tool: null,
    result: null,
    refusal:
      "That is not something these tools can answer from the ledger yet. Try asking about a balance, what moved this period, burn and runway, what is pending, or the close.",
  };
}
