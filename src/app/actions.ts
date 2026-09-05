"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { buildDemoBooks } from "@/demo/books";
import { bankEntryLines } from "@/ingestion/bank";
import type { Command } from "@/persistence/commands";
import { LOG_COOKIE, readUserCommands } from "./session";

const CLOSE_DATE = "2026-09-30";
const ACTOR = "you";

// A cookie caps out around 4KB and a command is a few hundred bytes. Keeping a
// bound here means a long session degrades by forgetting its oldest decision
// rather than by silently failing to save the newest one.
const MAX_COMMANDS = 40;

async function writeUserCommands(commands: Command[]) {
  const trimmed = commands.slice(-MAX_COMMANDS);
  (await cookies()).set(LOG_COOKIE, JSON.stringify(trimmed), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

/**
 * Takes a proposal id and nothing else. The journal lines are re-derived on the
 * server from the rebuilt books, so a hand-made POST to this endpoint cannot
 * choose its own amounts — it can only accept or reject something an agent
 * actually proposed. State is scoped to the caller's own cookie, so there is no
 * cross-visitor blast radius to authorise against.
 */
export async function decideProposal(formData: FormData) {
  const proposalId = String(formData.get("proposalId") ?? "");
  const intent = String(formData.get("intent") ?? "");
  if (!proposalId) return;

  const existing = await readUserCommands();
  const books = buildDemoBooks(existing);
  const proposal = books.proposals.find((p) => p.id === proposalId);
  if (!proposal) return;
  if (books.dispositions[proposalId]) return;

  const at = new Date().toISOString();

  if (intent === "approve") {
    // Advisory proposals carry no lines. Books refuses them, so stopping here
    // keeps a command that could never apply out of the cookie.
    if (proposal.suggestedLines.length === 0) return;

    await writeUserCommands([
      ...existing,
      {
        type: "approve-proposal",
        proposalId,
        agent: proposal.agent,
        summary: proposal.summary,
        date: CLOSE_DATE,
        lines: proposal.suggestedLines,
        actor: ACTOR,
        at,
      },
    ]);
  } else if (intent === "dismiss") {
    await writeUserCommands([
      ...existing,
      {
        type: "dismiss-proposal",
        proposalId,
        reason: "Dismissed from the console",
        actor: ACTOR,
        at,
      },
    ]);
  }

  revalidatePath("/");
}

/**
 * Books a bank line the engine could not match, and optionally learns from it.
 * The amount and direction are taken from the stored bank line rather than the
 * form, so a hand-made POST can choose which account a line lands in but never
 * how much money moves.
 */
export async function categorizeBankLine(formData: FormData) {
  const bankLineId = String(formData.get("bankLineId") ?? "");
  const accountId = String(formData.get("accountId") ?? "");
  const keyword = String(formData.get("keyword") ?? "").trim().toLowerCase();
  if (!bankLineId || !accountId) return;

  const existing = await readUserCommands();
  const books = buildDemoBooks(existing);

  const booking = books.bookings.find((b) => b.line.id === bankLineId);
  if (!booking || booking.autoBooked) return;
  if (books.dispositions[`categorization:${bankLineId}`]) return;

  // The account has to be one the books actually have, or the ledger would
  // reject the entry after the command was already written to the log.
  const account = books.accounts.find((a) => a.id === accountId);
  if (!account) return;

  await writeUserCommands([
    ...existing,
    {
      type: "categorize-bank-line",
      bankLineId,
      accountId,
      keyword: keyword.length > 2 ? keyword : null,
      date: booking.line.date,
      memo: booking.line.description,
      lines: bankEntryLines(booking.line, accountId),
      actor: ACTOR,
      at: new Date().toISOString(),
    },
  ]);

  revalidatePath("/");
  revalidatePath("/bank");
}

export async function resetDemo() {
  (await cookies()).delete(LOG_COOKIE);
  revalidatePath("/");
}
