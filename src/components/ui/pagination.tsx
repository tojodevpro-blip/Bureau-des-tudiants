import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { pageWindow, totalPages } from "@/lib/pagination";
import { cn } from "@/lib/utils";

export function Pagination({
  page,
  total,
  pageSize,
  basePath,
  query = {},
}: {
  page: number;
  total: number;
  pageSize: number;
  basePath: string;
  query?: Record<string, string | undefined>;
}) {
  const pages = totalPages(total, pageSize);
  if (pages <= 1) return null;

  const href = (target: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value) params.set(key, value);
    }
    if (target > 1) params.set("page", String(target));
    const suffix = params.toString();
    return suffix ? `${basePath}?${suffix}` : basePath;
  };

  return (
    <nav className="flex items-center justify-center gap-1 py-5" aria-label="Pagination">
      <Link
        href={href(Math.max(1, page - 1))}
        aria-disabled={page <= 1}
        className={cn(
          "rounded-lg border border-ink-200 bg-white p-2 text-ink-600 transition hover:bg-ink-50",
          page <= 1 && "pointer-events-none opacity-40",
        )}
        aria-label="Page précédente"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
      </Link>
      {pageWindow(page, pages).map((item) => (
        <Link
          key={item}
          href={href(item)}
          aria-current={item === page ? "page" : undefined}
          className={cn(
            "flex h-9 min-w-9 items-center justify-center rounded-lg border px-2 text-sm font-semibold",
            item === page
              ? "border-brand-600 bg-brand-600 text-white"
              : "border-ink-200 bg-white text-ink-600 hover:bg-ink-50",
          )}
        >
          {item}
        </Link>
      ))}
      <Link
        href={href(Math.min(pages, page + 1))}
        aria-disabled={page >= pages}
        className={cn(
          "rounded-lg border border-ink-200 bg-white p-2 text-ink-600 transition hover:bg-ink-50",
          page >= pages && "pointer-events-none opacity-40",
        )}
        aria-label="Page suivante"
      >
        <ChevronRight className="h-4 w-4" aria-hidden />
      </Link>
    </nav>
  );
}
