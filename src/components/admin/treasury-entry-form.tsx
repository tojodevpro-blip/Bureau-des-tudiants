"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { apiFetch, ApiClientError } from "@/lib/client-api";
import {
  TREASURY_CATEGORIES,
  TREASURY_PAYMENT_LABELS,
  TREASURY_PAYMENT_METHODS,
  TREASURY_TYPE_LABELS,
  type TreasuryPaymentValue,
  type TreasuryTypeValue,
} from "@/lib/treasury";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";

export type TreasuryEntryInitial = {
  id?: string;
  type: TreasuryTypeValue;
  libelle: string;
  categorie: string;
  montant: number;
  date: string;
  moyenPaiement: TreasuryPaymentValue;
  reference: string | null;
  payeur: string | null;
  note: string | null;
  eventId: string | null;
};

function localDateValue(value: string | null | undefined) {
  if (!value) {
    return new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
  }
  return new Date(new Date(value).getTime() + 3 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

export function TreasuryEntryForm({
  initial,
  events,
}: {
  initial?: TreasuryEntryInitial;
  events: { id: string; titre: string; debut: string }[];
}) {
  const router = useRouter();
  const [form, setForm] = useState<TreasuryEntryInitial>(() => ({
    type: initial?.type ?? "RECETTE",
    libelle: initial?.libelle ?? "",
    categorie: initial?.categorie ?? TREASURY_CATEGORIES.RECETTE[0],
    montant: initial?.montant ?? 0,
    date: localDateValue(initial?.date),
    moyenPaiement: initial?.moyenPaiement ?? "ESPECES",
    reference: initial?.reference ?? "",
    payeur: initial?.payeur ?? "",
    note: initial?.note ?? "",
    eventId: initial?.eventId ?? "",
    id: initial?.id,
  }));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof TreasuryEntryInitial>(
    key: K,
    value: TreasuryEntryInitial[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  const categories: readonly string[] = TREASURY_CATEGORIES[form.type];

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload = {
        type: form.type,
        libelle: form.libelle,
        categorie: form.categorie,
        montant: form.montant,
        date: form.date,
        moyenPaiement: form.moyenPaiement,
        reference: form.reference || null,
        payeur: form.type === "RECETTE" ? form.payeur || null : null,
        note: form.note || null,
        eventId: form.eventId || null,
      };
      if (form.id) {
        await apiFetch(`/api/admin/treasury/${form.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch("/api/admin/treasury", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      router.push("/admin/tresorerie");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : "Impossible d’enregistrer cette opération.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {error ? (
        <Alert variant="error" title="Enregistrement impossible">
          {error}
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{form.id ? "Modifier l’opération" : "Nouvelle opération"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Type" htmlFor="treasury-type">
              <Select
                id="treasury-type"
                value={form.type}
                onChange={(event) => {
                  const type = event.target.value as TreasuryTypeValue;
                  update("type", type);
                  update("categorie", TREASURY_CATEGORIES[type][0]);
                }}
              >
                {Object.entries(TREASURY_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Date" htmlFor="treasury-date">
              <Input
                id="treasury-date"
                type="date"
                value={form.date}
                onChange={(event) => update("date", event.target.value)}
                required
              />
            </Field>
          </div>

          <Field label="Libellé" htmlFor="treasury-libelle">
            <Input
              id="treasury-libelle"
              value={form.libelle}
              onChange={(event) => update("libelle", event.target.value)}
              placeholder="Ex. Cotisations classe L1"
              maxLength={180}
              required
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Catégorie"
              htmlFor="treasury-categorie"
              hint="Choisis une catégorie proposée ou saisis la tienne."
            >
              <Input
                id="treasury-categorie"
                list="treasury-categories"
                value={form.categorie}
                onChange={(event) => update("categorie", event.target.value)}
                maxLength={80}
                required
              />
              <datalist id="treasury-categories">
                {categories.map((category) => (
                  <option key={category} value={category} />
                ))}
              </datalist>
            </Field>
            <Field label="Montant (Ariary)" htmlFor="treasury-montant">
              <Input
                id="treasury-montant"
                type="number"
                min={1}
                max={1_000_000_000}
                step={1}
                value={form.montant || ""}
                onChange={(event) => update("montant", Number(event.target.value))}
                inputMode="numeric"
                required
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Moyen de paiement" htmlFor="treasury-moyen">
              <Select
                id="treasury-moyen"
                value={form.moyenPaiement}
                onChange={(event) =>
                  update("moyenPaiement", event.target.value as TreasuryPaymentValue)
                }
              >
                {TREASURY_PAYMENT_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {TREASURY_PAYMENT_LABELS[method]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Référence (facultatif)"
              htmlFor="treasury-reference"
              hint="N° de transaction MVola/Airtel, reçu ou pièce comptable."
            >
              <Input
                id="treasury-reference"
                value={form.reference ?? ""}
                onChange={(event) => update("reference", event.target.value)}
                maxLength={160}
              />
            </Field>
          </div>

          {form.type === "RECETTE" ? (
            <Field
              label="Payeur (facultatif)"
              htmlFor="treasury-payeur"
              hint="Nom de l’étudiant, du sponsor ou de la personne à l’origine de la recette. Ce nom apparaîtra sur le reçu."
            >
              <Input
                id="treasury-payeur"
                value={form.payeur ?? ""}
                onChange={(event) => update("payeur", event.target.value)}
                maxLength={160}
                placeholder="Ex. Association des étudiants L2"
              />
            </Field>
          ) : null}

          <Field label="Événement associé (facultatif)" htmlFor="treasury-event">
            <Select
              id="treasury-event"
              value={form.eventId ?? ""}
              onChange={(event) => update("eventId", event.target.value)}
            >
              <option value="">Aucun événement</option>
              {events.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.titre}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Note interne (facultatif)" htmlFor="treasury-note">
            <Textarea
              id="treasury-note"
              value={form.note ?? ""}
              onChange={(event) => update("note", event.target.value)}
              maxLength={2000}
              placeholder="Précisions, justificatif à retrouver, etc."
            />
          </Field>

          <div className="flex flex-wrap gap-2 border-t border-ink-100 pt-4">
            <Button type="submit" loading={loading}>
              <Save className="h-4 w-4" aria-hidden />
              {form.id ? "Enregistrer les modifications" : "Ajouter l’opération"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/admin/tresorerie")}
              disabled={loading}
            >
              Annuler
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
