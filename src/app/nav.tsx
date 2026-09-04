"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const MODULES = [
  { href: "/", label: "Overview" },
  { href: "/proposals", label: "AI proposals" },
  { href: "/journal", label: "Journal" },
  { href: "/bank", label: "Bank feed" },
  { href: "/reports", label: "Reports" },
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
            className={`flex shrink-0 items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-[12px] transition-colors ${
              active
                ? "bg-white/8 text-zinc-100"
                : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300"
            }`}
          >
            {module.label}
            {module.href === "/proposals" && pendingCount > 0 && (
              <span className="rounded bg-amber-400/15 px-1.5 py-0.5 font-mono text-[10px] text-amber-300">
                {pendingCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
