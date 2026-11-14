"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, Pencil, Receipt, Trash2 } from "lucide-react";
import { apiFetch, ApiClientError } from "@/lib/client-api";
import type { TreasuryTypeValue } from "@/lib/treasury";
import { buttonVariants } from "@/components/ui/button";

export function TreasuryEntryActions({
  id,
  type,
}: {
  id: string;
  type: TreasuryTypeValue;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    if (!window.confirm("Supprimer définitivement cette opération ?")) return;
    setLoading(true);
    setError(null);
    try {
      await apiFetch(`/api/admin/treasury/${id}`, { method: "DELETE" });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Suppression impossible.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex items-center gap-1">
        {type === "RECETTE" ? (
          <>
            <Link
              href={`/api/admin/treasury/${id}/recu`}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: "ghost", size: "sm" })}
              aria-label="Voir le reçu"
              title="Voir le reçu"
            >
              <Receipt className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              href={`/api/admin/treasury/${id}/recu?download=1`}
              className={buttonVariants({ variant: "ghost", size: "sm" })}
              aria-label="Télécharger le reçu"
              title="Télécharger le reçu"
            >
              <Download className="h-4 w-4" aria-hidden />
            </Link>
          </>
        ) : null}
        <Link
          href={`/admin/tresorerie/${id}`}
          className={buttonVariants({ variant: "ghost", size: "sm" })}
          aria-label="Modifier l’opération"
          title="Modifier"
        >
          <Pencil className="h-4 w-4" aria-hidden />
        </Link>
        <button
          type="button"
          onClick={remove}
          disabled={loading}
          className={buttonVariants({ variant: "ghost", size: "sm", className: "text-red-600" })}
          aria-label="Supprimer l’opération"
          title="Supprimer"
        >
          <Trash2 className="h-4 w-4" aria-hidden />
        </button>
      </div>
      {error ? <span className="text-[11px] text-red-600">{error}</span> : null}
    </div>
  );
}
