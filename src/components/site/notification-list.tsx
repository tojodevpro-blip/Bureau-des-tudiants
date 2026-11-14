"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCheck, Bell } from "lucide-react";
import { apiFetch } from "@/lib/client-api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Item = {
  id: string;
  titre: string;
  message: string;
  url: string | null;
  readAt: string | null;
  createdAt: string;
};

export function NotificationList({ items }: { items: Item[] }) {
  const [list, setList] = useState(items);

  async function markAll() {
    await apiFetch("/api/notifications", {
      method: "POST",
      body: JSON.stringify({ action: "read-all" }),
    });
    setList((current) => current.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })));
  }

  async function open(item: Item) {
    if (!item.readAt) {
      await apiFetch("/api/notifications", {
        method: "POST",
        body: JSON.stringify({ action: "read", id: item.id }),
      }).catch(() => undefined);
      setList((current) =>
        current.map((entry) =>
          entry.id === item.id ? { ...entry, readAt: new Date().toISOString() } : entry,
        ),
      );
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={markAll}>
          <CheckCheck className="h-4 w-4" aria-hidden />
          Tout marquer comme lu
        </Button>
      </div>
      {list.length === 0 ? (
        <div className="surface flex flex-col items-center gap-2 p-10 text-center">
          <Bell className="h-8 w-8 text-ink-300" aria-hidden />
          <p className="font-semibold text-ink-800">Aucune notification</p>
          <p className="text-sm text-ink-500">Les nouvelles activités du BDE apparaîtront ici.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((item) => (
            <Link
              key={item.id}
              href={item.url ?? "#"}
              onClick={() => open(item)}
              className={cn(
                "surface block p-4 transition hover:border-brand-200",
                !item.readAt && "border-brand-200 bg-brand-50/40",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-ink-950">{item.titre}</p>
                  <p className="mt-1 text-sm text-ink-600">{item.message}</p>
                </div>
                {!item.readAt ? (
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-600" aria-label="Non lue" />
                ) : null}
              </div>
              <p className="mt-2 text-xs text-ink-400">
                {new Date(item.createdAt).toLocaleString("fr-FR", {
                  dateStyle: "long",
                  timeStyle: "short",
                })}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
