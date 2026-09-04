import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { buildDemoBooks } from "@/demo/books";
import { readUserCommands } from "./session";
import { resetDemo } from "./actions";
import { Nav } from "./nav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Paisa CFO",
  description: "AI-native accounting: agents read the ledger and propose, humans approve.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const books = buildDemoBooks(await readUserCommands());
  const pending = books.proposals.filter((p) => !books.dispositions[p.id]).length;
  const decided = Object.keys(books.dispositions).length;

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[#08090b] text-zinc-100">
        <header className="sticky top-0 z-10 border-b border-white/8 bg-[#08090b]/85 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
            <div className="flex items-center gap-3">
              <div className="grid h-7 w-7 place-items-center rounded-md bg-emerald-400 text-[13px] font-bold text-black">
                P
              </div>
              <div className="leading-tight">
                <div className="text-[13px] font-semibold tracking-tight">Paisa CFO</div>
                <div className="text-[11px] text-zinc-500">Northwind Labs Pvt Ltd</div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[11px]">
              <span className="hidden rounded-md border border-white/10 px-2 py-1 text-zinc-400 sm:inline">
                Period · Sep 2026
              </span>
              <span className="rounded-md border border-amber-400/25 bg-amber-400/10 px-2 py-1 text-amber-300">
                Open
              </span>
              {decided > 0 && (
                <form action={resetDemo}>
                  <button
                    type="submit"
                    className="rounded-md border border-white/10 px-2 py-1 text-zinc-400 transition-colors hover:border-white/25 hover:text-zinc-200"
                  >
                    Reset
                  </button>
                </form>
              )}
            </div>
          </div>
        </header>

        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-6 lg:flex-row lg:gap-8">
          <aside className="lg:w-44 lg:shrink-0">
            <Nav pendingCount={pending} />
          </aside>
          <main className="min-w-0 flex-1 pb-16">{children}</main>
        </div>
      </body>
    </html>
  );
}
