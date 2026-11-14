"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Play } from "lucide-react";
import type { PollStatus } from "@prisma/client";
import { apiFetch, ApiClientError } from "@/lib/client-api";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function PollStatusActions({ pollId, statut }: { pollId: string; statut: PollStatus }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function update(next: PollStatus) {
    if (next === "CLOTURE" && !window.confirm("Clôturer ce sondage ? Plus personne ne pourra voter.")) return;
    setLoading(true);
    setError(null);
    try {
      await apiFetch(`/api/admin/polls/${pollId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ statut: next }),
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Action impossible.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      {error ? <Alert variant="error">{error}</Alert> : null}
      {statut === "OUVERT" ? (
        <Button variant="outline" onClick={() => update("CLOTURE")} loading={loading}>
          <Lock className="h-4 w-4" aria-hidden />
          Clôturer le sondage
        </Button>
      ) : (
        <Button onClick={() => update("OUVERT")} loading={loading}>
          <Play className="h-4 w-4" aria-hidden />
          Ouvrir et notifier
        </Button>
      )}
    </div>
  );
}
