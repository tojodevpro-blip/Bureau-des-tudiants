"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarCheck, CalendarX, Clock3 } from "lucide-react";
import type { EventRsvpStatus } from "@prisma/client";
import { apiFetch, ApiClientError } from "@/lib/client-api";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function EventRsvpButton({
  eventId,
  statut,
  disabled,
}: {
  eventId: string;
  statut: EventRsvpStatus | null;
  disabled: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: "register" | "cancel") {
    setLoading(true);
    setError(null);
    try {
      await apiFetch(`/api/events/${eventId}/rsvp`, {
        method: action === "register" ? "POST" : "DELETE",
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Action impossible.");
    } finally {
      setLoading(false);
    }
  }

  if (disabled) return null;

  return (
    <div className="space-y-2">
      {error ? <Alert variant="error">{error}</Alert> : null}
      {statut === "INSCRIT" ? (
        <Button variant="outline" onClick={() => run("cancel")} loading={loading}>
          <CalendarX className="h-4 w-4" aria-hidden />
          Annuler mon inscription
        </Button>
      ) : statut === "LISTE_ATTENTE" ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
            <Clock3 className="h-4 w-4" aria-hidden />
            Liste d’attente
          </span>
          <Button variant="outline" onClick={() => run("cancel")} loading={loading}>
            Me retirer
          </Button>
        </div>
      ) : (
        <Button onClick={() => run("register")} loading={loading}>
          <CalendarCheck className="h-4 w-4" aria-hidden />
          M’inscrire
        </Button>
      )}
    </div>
  );
}
