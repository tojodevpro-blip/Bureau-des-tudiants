"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "bde-theme";

export function ThemeToggle({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    document.documentElement.style.colorScheme = next ? "dark" : "light";
    try {
      localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
    } catch {
      return;
    }
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label={dark ? "Passer au thème clair" : "Passer au thème sombre"}
      title={dark ? "Thème clair" : "Thème sombre"}
      onClick={toggle}
      className={cn(
        "inline-flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-2.5 py-2 text-xs font-semibold text-ink-600 transition hover:border-ink-300 hover:bg-ink-50 hover:text-ink-900",
        compact && "gap-1.5 px-2",
        className,
      )}
    >
      {dark ? (
        <Moon className="h-4 w-4 shrink-0 text-brand-600" aria-hidden />
      ) : (
        <Sun className="h-4 w-4 shrink-0 text-amber-600" aria-hidden />
      )}
      {compact ? null : <span>{dark ? "Sombre" : "Clair"}</span>}
      <span
        aria-hidden
        className={cn(
          "relative ml-auto inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition",
          dark ? "border-brand-600 bg-brand-600" : "border-ink-300 bg-ink-200",
        )}
      >
        <span
          className={cn(
            "h-3.5 w-3.5 rounded-full bg-white theme-fixed-light shadow-sm transition-transform",
            dark ? "translate-x-[18px]" : "translate-x-0.5",
          )}
        />
      </span>
    </button>
  );
}
