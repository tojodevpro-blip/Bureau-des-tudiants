"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { apiFetch, ApiClientError } from "@/lib/client-api";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";

const categories = [
  "Inscription / compte",
  "Vote et élection",
  "Événement du BDE",
  "Documents",
  "Problème technique",
  "Autre",
];

export function RequestForm() {
  const router = useRouter();
  const [categorie, setCategorie] = useState(categories[0]);
  const [sujet, setSujet] = useState("");
  const [message, setMessage] = useState("");
  const [anonyme, setAnonyme] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await apiFetch<{ id: string }>("/api/requests", {
        method: "POST",
        body: JSON.stringify({ categorie, sujet, message, anonyme }),
      });
      router.push(`/demandes/${result.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Impossible d’envoyer la demande.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardContent className="p-5 sm:p-6">
        <form onSubmit={submit} className="space-y-4">
          {error ? <Alert variant="error" title="Envoi impossible">{error}</Alert> : null}
          <Field label="Catégorie" htmlFor="categorie">
            <Select id="categorie" value={categorie} onChange={(event) => setCategorie(event.target.value)}>
              {categories.map((item) => <option key={item} value={item}>{item}</option>)}
            </Select>
          </Field>
          <Field label="Sujet" htmlFor="sujet">
            <Input
              id="sujet"
              value={sujet}
              onChange={(event) => setSujet(event.target.value)}
              maxLength={180}
              minLength={3}
              required
              placeholder="Résume ta demande en une phrase"
            />
          </Field>
          <Field label="Message" htmlFor="message" hint="Ne partage pas de mot de passe ni de donnée bancaire.">
            <Textarea
              id="message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={7}
              maxLength={5000}
              minLength={10}
              required
              placeholder="Décris précisément ta situation…"
            />
          </Field>
          <label className="flex items-start gap-3 rounded-xl border border-ink-100 p-3 text-sm text-ink-700">
            <input
              type="checkbox"
              checked={anonyme}
              onChange={(event) => setAnonyme(event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-ink-300"
            />
            <span>
              Demander l’anonymat vis-à-vis des membres du BDE
              <span className="block text-xs text-ink-400">
                Les administrateurs conservent la traçabilité nécessaire au traitement.
              </span>
            </span>
          </label>
          <Button type="submit" loading={loading}>
            <Send className="h-4 w-4" aria-hidden />
            Envoyer la demande
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
