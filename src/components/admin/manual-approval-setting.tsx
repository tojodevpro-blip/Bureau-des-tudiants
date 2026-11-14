"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiClientError } from "@/lib/client-api";
import { Alert } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

export function ManualApprovalSetting({ initial }: { initial: boolean }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function toggle(next: boolean) {
    setEnabled(next);
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      await apiFetch("/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({ validationManuelleInscriptions: next }),
      });
      setSuccess(true);
      router.refresh();
    } catch (err) {
      setEnabled(!next);
      setError(err instanceof ApiClientError ? err.message : "Impossible de modifier le réglage.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      {error ? <Alert variant="error">{error}</Alert> : null}
      {success ? <Alert variant="success">Réglage enregistré.</Alert> : null}
      <div className="flex flex-col gap-3 rounded-xl border border-ink-100 bg-ink-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-ink-900">
            Exiger une approbation admin
          </p>
          <p className="text-xs text-ink-500">
            {enabled
              ? "Les nouveaux comptes devront être approuvés avant de voter."
              : "Les nouveaux comptes sont approuvés automatiquement."}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Validation manuelle des inscriptions"
          disabled={loading}
          onClick={() => toggle(!enabled)}
          className={cn(
            "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition disabled:opacity-60",
            enabled ? "bg-brand-600" : "bg-ink-300",
          )}
        >
          <span
            className={cn(
              "inline-block h-5 w-5 rounded-full bg-white theme-fixed-light shadow transition",
              enabled ? "translate-x-6" : "translate-x-1",
            )}
          />
        </button>
      </div>
    </div>
  );
}
