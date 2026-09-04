import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { buildDemoBooks } from "@/demo/books";
import { readUserCommands } from "./session";
import { resetDemo } from "./actions";
import { Nav } from "./nav";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Paisa CFO",
  description: "AI-native accounting: agents read the ledger and propose, humans approve.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const books = buildDemoBooks(await readUserCommands());
  const pending = books.proposals.filter((p) => !books.dispositions[p.id]).length;
  const decided = Object.keys(books.dispositions).length;

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <body className="min-h-full">
        <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/85 backdrop-blur">
          <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-4 px-6 py-3">
            <div className="flex items-center gap-2.5">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-600 text-[15px] font-bold text-white">
                P
              </div>
              <div className="leading-tight">
                <div className="text-[14px] font-semibold tracking-tight text-zinc-900">
                  Paisa CFO
                </div>
                <div className="text-[12px] text-zinc-500">Northwind Labs Pvt Ltd</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden items-center gap-2 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 sm:flex">
                <span className="text-[12px] text-zinc-500">Period</span>
                <span className="text-[13px] font-medium text-zinc-900">Sep 2026</span>
                <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  Open
                </span>
              </div>
              {decided > 0 && (
                <form action={resetDemo}>
                  <button
                    type="submit"
                    className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[13px] font-medium text-zinc-600 transition-colors hover:border-zinc-300 hover:text-zinc-900"
                  >
                    Reset
                  </button>
                </form>
              )}
            </div>
          </div>
        </header>

        <div className="mx-auto flex max-w-[1240px] flex-col gap-6 px-6 py-6 lg:flex-row lg:gap-8">
          <aside className="lg:w-[196px] lg:shrink-0">
            <div className="lg:sticky lg:top-[76px]">
              <Nav pendingCount={pending} />
            </div>
          </aside>
          <main className="min-w-0 flex-1 pb-20">{children}</main>
        </div>
      </body>
    </html>
  );
}
