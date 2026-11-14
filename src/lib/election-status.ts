import type { Election, ElectionStatus } from "@prisma/client";

export const ELECTION_STATUS_LABELS: Record<ElectionStatus, string> = {
  BROUILLON: "Brouillon",
  CANDIDATURES: "Candidatures",
  OUVERTE: "Vote ouvert",
  CLOTUREE: "Clôturée",
  PUBLIEE: "Résultats publiés",
};

export const ELECTION_STATUS_DESCRIPTIONS: Record<ElectionStatus, string> = {
  BROUILLON: "L'élection est en préparation. Elle n'est pas visible publiquement.",
  CANDIDATURES: "La liste des candidats est en cours de validation.",
  OUVERTE: "Les étudiants approuvés peuvent voter pendant la fenêtre définie.",
  CLOTUREE: "Le vote est terminé. Les résultats ne sont pas encore publics.",
  PUBLIEE: "Les résultats sont visibles par tous.",
};

export const ALLOWED_TRANSITIONS: Record<ElectionStatus, ElectionStatus[]> = {
  BROUILLON: ["CANDIDATURES"],
  CANDIDATURES: ["BROUILLON", "OUVERTE"],
  OUVERTE: ["CLOTUREE"],
  CLOTUREE: ["PUBLIEE"],
  PUBLIEE: [],
};

export function canTransition(from: ElectionStatus, to: ElectionStatus) {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function isVoteWindowOpen(
  election: Pick<Election, "statut" | "ouvreLe" | "fermeLe">,
  now = new Date(),
) {
  if (election.statut !== "OUVERTE") return false;
  if (!election.ouvreLe || !election.fermeLe) return false;
  return now >= election.ouvreLe && now <= election.fermeLe;
}

export type ElectionPhase = "AVANT" | "PENDANT" | "APRES";

export function getElectionPhase(
  election: Pick<Election, "statut" | "ouvreLe" | "fermeLe">,
  now = new Date(),
): ElectionPhase {
  if (election.statut === "OUVERTE" && election.fermeLe && now > election.fermeLe) {
    return "APRES";
  }
  if (isVoteWindowOpen(election, now)) return "PENDANT";
  if (election.statut === "CLOTUREE" || election.statut === "PUBLIEE") return "APRES";
  return "AVANT";
}
