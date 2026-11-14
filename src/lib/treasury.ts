export const TREASURY_TYPE_LABELS = {
  RECETTE: "Recette",
  DEPENSE: "Dépense",
} as const;

export type TreasuryTypeValue = keyof typeof TREASURY_TYPE_LABELS;

export const TREASURY_PAYMENT_LABELS = {
  ESPECES: "Espèces",
  MVOLA: "MVola",
  AIRTEL_MONEY: "Airtel Money",
  VIREMENT: "Virement bancaire",
  AUTRE: "Autre",
} as const;

export type TreasuryPaymentValue = keyof typeof TREASURY_PAYMENT_LABELS;

export const TREASURY_PAYMENT_METHODS = Object.keys(
  TREASURY_PAYMENT_LABELS,
) as TreasuryPaymentValue[];

export const TREASURY_CATEGORIES = {
  RECETTE: [
    "Cotisations",
    "Billetterie",
    "Sponsoring",
    "Subvention",
    "Vente",
    "Dons",
    "Autre recette",
  ],
  DEPENSE: [
    "Événement",
    "Matériel",
    "Transport",
    "Communication",
    "Impression",
    "Réception",
    "Autre dépense",
  ],
} as const;

export const TREASURY_CATEGORIES_ALL = Array.from(
  new Set([...TREASURY_CATEGORIES.RECETTE, ...TREASURY_CATEGORIES.DEPENSE]),
);
