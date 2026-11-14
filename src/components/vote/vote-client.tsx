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

export function VoteClient({
  electionId,
  candidates,
}: {
  electionId: string;
  candidates: Candidate[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null | undefined>(undefined);
  const [programme, setProgramme] = useState<Candidate | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alreadyVoted, setAlreadyVoted] = useState(false);

  const selectedCandidate =
    selected === null ? null : candidates.find((candidate) => candidate.id === selected);

  async function submit() {
    if (selected === undefined) return;
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch("/api/vote", {
        method: "POST",
        body: JSON.stringify({ electionId, candidateId: selected }),
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
        <Alert variant={alreadyVoted ? "warning" : "error"} title="Vote non enregistré" className="mb-4">
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

      <div
        role="radiogroup"
        aria-label="Choix du candidat"
        className="grid gap-3 sm:grid-cols-2"
      >
        {candidates.map((candidate) => {
          const active = selected === candidate.id;
          return (
            <div
              key={candidate.id}
              className={cn(
                "overflow-hidden rounded-2xl border bg-white shadow-card transition",
                active
                  ? "border-brand-500 ring-2 ring-brand-500/20"
                  : "border-ink-100 hover:border-ink-200",
              )}
            >
              <button
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setSelected(candidate.id)}
                className="flex w-full items-center gap-3 p-4 text-left"
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

                <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-brand-50">
                  {candidate.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={candidate.photoUrl}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-sm font-black text-brand-700">
                      {initials(candidate.nomAffiche)}
                    </span>
                  )}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-ink-950">
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
                <div className="px-4 pb-4">
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
            "overflow-hidden rounded-2xl border bg-white shadow-card transition sm:col-span-2",
            selected === null
              ? "border-ink-500 ring-2 ring-ink-500/10"
              : "border-ink-100 hover:border-ink-200",
          )}
        >
          <button
            type="button"
            role="radio"
            aria-checked={selected === null}
            onClick={() => setSelected(null)}
            className="flex w-full items-center gap-3 p-4 text-left"
          >
            <span
              className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
                selected === null ? "border-ink-700 bg-ink-700" : "border-ink-300",
              )}
              aria-hidden
            >
              {selected === null ? <span className="h-2 w-2 rounded-full bg-white theme-fixed-light" /> : null}
            </span>
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-ink-100 text-ink-500">
              <VoteIcon className="h-8 w-8" aria-hidden />
            </span>
            <span>
              <span className="block font-semibold text-ink-950">Vote blanc</span>
              <span className="block text-xs text-ink-500">
                Je ne souhaite choisir aucun candidat.
              </span>
            </span>
          </button>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-100 bg-white/95 p-4 backdrop-blur safe-bottom no-print sm:sticky sm:mt-6 sm:rounded-2xl sm:border sm:shadow-card">
        <div className="container-page flex items-center justify-between gap-3 sm:max-w-3xl sm:px-4">
          <div className="min-w-0">
            <p className="text-xs text-ink-500">Choix sélectionné</p>
            <p className="truncate text-sm font-semibold text-ink-900">
              {selected === undefined
                ? "Aucun"
                : selected === null
                  ? "Vote blanc"
                  : selectedCandidate?.nomAffiche}
            </p>
          </div>
          <Button
            type="button"
            size="lg"
            disabled={selected === undefined || submitting}
            onClick={() => setConfirmOpen(true)}
          >
            Continuer
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
        title="Confirmer ton vote ?"
        description="Cette action est définitive. Tu ne pourras plus modifier ton choix."
        size="sm"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={submitting}
            >
              Revenir
            </Button>
            <Button onClick={submit} loading={submitting}>
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              Confirmer mon vote
            </Button>
          </>
        }
      >
        <div className="rounded-xl border border-ink-100 bg-ink-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
            Ton choix
          </p>
          <p className="mt-1 text-lg font-bold text-ink-950">
            {selected === null ? "Vote blanc" : selectedCandidate?.nomAffiche}
          </p>
        </div>
        <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-ink-500">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden />
          Ton vote est secret et ne sera jamais associé à ton nom dans les résultats.
        </p>
      </Modal>
    </div>
  );
}
