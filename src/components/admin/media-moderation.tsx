"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { apiFetch, ApiClientError } from "@/lib/client-api";
import { Button } from "@/components/ui/button";

export function MediaModeration({
  mediaId,
  masque,
}: {
  mediaId: string;
  masque: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    const motif = masque
      ? null
      : window.prompt("Motif du masquage (visible en audit) :", "Signalement");
    if (!masque && motif === null) return;
    setLoading(true);
    setError(null);
    try {
      await apiFetch(`/api/admin/media/${mediaId}/mask`, {
        method: "PATCH",
        body: JSON.stringify({ masque: !masque, motif }),
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Action impossible.");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-1">
      {error ? <p className="text-xs text-red-700">{error}</p> : null}
      <Button variant={masque ? "outline" : "danger"} size="sm" onClick={toggle} loading={loading}>
        {masque ? <Eye className="h-4 w-4" aria-hidden /> : <EyeOff className="h-4 w-4" aria-hidden />}
        {masque ? "Réafficher" : "Masquer"}
      </Button>
    </div>
  );
}
