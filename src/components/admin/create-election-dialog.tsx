"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Plus } from "lucide-react";
import { apiFetch, ApiClientError } from "@/lib/client-api";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { toLocalDateTimeInput } from "@/lib/utils";

function defaultStart() {
  const date = new Date(Date.now() + 5 * 60 * 1000);
  return toLocalDateTimeInput(date);
}

function defaultEnd() {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return toLocalDateTimeInput(date);
}

export function CreateElectionDialog({ trigger }: { trigger?: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    titre: "",
    description: "",
    ouvreLe: defaultStart(),
    fermeLe: defaultEnd(),
  });

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ id: string }>("/api/admin/elections", {
        method: "POST",
        body: JSON.stringify({
          titre: form.titre,
          description: form.description || null,
          ouvreLe: form.ouvreLe,
          fermeLe: form.fermeLe,
        }),
      });
      setOpen(false);
      router.push(`/admin/elections/${data.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Impossible de créer l’élection.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger ?? (
        <Button size="sm">
          <Plus className="h-4 w-4" aria-hidden />
          Créer une élection
        </Button>
      )}</span>

      <Modal
        open={open}
        onClose={() => (loading ? null : setOpen(false))}
        title="Créer une élection"
        description="Tu pourras ajouter les candidats et ajuster la fenêtre avant d’ouvrir le vote."
        size="md"
      >
        <form onSubmit={submit} className="space-y-4" noValidate>
          {error ? (
            <Alert variant="error" title="Création impossible">
              {error}
            </Alert>
          ) : null}

          <Field label="Titre *" htmlFor="election-titre">
            <Input
              id="election-titre"
              value={form.titre}
              onChange={(event) => setForm({ ...form, titre: event.target.value })}
              placeholder="Élection du président du BDE 2026"
              required
            />
          </Field>

          <Field label="Description" htmlFor="election-description">
            <Textarea
              id="election-description"
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              placeholder="Contexte, enjeux, consignes de vote…"
              className="min-h-[90px]"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Ouverture *" htmlFor="election-open">
              <Input
                id="election-open"
                type="datetime-local"
                value={form.ouvreLe}
                onChange={(event) => setForm({ ...form, ouvreLe: event.target.value })}
                required
              />
            </Field>
            <Field label="Fermeture *" htmlFor="election-close">
              <Input
                id="election-close"
                type="datetime-local"
                value={form.fermeLe}
                onChange={(event) => setForm({ ...form, fermeLe: event.target.value })}
                required
              />
            </Field>
          </div>

          <p className="text-xs text-ink-400">
            Heure de Madagascar (UTC+3). Tu pourras rouvrir ce formulaire tant que le vote
            n’est pas ouvert.
          </p>

          <div className="flex flex-wrap justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Annuler
            </Button>
            <Button type="submit" loading={loading}>
              <CalendarPlus className="h-4 w-4" aria-hidden />
              Créer le brouillon
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
