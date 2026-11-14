"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { apiFetch } from "@/lib/client-api";
import { cn } from "@/lib/utils";

type NotificationItem = {
  id: string;
  titre: string;
  message: string;
  url: string | null;
  readAt: string | null;
  createdAt: string;
};

type NotificationPayload = {
  items: NotificationItem[];
  unread: number;
};

export function NotificationBell({
  initialUnread = 0,
  align = "right",
  direction = "down",
}: {
  initialUnread?: number;
  align?: "left" | "right";
  direction?: "down" | "up";
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(initialUnread);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<NotificationPayload>("/api/notifications?pageSize=6");
      setItems(data.items);
      setUnread(data.unread);
    } catch {
      // Le centre de notifications ne doit jamais bloquer la navigation.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      apiFetch<NotificationPayload>("/api/notifications?pageSize=1")
        .then((data) => setUnread(data.unread))
        .catch(() => undefined);
    }, 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onClick = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next) await load();
  }

  async function markAll() {
    await apiFetch("/api/notifications", {
      method: "POST",
      body: JSON.stringify({ action: "read-all" }),
    });
    setUnread(0);
    setItems((current) =>
      current.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })),
    );
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={toggle}
        className="relative rounded-lg p-2 text-ink-600 transition hover:bg-ink-100 hover:text-ink-900"
        aria-label={`Notifications${unread > 0 ? `, ${unread} non lues` : ""}`}
        aria-expanded={open}
      >
        <Bell className="h-5 w-5" aria-hidden />
        {unread > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          className={cn(
            "absolute z-50 w-[min(92vw,24rem)] overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-float",
            align === "left" ? "left-0" : "right-0",
            direction === "up" ? "bottom-12" : "top-12",
          )}
        >
          <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
            <p className="text-sm font-bold text-ink-950">Notifications</p>
            <button
              type="button"
              onClick={markAll}
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline"
            >
              <CheckCheck className="h-3.5 w-3.5" aria-hidden />
              Tout lire
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <p className="p-4 text-sm text-ink-500">Chargement…</p>
            ) : items.length === 0 ? (
              <p className="p-4 text-sm text-ink-500">Aucune notification pour le moment.</p>
            ) : (
              items.map((item) => (
                <Link
                  key={item.id}
                  href={item.url ?? "/notifications"}
                  className={cn(
                    "block border-b border-ink-50 px-4 py-3 transition hover:bg-ink-50",
                    !item.readAt && "bg-brand-50/50",
                  )}
                >
                  <p className="text-sm font-semibold text-ink-900">{item.titre}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-ink-500">{item.message}</p>
                  <p className="mt-1 text-[11px] text-ink-400">
                    {new Date(item.createdAt).toLocaleString("fr-FR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </p>
                </Link>
              ))
            )}
          </div>
          <Link
            href="/notifications"
            className="block bg-ink-50 px-4 py-3 text-center text-sm font-semibold text-brand-700"
          >
            Voir tout
          </Link>
        </div>
      ) : null}
    </div>
  );
}
