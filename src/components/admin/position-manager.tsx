"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Save, Trash2, UsersRound } from "lucide-react";
import { apiFetch, ApiClientError } from "@/lib/client-api";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";

type Position = {
  id: string;
  titre: string;
  description: string | null;
  ordre: number;
  candidateCount: number;
};

const emptyForm = { titre: "", description: "" };

export function PositionManager({
  electionId,
  positions,
  editable,
}: {
  electionId: string;
  positions: Position[];
  editable: boolean;
}) {
  const router = useRouter();
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<Position | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Position | null>(null);
  const [deleting, setDeleting] = useState(false);

  function openCreate() {
    setForm(emptyForm);
    setEditing(null);
    setError(null);
    setModal("create");
  }

  function openEdit(position: Position) {
    setForm({ titre: position.titre, description: position.description ?? "" });
    setEditing(position);
    setError(null);
    setModal("edit");
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload = {
        titre: form.titre,
        description: form.description || null,
      };
      if (modal === "create") {
        await apiFetch(`/api/admin/elections/${electionId}/positions`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
      } else if (editing) {
        await apiFetch(`/api/admin/positions/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      }
      setModal(null);
      setEditing(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Enregistrement impossible.");
    } finally {
      setLoading(false);
    }
  }

  async function remove() {
    if (!deleteTarget) return;
    setDeleting(true);
    setError(null);
    try {
      await apiFetch(`/api/admin/positions/${deleteTarget.id}`, { method: "DELETE" });
      setDeleteTarget(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Suppression impossible.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      {error && !modal ? <Alert variant="error">{error}</Alert> : null}

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-ink-500">
          {positions.length} poste(s). Chaque poste dispose de son propre bulletin.
        </p>
        {editable ? (
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" aria-hidden />
            Ajouter un poste
          </Button>
        ) : null}
      </div>

      {positions.length === 0 ? (
        <EmptyState
          icon={<UsersRound className="h-8 w-8" />}
          title="Aucun poste"
          description="Scrutin simple tant qu’aucun poste n’est créé. Ajoute des postes pour organiser un vote par fonction."
          action={
            editable ? (
              <Button size="sm" onClick={openCreate}>
                <Plus className="h-4 w-4" aria-hidden />
                Créer un poste
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ul className="space-y-2">
          {positions.map((position) => (
            <li
              key={position.id}
              className="flex items-center gap-3 rounded-xl border border-ink-100 bg-white p-3"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-xs font-bold text-brand-700">
                {position.ordre}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-ink-900">{position.titre}</p>
                <p className="truncate text-xs text-ink-500">
                  {position.description || "Sans description"} · {position.candidateCount}{" "}
                  candidat(s)
                </p>
              </div>
              {editable ? (
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(position)}
                    className="rounded-lg p-2 text-ink-500 hover:bg-ink-100"
                    aria-label="Modifier le poste"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setDeleteTarget(position);
                    }}
                    className="rounded-lg p-2 text-ink-500 hover:bg-red-50 hover:text-red-600"
                    aria-label="Supprimer le poste"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={modal !== null}
        onClose={() => (loading ? null : setModal(null))}
        title={modal === "edit" ? "Modifier le poste" : "Ajouter un poste"}
        description="Le titre apparaît sur le bulletin et dans les résultats."
        size="md"
      >
        <form onSubmit={submit} className="space-y-4" noValidate>
          {error ? <Alert variant="error">{error}</Alert> : null}
          <Field label="Titre du poste *" htmlFor="position-title">
            <Input
              id="position-title"
              value={form.titre}
              onChange={(event) => setForm({ ...form, titre: event.target.value })}
              placeholder="Président, Trésorier, Secrétaire…"
              required
              maxLength={120}
            />
          </Field>
          <Field label="Description" htmlFor="position-description">
            <Textarea
              id="position-description"
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              placeholder="Missions et responsabilités du poste."
              maxLength={1000}
            />
          </Field>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setModal(null)} disabled={loading}>
              Annuler
            </Button>
            <Button type="submit" loading={loading}>
              <Save className="h-4 w-4" aria-hidden />
              Enregistrer
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={deleteTarget !== null}
        onClose={() => (deleting ? null : setDeleteTarget(null))}
        title="Supprimer ce poste ?"
        description={deleteTarget ? `« ${deleteTarget.titre} » sera retiré de l’élection.` : undefined}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Annuler
            </Button>
            <Button variant="danger" onClick={remove} loading={deleting}>
              Supprimer
            </Button>
          </>
        }
      >
        {error ? <Alert variant="error">{error}</Alert> : null}
        <p className="text-xs text-ink-500">
          La suppression est refusée si le poste contient des candidats ou des candidatures.
        </p>
      </Modal>
    </div>
  );
}
