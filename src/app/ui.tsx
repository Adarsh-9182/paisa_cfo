import type { ReactNode } from "react";

const formatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function money(value: number): string {
  return formatter.format(value);
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-xl border border-zinc-200 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] ${className}`}
    >
      {children}
    </div>
  );
}

export function Panel({
  title,
  hint,
  children,
  actions,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight text-zinc-900">{title}</h2>
          {hint && <p className="mt-0.5 text-[13px] text-zinc-500">{hint}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-500">
      {children}
    </h2>
  );
}

export function Metric({
  label,
  value,
  delta,
  children,
}: {
  label: string;
  value: string;
  delta?: number;
  children?: ReactNode;
}) {
  return (
    <div className="px-5 py-4">
      <div className="text-[11px] font-medium uppercase tracking-[0.06em] text-zinc-500">
        {label}
      </div>
      <div className="num mt-1.5 text-[26px] font-medium leading-none tracking-tight text-zinc-900">
        {value}
      </div>
      <div className="mt-2 text-[12px] text-zinc-500">
        {delta !== undefined ? (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-medium ${
              delta >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
            }`}
          >
            {delta >= 0 ? "▲" : "▼"} {money(Math.abs(delta))}
          </span>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

export function MetricRow({ children }: { children: ReactNode }) {
  return (
    <Card className="grid grid-cols-2 divide-x divide-zinc-200 overflow-hidden lg:grid-cols-4">
      {children}
    </Card>
  );
}

export function Table({ head, children }: { head: ReactNode; children: ReactNode }) {
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[460px] text-[13px]">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50/80 text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-500">
              {head}
            </tr>
          </thead>
          {children}
        </table>
      </div>
    </Card>
  );
}

export function Th({ children, align = "left" }: { children: ReactNode; align?: "left" | "right" }) {
  return (
    <th className={`px-4 py-2.5 font-semibold ${align === "right" ? "text-right" : "text-left"}`}>
      {children}
    </th>
  );
}

export function Amount({ value, muted }: { value: number; muted?: boolean }) {
  return (
    <span className={`num ${muted ? "text-zinc-300" : "text-zinc-700"}`}>
      {value === 0 ? "—" : money(value)}
    </span>
  );
}

export function AccountCell({ code, name }: { code: string; name: string }) {
  return (
    <span className="flex items-baseline gap-2.5">
      <span className="num text-[11px] text-zinc-400">{code}</span>
      <span className="text-zinc-800">{name}</span>
    </span>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "positive" | "warning" | "info";
}) {
  const tones = {
    neutral: "bg-zinc-100 text-zinc-600",
    positive: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-700",
    info: "bg-sky-50 text-sky-700",
  };
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <Card className="px-6 py-10 text-center text-[13px] text-zinc-500">{children}</Card>
  );
}
