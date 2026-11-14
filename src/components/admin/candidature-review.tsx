"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, FileText, X } from "lucide-react";
import { apiFetch, ApiClientError } from "@/lib/client-api";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Field, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateTime } from "@/lib/utils";

type Application = {
  id: string;
  statut: "EN_ATTENTE" | "VALIDEE" | "REFUSEE";
  photoUrl: string | null;
  slogan: string | null;
  programme: string | null;
  motif: string | null;
  createdAt: string;
  position: { id: string; titre: string };
  student: { nom: string; prenoms: string; matricule: string; classe: string };
};

const labels = {
  EN_ATTENTE: { label: "En attente", variant: "warning" as const },
  VALIDEE: { label: "Validée", variant: "success" as const },
  REFUSEE: { label: "Refusée", variant: "danger" as const },
};

export function CandidatureReview({ applications }: { applications: Application[] }) {
  const router = useRouter();
  const [target, setTarget] = useState<{
    application: Application;
    statut: "VALIDEE" | "REFUSEE";
  } | null>(null);
  const [motif, setMotif] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function open(application: Application, statut: "VALIDEE" | "REFUSEE") {
    setTarget({ application, statut });
    setMotif("");
    setError(null);
  }

  async function submit() {
    if (!target) return;
    setLoading(true);
    setError(null);
    try {
      await apiFetch(`/api/admin/candidatures/${target.application.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          statut: target.statut,
          motif: target.statut === "REFUSEE" ? motif : null,
        }),
      });
      setTarget(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Traitement impossible.");
    } finally {
      setLoading(false);
    }
  }

  if (applications.length === 0) {
    return (
      <EmptyState
        icon={<FileText className="h-8 w-8" />}
        title="Aucune candidature"
        description="Les candidatures déposées par les étudiants apparaîtront ici."
      />
    );
  }

  return (
    <div className="space-y-3">
      {applications.map((application) => {
        const meta = labels[application.statut];
        return (
          <div key={application.id} className="rounded-xl border border-ink-100 bg-white p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-ink-900">
                  {application.student.prenoms} {application.student.nom}
                </p>
                <p className="text-xs text-ink-500">
                  {application.position.titre} · {application.student.classe} ·{" "}
                  {application.student.matricule}
                </p>
                <p className="mt-1 text-xs text-ink-400">
                  Déposée le {formatDateTime(new Date(application.createdAt))}
                </p>
              </div>
              <Badge variant={meta.variant}>{meta.label}</Badge>
            </div>

            {application.slogan ? (
              <p className="mt-2 text-sm italic text-brand-700">« {application.slogan} »</p>
            ) : null}
            <p className="mt-2 line-clamp-4 whitespace-pre-line text-sm leading-relaxed text-ink-600">
              {application.programme || "Programme non renseigné."}
            </p>
            {application.motif ? (
              <p className="mt-2 rounded-lg bg-red-50 px-2.5 py-2 text-xs text-red-700">
                Motif du refus : {application.motif}
              </p>
            ) : null}

            {application.statut === "EN_ATTENTE" ? (
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={() => open(application, "VALIDEE")}>
                  <Check className="h-4 w-4" aria-hidden />
                  Valider
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => open(application, "REFUSEE")}
                >
                  <X className="h-4 w-4" aria-hidden />
                  Refuser
                </Button>
              </div>
            ) : null}
          </div>
        );
      })}

      <Modal
        open={target !== null}
        onClose={() => (loading ? null : setTarget(null))}
        title={
          target?.statut === "VALIDEE"
            ? "Valider cette candidature ?"
            : "Refuser cette candidature ?"
        }
        description={
          target
            ? `${target.application.student.prenoms} ${target.application.student.nom} — ${target.application.position.titre}`
            : undefined
        }
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setTarget(null)} disabled={loading}>
              Annuler
            </Button>
            <Button
              variant={target?.statut === "REFUSEE" ? "danger" : "primary"}
              onClick={submit}
              loading={loading}
            >
              {target?.statut === "VALIDEE" ? "Valider" : "Refuser"}
            </Button>
          </>
        }
      >
        {error ? <Alert variant="error">{error}</Alert> : null}
        {target?.statut === "VALIDEE" ? (
          <p className="text-sm text-ink-600">
            La candidature sera ajoutée à la liste officielle des candidats pour ce poste.
            L’étudiant recevra une notification.
          </p>
        ) : (
          <Field label="Motif du refus *" htmlFor="candidature-motif">
            <Textarea
              id="candidature-motif"
              value={motif}
              onChange={(event) => setMotif(event.target.value)}
              placeholder="Explique brièvement la décision à l’étudiant."
              maxLength={500}
              required
            />
          </Field>
        )}
      </Modal>
    </div>
  );
}
