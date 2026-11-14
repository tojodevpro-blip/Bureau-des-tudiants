"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, Send } from "lucide-react";
import { apiFetch, ApiClientError } from "@/lib/client-api";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function PollVoteForm({
  pollId,
  multiple,
  options,
}: {
  pollId: string;
  multiple: boolean;
  options: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(id: string) {
    setSelected((current) =>
      multiple
        ? current.includes(id)
          ? current.filter((item) => item !== id)
          : [...current, id]
        : [id],
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await apiFetch(`/api/polls/${pollId}/vote`, {
        method: "POST",
        body: JSON.stringify({ optionIds: selected }),
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Impossible d’enregistrer ta réponse.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error ? <Alert variant="error">{error}</Alert> : null}
      <fieldset className="space-y-2">
        <legend className="sr-only">Choisis une réponse</legend>
        {options.map((option) => (
          <label key={option.id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-ink-200 bg-white p-3 text-sm text-ink-800 hover:border-brand-200">
            <input
              type={multiple ? "checkbox" : "radio"}
              name="option"
              checked={selected.includes(option.id)}
              onChange={() => toggle(option.id)}
              className="h-4 w-4 border-ink-300"
            />
            {option.label}
          </label>
        ))}
      </fieldset>
      <Button type="submit" loading={loading} disabled={selected.length === 0}>
        <Send className="h-4 w-4" aria-hidden />
        Envoyer ma réponse
      </Button>
      <p className="flex items-center gap-1 text-xs text-ink-400">
        <BarChart3 className="h-3.5 w-3.5" aria-hidden />
        {multiple ? "Plusieurs choix possibles · un seul envoi." : "Un seul choix · un seul envoi."}
      </p>
    </form>
  );
}
