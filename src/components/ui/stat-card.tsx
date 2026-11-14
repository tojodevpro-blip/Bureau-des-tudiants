import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  icon,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-ink-100 bg-white p-4 shadow-card sm:p-5",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-500">{label}</p>
          <p className="text-2xl font-bold tracking-tight text-ink-950">{value}</p>
          {hint ? <p className="text-xs text-ink-500">{hint}</p> : null}
        </div>
        {icon ? (
          <span className="rounded-xl bg-brand-50 p-2 text-brand-700">{icon}</span>
        ) : null}
      </div>
    </div>
  );
}
