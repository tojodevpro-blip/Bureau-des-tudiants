"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, FileText, ShieldCheck, Vote as VoteIcon } from "lucide-react";
import { apiFetch, ApiClientError } from "@/lib/client-api";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { cn, initials } from "@/lib/utils";

type Candidate = {
  id: string;
  nomAffiche: string;
  photoUrl: string | null;
  slogan: string | null;
  programme: string | null;
  ordre: number;
};

type Position = {
  id: string;
  titre: string;
  description: string | null;
  candidates: Candidate[];
};

type Selection = string | null | undefined;

export function MultiVoteClient({
  electionId,
  positions,
}: {
  electionId: string;
  positions: Position[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Record<string, Selection>>({});
  const [programme, setProgramme] = useState<Candidate | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alreadyVoted, setAlreadyVoted] = useState(false);

  const complete = positions.every((position) => selected[position.id] !== undefined);
  const remaining = positions.filter((position) => selected[position.id] === undefined).length;

  function candidateFor(position: Position) {
    const candidateId = selected[position.id];
    if (!candidateId) return null;
    return position.candidates.find((candidate) => candidate.id === candidateId) ?? null;
  }

  async function submit() {
    if (!complete) return;
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch("/api/vote", {
        method: "POST",
        body: JSON.stringify({
          electionId,
          choices: positions.map((position) => ({
            positionId: position.id,
            candidateId: selected[position.id] ?? null,
          })),
        }),
      });
      router.push("/vote/succes");
      router.refresh();
    } catch (err) {
      setConfirmOpen(false);
      setSubmitting(false);
      if (err instanceof ApiClientError) {
        if (err.code === "DEJA_VOTE") {
          setAlreadyVoted(true);
          setError("Ton vote a déjà été enregistré. Un seul vote est autorisé.");
        } else {
          setError(err.message);
        }
      } else {
        setError("Impossible d’enregistrer ton vote. Réessaie.");
      }
    }
  }

  return (
    <div className="mt-6 pb-28">
      {error ? (
        <Alert
          variant={alreadyVoted ? "warning" : "error"}
          title="Vote non enregistré"
          className="mb-4"
        >
          {error}
          {alreadyVoted ? (
            <div className="mt-2">
              <Button variant="outline" size="sm" onClick={() => router.push("/tableau-de-bord")}>
                Voir mon espace
              </Button>
            </div>
          ) : null}
        </Alert>
      ) : null}

      <div className="space-y-6">
        {positions.map((position, positionIndex) => (
          <section
            key={position.id}
            className="rounded-2xl border border-ink-100 bg-white p-4 shadow-card sm:p-5"
            aria-labelledby={`position-${position.id}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                  Poste {positionIndex + 1} sur {positions.length}
                </p>
                <h2
                  id={`position-${position.id}`}
                  className="mt-1 text-lg font-bold text-ink-950"
                >
                  {position.titre}
                </h2>
                {position.description ? (
                  <p className="mt-1 text-sm text-ink-500">{position.description}</p>
                ) : null}
              </div>
              {selected[position.id] === undefined ? (
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
                  À compléter
                </span>
              ) : (
                <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-800">
                  Choix enregistré
                </span>
              )}
            </div>

            <div
              role="radiogroup"
              aria-label={`Choix pour ${position.titre}`}
              className="mt-4 grid gap-2.5 sm:grid-cols-2"
            >
              {position.candidates.map((candidate) => {
                const active = selected[position.id] === candidate.id;
                return (
                  <div
                    key={candidate.id}
                    className={cn(
                      "overflow-hidden rounded-xl border transition",
                      active
                        ? "border-brand-500 ring-2 ring-brand-500/20"
                        : "border-ink-100 hover:border-ink-200",
                    )}
                  >
                    <button
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() =>
                        setSelected((current) => ({ ...current, [position.id]: candidate.id }))
                      }
                      className="flex w-full items-center gap-3 p-3 text-left"
                    >
                      <span
                        className={cn(
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
                          active ? "border-brand-600 bg-brand-600" : "border-ink-300",
                        )}
                        aria-hidden
                      >
                        {active ? <span className="h-2 w-2 rounded-full bg-white theme-fixed-light" /> : null}
                      </span>
                      <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-brand-50">
                        {candidate.photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={candidate.photoUrl}
                            alt=""
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-xs font-black text-brand-700">
                            {initials(candidate.nomAffiche)}
                          </span>
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-ink-950">
                          {candidate.nomAffiche}
                        </span>
                        {candidate.slogan ? (
                          <span className="mt-0.5 block line-clamp-2 text-xs text-ink-500">
                            « {candidate.slogan} »
                          </span>
                        ) : (
                          <span className="mt-0.5 block text-xs text-ink-400">
                            Candidat n° {candidate.ordre}
                          </span>
                        )}
                      </span>
                    </button>
                    {candidate.programme ? (
                      <div className="px-3 pb-3">
                        <button
                          type="button"
                          onClick={() => setProgramme(candidate)}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 hover:underline"
                        >
                          <FileText className="h-3.5 w-3.5" aria-hidden />
                          Voir le programme
                        </button>
                      </div>
                    ) : null}
                  </div>
                );
              })}

              <div
                className={cn(
                  "overflow-hidden rounded-xl border transition sm:col-span-2",
                  selected[position.id] === null
                    ? "border-ink-500 ring-2 ring-ink-500/10"
                    : "border-ink-100 hover:border-ink-200",
                )}
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={selected[position.id] === null}
                  onClick={() =>
                    setSelected((current) => ({ ...current, [position.id]: null }))
                  }
                  className="flex w-full items-center gap-3 p-3 text-left"
                >
                  <span
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
                      selected[position.id] === null
                        ? "border-ink-700 bg-ink-700"
                        : "border-ink-300",
                    )}
                    aria-hidden
                  >
                    {selected[position.id] === null ? (
                      <span className="h-2 w-2 rounded-full bg-white theme-fixed-light" />
                    ) : null}
                  </span>
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-ink-100 text-ink-500">
                    <VoteIcon className="h-6 w-6" aria-hidden />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-ink-950">
                      Vote blanc à ce poste
                    </span>
                    <span className="block text-xs text-ink-500">
                      Aucun candidat pour ce poste.
                    </span>
                  </span>
                </button>
              </div>
            </div>
          </section>
        ))}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-100 bg-white/95 p-4 backdrop-blur safe-bottom no-print sm:sticky sm:mt-6 sm:rounded-2xl sm:border sm:shadow-card">
        <div className="container-page flex items-center justify-between gap-3 sm:max-w-3xl sm:px-4">
          <div className="min-w-0">
            <p className="text-xs text-ink-500">Bulletin</p>
            <p className="truncate text-sm font-semibold text-ink-900">
              {complete
                ? `${positions.length} poste(s) complété(s)`
                : `${remaining} poste(s) à compléter`}
            </p>
          </div>
          <Button
            type="button"
            size="lg"
            disabled={!complete || submitting}
            onClick={() => setConfirmOpen(true)}
          >
            Vérifier mon bulletin
          </Button>
        </div>
      </div>

      <Modal
        open={Boolean(programme)}
        onClose={() => setProgramme(null)}
        title={programme?.nomAffiche ?? "Programme"}
        description={programme?.slogan ? `« ${programme.slogan} »` : undefined}
        size="lg"
      >
        <div className="whitespace-pre-line text-sm leading-relaxed text-ink-600">
          {programme?.programme || "Programme non renseigné."}
        </div>
        <div className="mt-6 flex justify-end">
          <Button variant="outline" onClick={() => setProgramme(null)}>
            Fermer
          </Button>
        </div>
      </Modal>

      <Modal
        open={confirmOpen}
        onClose={() => {
          if (!submitting) setConfirmOpen(false);
        }}
        title="Confirmer ton bulletin ?"
        description="Cette action est définitive. Tu ne pourras plus modifier tes choix."
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={submitting}>
              Revenir
            </Button>
            <Button onClick={submit} loading={submitting}>
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              Confirmer mon vote
            </Button>
          </>
        }
      >
        <div className="space-y-2">
          {positions.map((position) => {
            const candidate = candidateFor(position);
            return (
              <div
                key={position.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-ink-100 bg-ink-50 p-3"
              >
                <span className="min-w-0 text-sm font-medium text-ink-700">
                  {position.titre}
                </span>
                <span className="shrink-0 text-sm font-bold text-ink-950">
                  {candidate ? candidate.nomAffiche : "Vote blanc"}
                </span>
              </div>
            );
          })}
        </div>
        <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-ink-500">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden />
          Ton vote est secret et ne sera jamais associé à ton nom dans les résultats.
        </p>
      </Modal>
    </div>
  );
}
