import type { RequestStatus } from "@prisma/client";

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  OUVERTE: "Ouverte",
  EN_COURS: "En cours",
  RESOLUE: "Résolue",
  FERMEE: "Fermée",
};

export const REQUEST_STATUS_VARIANTS = {
  OUVERTE: "info",
  EN_COURS: "warning",
  RESOLUE: "success",
  FERMEE: "neutral",
} as const;
