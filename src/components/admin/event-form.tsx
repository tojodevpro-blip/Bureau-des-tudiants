"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, Save } from "lucide-react";
import { apiFetch, ApiClientError } from "@/lib/client-api";
import { toLocalDateTimeInput } from "@/lib/utils";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/field";

type EventFormValues = {
  id?: string;
  titre: string;
  description: string;
  lieu: string;
  debut: string | null;
  fin: string | null;
  visuelUrl: string | null;
  categorie: string;
  capacite: number | null;
  prixModalites: string | null;
  annuleLe?: string | null;
};

const empty: EventFormValues = {
  titre: "",
  description: "",
  lieu: "",
  debut: null,
  fin: null,
  visuelUrl: null,
  categorie: "Vie du BDE",
  capacite: null,
  prixModalites: null,
};

export function EventForm({ initial }: { initial?: EventFormValues }) {
  const router = useRouter();
  const [form, setForm] = useState<EventFormValues>(initial ?? empty);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof EventFormValues>(key: K, value: EventFormValues[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setLoading("save");
    setError(null);
    try {
      const payload = {
        ...form,
        capacite: form.capacite === null || form.capacite === undefined || String(form.capacite) === ""
          ? null
          : Number(form.capacite),
      };
      if (initial?.id) {
        await apiFetch(`/api/admin/events/${initial.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch("/api/admin/events", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      router.push("/admin/programme");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Impossible d’enregistrer l’événement.");
    } finally {
      setLoading(null);
    }
  }

  async function cancel() {
    if (!initial?.id) return;
    if (!window.confirm("Annuler cet événement ? Les inscrits seront notifiés.")) return;
    setLoading("cancel");
    setError(null);
    try {
      await apiFetch(`/api/admin/events/${initial.id}`, { method: "DELETE" });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Impossible d’annuler l’événement.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <form onSubmit={save} className="space-y-5">
      {error ? <Alert variant="error" title="Action impossible">{error}</Alert> : null}
      <Card>
        <CardHeader><CardTitle>Informations</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Titre" htmlFor="titre">
              <Input id="titre" value={form.titre} onChange={(event) => update("titre", event.target.value)} maxLength={180} required />
            </Field>
            <Field label="Catégorie" htmlFor="categorie">
              <Input id="categorie" value={form.categorie} onChange={(event) => update("categorie", event.target.value)} maxLength={60} required />
            </Field>
          </div>
          <Field label="Lieu" htmlFor="lieu">
            <Input id="lieu" value={form.lieu} onChange={(event) => update("lieu", event.target.value)} maxLength={200} required />
          </Field>
          <Field label="Description" htmlFor="description">
            <Textarea id="description" value={form.description} onChange={(event) => update("description", event.target.value)} rows={7} maxLength={10000} required />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Début" htmlFor="debut">
              <Input id="debut" type="datetime-local" value={toLocalDateTimeInput(form.debut)} onChange={(event) => update("debut", event.target.value || null)} required />
            </Field>
            <Field label="Fin" htmlFor="fin">
              <Input id="fin" type="datetime-local" value={toLocalDateTimeInput(form.fin)} onChange={(event) => update("fin", event.target.value || null)} required />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Capacité (facultatif)" htmlFor="capacite" hint="Vide = places illimitées. Au-delà, liste d’attente automatique.">
              <Input
                id="capacite"
                type="number"
                min={1}
                max={10000}
                value={form.capacite ?? ""}
                onChange={(event) => update("capacite", event.target.value ? Number(event.target.value) : null)}
              />
            </Field>
            <Field label="Prix / modalités de paiement (facultatif)" htmlFor="prix">
              <Input id="prix" value={form.prixModalites ?? ""} onChange={(event) => update("prixModalites", event.target.value || null)} maxLength={500} placeholder="Ex. 5 000 Ar sur place" />
            </Field>
          </div>
          <Field label="Visuel (URL https, facultatif)" htmlFor="visuel">
            <Input id="visuel" value={form.visuelUrl ?? ""} onChange={(event) => update("visuelUrl", event.target.value || null)} inputMode="url" placeholder="https://…" />
          </Field>
          <div className="flex flex-wrap gap-2 border-t border-ink-100 pt-4">
            <Button type="submit" loading={loading === "save"}>
              <Save className="h-4 w-4" aria-hidden />
              Enregistrer
            </Button>
            {initial?.id && !initial.annuleLe ? (
              <Button type="button" variant="danger" onClick={cancel} loading={loading === "cancel"}>
                <Ban className="h-4 w-4" aria-hidden />
                Annuler l’événement
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
