import type { ReactNode } from "react";

export const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function money(value: number): string {
  return inr.format(value);
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
          <h2 className="text-[13px] font-semibold tracking-tight text-zinc-200">{title}</h2>
          {hint && <p className="text-[11px] text-zinc-600">{hint}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

export function Metric({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children?: ReactNode;
}) {
  return (
    <div className="bg-[#08090b] px-4 py-3.5">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="mt-1 font-mono text-[19px] tabular-nums tracking-tight text-zinc-50">
        {value}
      </div>
      {children && <div className="mt-0.5 text-[11px] text-zinc-600">{children}</div>}
    </div>
  );
}

export function MetricRow({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/10 bg-white/8 md:grid-cols-4">
      {children}
    </div>
  );
}

export function Table({ head, children }: { head: ReactNode; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full min-w-[420px] text-[12px]">
        <thead>
          <tr className="border-b border-white/10 bg-white/[0.03] text-[10px] uppercase tracking-wider text-zinc-500">
            {head}
          </tr>
        </thead>
        {children}
      </table>
    </div>
  );
}

export function Th({
  children,
  align = "left",
}: {
  children: ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th className={`px-3 py-2 font-medium ${align === "right" ? "text-right" : "text-left"}`}>
      {children}
    </th>
  );
}

export function Amount({ value, muted }: { value: number; muted?: boolean }) {
  return (
    <span className={`font-mono tabular-nums ${muted ? "text-zinc-600" : "text-zinc-300"}`}>
      {value === 0 ? "—" : money(value)}
    </span>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-[12px] text-zinc-600">
      {children}
    </div>
  );
}
