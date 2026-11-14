"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { apiFetch, ApiClientError } from "@/lib/client-api";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";

export function AddStudentDialog({ classes }: { classes: string[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    matricule: "",
    nom: "",
    prenoms: "",
    classe: "",
    noteVerification: "",
  });

  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await apiFetch("/api/admin/students", {
        method: "POST",
        body: JSON.stringify({
          matricule: form.matricule,
          nom: form.nom,
          prenoms: form.prenoms,
          classe: form.classe,
          noteVerification: form.noteVerification || null,
          actif: true,
        }),
      });
      setOpen(false);
      setForm({ matricule: "", nom: "", prenoms: "", classe: "", noteVerification: "" });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Impossible d’ajouter ce matricule.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} size="sm">
        <Plus className="h-4 w-4" aria-hidden />
        Ajouter un matricule
      </Button>

      <Modal
        open={open}
        onClose={() => (loading ? null : setOpen(false))}
        title="Ajouter un matricule"
        description="Le matricule sera normalisé automatiquement (ex. CAN31/01 → CAN31/001)."
        size="md"
      >
        <form onSubmit={submit} className="space-y-4" noValidate>
          {error ? (
            <Alert variant="error" title="Ajout impossible">
              {error}
            </Alert>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Matricule *" htmlFor="add-matricule">
              <Input
                id="add-matricule"
                value={form.matricule}
                onChange={(event) => update("matricule", event.target.value)}
                placeholder="CAN31/001"
                required
              />
            </Field>
            <Field label="Classe *" htmlFor="add-classe">
              <Input
                id="add-classe"
                list="classes-list"
                value={form.classe}
                onChange={(event) => update("classe", event.target.value)}
                placeholder="CAN31-MPJ21-L1"
                required
              />
              <datalist id="classes-list">
                {classes.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </Field>
          </div>

          <Field label="Nom de famille *" htmlFor="add-nom">
            <Input
              id="add-nom"
              value={form.nom}
              onChange={(event) => update("nom", event.target.value)}
              placeholder="DIADEMAHARISON"
              required
            />
          </Field>

          <Field label="Prénoms *" htmlFor="add-prenoms">
            <Input
              id="add-prenoms"
              value={form.prenoms}
              onChange={(event) => update("prenoms", event.target.value)}
              placeholder="Judicaël"
              required
            />
          </Field>

          <Field
            label="Note de vérification"
            htmlFor="add-note"
            hint="Optionnel. Affiché comme badge « à vérifier » dans l’administration."
          >
            <Textarea
              id="add-note"
              value={form.noteVerification}
              onChange={(event) => update("noteVerification", event.target.value)}
              placeholder="Ex. orthographe incertaine, découpage nom/prénoms à confirmer…"
              className="min-h-[80px]"
            />
          </Field>

          <div className="flex flex-wrap justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Annuler
            </Button>
            <Button type="submit" loading={loading}>
              Ajouter
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
