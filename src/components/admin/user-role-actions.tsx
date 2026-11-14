"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiClientError } from "@/lib/client-api";
import { Button } from "@/components/ui/button";

export function UserRoleActions({
  userId,
  role,
  tresorerieAccess,
  self,
}: {
  userId: string;
  role: "STUDENT" | "MEMBRE_BDE" | "ADMIN";
  tresorerieAccess: boolean;
  self?: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState(role);
  const [treasury, setTreasury] = useState(tresorerieAccess);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextTreasury = value === "MEMBRE_BDE" ? treasury : false;
  const unchanged = value === role && nextTreasury === tresorerieAccess;

  async function save() {
    setLoading(true);
    setError(null);
    try {
      await apiFetch(`/api/admin/users/${userId}/role`, {
        method: "POST",
        body: JSON.stringify({ role: value, tresorerieAccess: nextTreasury }),
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Action impossible.");
    } finally {
      setLoading(false);
    }
  }

  if (self) {
    return (
      <span className="text-xs text-ink-400">
        Ton compte{role === "ADMIN" || tresorerieAccess ? " · accès trésorerie" : ""}
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <select
          className="rounded-lg border border-ink-200 bg-white px-2 py-1.5 text-xs font-medium text-ink-800"
          value={value}
          onChange={(event) => setValue(event.target.value as typeof value)}
          aria-label="Rôle du compte"
        >
          <option value="STUDENT">Étudiant</option>
          <option value="MEMBRE_BDE">Membre BDE</option>
          <option value="ADMIN">Administrateur</option>
        </select>
        {value === "MEMBRE_BDE" ? (
          <label className="inline-flex items-center gap-1.5 text-[11px] font-medium text-ink-600">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 rounded border-ink-300"
              checked={treasury}
              onChange={(event) => setTreasury(event.target.checked)}
            />
            Trésorerie
          </label>
        ) : null}
        <Button size="sm" variant="outline" onClick={save} disabled={loading || unchanged}>
          {loading ? "…" : "Appliquer"}
        </Button>
      </div>
      {error ? <span className="text-[11px] text-red-600">{error}</span> : null}
    </div>
  );
}
