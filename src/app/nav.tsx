"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ICONS: Record<string, React.ReactNode> = {
  overview: (
    <path d="M3 12l9-8 9 8M5 10v10h14V10" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  ),
  proposals: (
    <>
      <path d="M12 3l1.9 5.8H20l-4.9 3.6 1.9 5.8-5-3.6-5 3.6 1.9-5.8L4 8.8h6.1z" strokeWidth="1.4" fill="none" strokeLinejoin="round" />
    </>
  ),
  journal: (
    <path d="M5 4h11l3 3v13H5zM8 9h8M8 13h8M8 17h5" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  ),
  bank: (
    <path d="M3 9l9-5 9 5M5 9v10h14V9M9 19v-6h6v6" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  ),
  reports: (
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" strokeWidth="1.6" fill="none" strokeLinecap="round" />
  ),
};

const MODULES = [
  { href: "/", label: "Overview", icon: "overview" },
  { href: "/proposals", label: "AI proposals", icon: "proposals" },
  { href: "/journal", label: "Journal", icon: "journal" },
  { href: "/bank", label: "Bank feed", icon: "bank" },
  { href: "/reports", label: "Reports", icon: "reports" },
];

export function Nav({ pendingCount }: { pendingCount: number }) {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto lg:flex-col lg:gap-0.5 lg:overflow-visible">
      {MODULES.map((module) => {
        const active = pathname === module.href;
        return (
          <Link
            key={module.href}
            href={module.href}
            className={`flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors ${
              active
                ? "bg-white text-zinc-900 shadow-[0_1px_2px_rgba(16,24,40,0.06)] ring-1 ring-zinc-200"
                : "text-zinc-600 hover:bg-white/70 hover:text-zinc-900"
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              className={`h-4 w-4 shrink-0 ${active ? "text-emerald-600" : "text-zinc-400"}`}
              stroke="currentColor"
            >
              {ICONS[module.icon]}
            </svg>
            <span className="flex-1 whitespace-nowrap">{module.label}</span>
            {module.href === "/proposals" && pendingCount > 0 && (
              <span className="num rounded-md bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold text-amber-700">
                {pendingCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
