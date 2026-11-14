"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FolderPlus } from "lucide-react";
import { apiFetch, ApiClientError } from "@/lib/client-api";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/field";

export function AlbumForm() {
  const router = useRouter();
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [annee, setAnnee] = useState(new Date().getFullYear());
  const [eventId, setEventId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await apiFetch<{ id: string }>("/api/admin/albums", {
        method: "POST",
        body: JSON.stringify({ titre, description: description || null, annee, eventId: eventId || null }),
      });
      router.push(`/admin/archives/${result.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Impossible de créer l’album.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader><CardTitle>Nouvel album</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          {error ? <Alert variant="error">{error}</Alert> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Titre" htmlFor="album-titre">
              <Input id="album-titre" value={titre} onChange={(event) => setTitre(event.target.value)} required minLength={2} maxLength={160} />
            </Field>
            <Field label="Année" htmlFor="album-annee">
              <Input id="album-annee" type="number" min={2000} max={2100} value={annee} onChange={(event) => setAnnee(Number(event.target.value))} required />
            </Field>
          </div>
          <Field label="Description (facultatif)" htmlFor="album-description">
            <Textarea id="album-description" value={description} onChange={(event) => setDescription(event.target.value)} rows={3} maxLength={2000} />
          </Field>
          <Field label="Identifiant d’événement associé (facultatif)" htmlFor="album-event">
            <Input id="album-event" value={eventId} onChange={(event) => setEventId(event.target.value)} maxLength={80} />
          </Field>
          <Button type="submit" loading={loading}>
            <FolderPlus className="h-4 w-4" aria-hidden />
            Créer l’album
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
