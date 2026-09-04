import { cookies } from "next/headers";
import type { Command } from "@/persistence/commands";

export const LOG_COOKIE = "paisa_log";

/**
 * The decisions this visitor has made, carried in their own cookie. The seed is
 * deterministic and rebuilt every request, so the only state worth persisting
 * is the command log — which is small enough to fit in a cookie. Swapping this
 * for a database is a change of storage, not of design.
 */
export async function readUserCommands(): Promise<Command[]> {
  const raw = (await cookies()).get(LOG_COOKIE)?.value;
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Command[]) : [];
  } catch {
    // A corrupt cookie is the visitor's own and not worth an error page.
    return [];
  }
}
