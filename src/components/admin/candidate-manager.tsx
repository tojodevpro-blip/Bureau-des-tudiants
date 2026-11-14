"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  ImageIcon,
  Pencil,
  Plus,
  Save,
  Trash2,
  UserRound,
} from "lucide-react";
import { apiFetch, ApiClientError } from "@/lib/client-api";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { initials } from "@/lib/utils";

type Candidate = {
  id: string;
  positionId: string | null;
  nomAffiche: string;
  photoUrl: string | null;
  slogan: string | null;
  programme: string | null;
  ordre: number;
};

type Position = {
  id: string;
  titre: string;
};

const emptyForm = {
  positionId: "",
  nomAffiche: "",
  photoUrl: "",
  slogan: "",
  programme: "",
};

export function CandidateManager({
  electionId,
  candidates,
  positions,
  editable,
}: {
  electionId: string;
  candidates: Candidate[];
  positions: Position[];
  editable: boolean;
}) {
  const router = useRouter();
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<Candidate | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Candidate | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [moving, setMoving] = useState(false);

  const sortedCandidates = [...candidates].sort((a, b) => {
    const positionA = positions.findIndex((position) => position.id === a.positionId);
    const positionB = positions.findIndex((position) => position.id === b.positionId);
    return positionA - positionB || a.ordre - b.ordre;
  });

  function openCreate() {
    setForm({ ...emptyForm, positionId: positions[0]?.id ?? "" });
    setEditing(null);
    setError(null);
    setModal("create");
  }

  function openEdit(candidate: Candidate) {
    setForm({
      positionId: candidate.positionId ?? positions[0]?.id ?? "",
      nomAffiche: candidate.nomAffiche,
      photoUrl: candidate.photoUrl ?? "",
      slogan: candidate.slogan ?? "",
      programme: candidate.programme ?? "",
    });
    setEditing(candidate);
    setError(null);
    setModal("edit");
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload = {
        positionId: form.positionId || null,
        nomAffiche: form.nomAffiche,
        photoUrl: form.photoUrl || null,
        slogan: form.slogan || null,
        programme: form.programme || null,
      };
      if (modal === "create") {
        await apiFetch(`/api/admin/elections/${electionId}/candidates`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
      } else if (editing) {
        await apiFetch(`/api/admin/candidates/${editing.id}`, {
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
      await apiFetch(`/api/admin/candidates/${deleteTarget.id}`, { method: "DELETE" });
      setDeleteTarget(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Suppression impossible.");
    } finally {
      setDeleting(false);
    }
  }

  async function move(candidate: Candidate, direction: -1 | 1) {
    const groupIndices = sortedCandidates
      .map((item, index) => (item.positionId === candidate.positionId ? index : -1))
      .filter((index) => index >= 0);
    const index = groupIndices.findIndex(
      (globalIndex) => sortedCandidates[globalIndex]?.id === candidate.id,
    );
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= groupIndices.length) return;
    const reordered = [...sortedCandidates];
    const currentGlobal = groupIndices[index];
    const nextGlobal = groupIndices[nextIndex];
    if (currentGlobal === undefined || nextGlobal === undefined) return;
    [reordered[currentGlobal], reordered[nextGlobal]] = [
      reordered[nextGlobal]!,
      reordered[currentGlobal]!,
    ];
    const orderedIds = reordered.map((item) => item.id);

    setMoving(true);
    setError(null);
    try {
      await apiFetch(`/api/admin/elections/${electionId}/reorder`, {
        method: "POST",
        body: JSON.stringify({ orderedIds }),
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Réordonnancement impossible.");
    } finally {
      setMoving(false);
    }
  }

  return (
    <div className="space-y-4">
      {error ? <Alert variant="error">{error}</Alert> : null}

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-ink-500">
          {candidates.length} candidat(s) · l’ordre détermine l’affichage sur le bulletin.
        </p>
        {editable ? (
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" aria-hidden />
            Ajouter
          </Button>
        ) : null}
      </div>

      {candidates.length === 0 ? (
        <EmptyState
          icon={<UserRound className="h-8 w-8" />}
          title="Aucun candidat"
          description={
            editable
              ? "Ajoute au moins deux candidats avant d’ouvrir le vote."
              : "Aucun candidat n’a été enregistré."
          }
          action={
            editable ? (
              <Button size="sm" onClick={openCreate}>
                <Plus className="h-4 w-4" aria-hidden />
                Ajouter un candidat
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ul className="space-y-3">
          {sortedCandidates.map((candidate, index) => {
            const group = sortedCandidates.filter(
              (item) => item.positionId === candidate.positionId,
            );
            const groupIndex = group.findIndex((item) => item.id === candidate.id);
            return (
              <li
                key={candidate.id}
                className="flex flex-col gap-3 rounded-xl border border-ink-100 bg-white p-3 sm:flex-row sm:items-center"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-100 text-xs font-bold text-ink-600">
                    {index + 1}
                  </span>
                  <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-brand-50">
                    {candidate.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={candidate.photoUrl}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-xs font-bold text-brand-700">
                        {initials(candidate.nomAffiche) || <ImageIcon className="h-4 w-4" />}
                      </span>
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink-900">{candidate.nomAffiche}</p>
                    {candidate.positionId ? (
                      <p className="truncate text-xs font-medium text-brand-700">
                        {positions.find((position) => position.id === candidate.positionId)?.titre ??
                          "Poste supprimé"}
                      </p>
                    ) : null}
                    {candidate.slogan ? (
                      <p className="truncate text-xs text-ink-500">« {candidate.slogan} »</p>
                    ) : null}
                    {candidate.programme ? (
                      <p className="truncate text-xs text-ink-400">
                        {candidate.programme.slice(0, 100)}
                      </p>
                    ) : null}
                  </div>
                </div>

                {editable ? (
                  <div className="flex shrink-0 items-center gap-1 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => move(candidate, -1)}
                      disabled={groupIndex <= 0 || moving}
                      className="rounded-lg p-2 text-ink-500 hover:bg-ink-100 disabled:opacity-30"
                      aria-label="Monter"
                      title="Monter"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(candidate, 1)}
                      disabled={groupIndex === group.length - 1 || moving}
                      className="rounded-lg p-2 text-ink-500 hover:bg-ink-100 disabled:opacity-30"
                      aria-label="Descendre"
                      title="Descendre"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(candidate)}
                      className="rounded-lg p-2 text-ink-500 hover:bg-ink-100"
                      aria-label="Modifier"
                      title="Modifier"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setDeleteTarget(candidate);
                      }}
                      className="rounded-lg p-2 text-ink-500 hover:bg-red-50 hover:text-red-600"
                      aria-label="Supprimer"
                      title="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <Modal
        open={modal !== null}
        onClose={() => (loading ? null : setModal(null))}
        title={modal === "edit" ? "Modifier le candidat" : "Ajouter un candidat"}
        description="La photo est une URL publique. Le programme peut être long."
        size="lg"
      >
        <form onSubmit={submit} className="space-y-4" noValidate>
          {error ? <Alert variant="error">{error}</Alert> : null}

          {positions.length > 0 ? (
            <Field label="Poste *" htmlFor="candidate-position">
              <Select
                id="candidate-position"
                value={form.positionId}
                onChange={(event) => setForm({ ...form, positionId: event.target.value })}
                required
              >
                {positions.map((position) => (
                  <option key={position.id} value={position.id}>
                    {position.titre}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}

          <Field label="Nom affiché *" htmlFor="candidate-name">
            <Input
              id="candidate-name"
              value={form.nomAffiche}
              onChange={(event) => setForm({ ...form, nomAffiche: event.target.value })}
              placeholder="Prénom NOM"
              required
            />
          </Field>

          <Field
            label="Photo (URL)"
            htmlFor="candidate-photo"
            hint="Lien https:// vers une image. Laisse vide pour afficher les initiales."
          >
            <Input
              id="candidate-photo"
              value={form.photoUrl}
              onChange={(event) => setForm({ ...form, photoUrl: event.target.value })}
              placeholder="https://…/photo.jpg"
            />
          </Field>

          <Field label="Slogan" htmlFor="candidate-slogan">
            <Input
              id="candidate-slogan"
              value={form.slogan}
              onChange={(event) => setForm({ ...form, slogan: event.target.value })}
              placeholder="Une phrase courte"
              maxLength={200}
            />
          </Field>

          <Field label="Programme" htmlFor="candidate-programme">
            <Textarea
              id="candidate-programme"
              value={form.programme}
              onChange={(event) => setForm({ ...form, programme: event.target.value })}
              placeholder="Présentation, priorités, engagements…"
              className="min-h-[160px]"
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
        title="Supprimer ce candidat ?"
        description={deleteTarget ? `« ${deleteTarget.nomAffiche} » sera retiré de l’élection.` : undefined}
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
          La suppression est refusée si le candidat a déjà reçu des votes.
        </p>
      </Modal>
    </div>
  );
}
