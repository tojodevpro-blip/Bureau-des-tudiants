import { describe, expect, it } from "vitest";
import {
  candidateSchema,
  electionCreateSchema,
  loginSchema,
  registerSchema,
  treasuryEntrySchema,
  voteSchema,
} from "@/lib/validation";

describe("inscription et connexion", () => {
  it("accepte une inscription valide", () => {
    expect(() =>
      registerSchema.parse({
        matricule: "CAN31/001",
        nom: "Rakoto",
        identifiant: "etudiant@univ.mg",
        motDePasse: "motdepasse",
      }),
    ).not.toThrow();
  });

  it("refuse un mot de passe trop court", () => {
    const result = registerSchema.safeParse({
      matricule: "CAN31/001",
      nom: "Rakoto",
      identifiant: "etudiant@univ.mg",
      motDePasse: "court",
    });
    expect(result.success).toBe(false);
  });

  it("accepte un identifiant téléphone", () => {
    expect(loginSchema.safeParse({ identifiant: "0341234567", motDePasse: "x" }).success).toBe(
      true,
    );
  });
});

describe("vote", () => {
  it("accepte un vote blanc", () => {
    expect(voteSchema.safeParse({ electionId: "abc", candidateId: null }).success).toBe(true);
  });

  it("refuse un candidateId vide", () => {
    expect(voteSchema.safeParse({ electionId: "abc", candidateId: "" }).success).toBe(false);
  });
});

describe("élection et candidat", () => {
  it("interprète les dates en heure locale", () => {
    const value = electionCreateSchema.parse({
      titre: "Élection BDE",
      description: "",
      ouvreLe: "2026-05-01T08:00",
      fermeLe: "2026-05-01T18:00",
    });
    expect(value.ouvreLe?.toISOString()).toBe("2026-05-01T05:00:00.000Z");
    expect(value.fermeLe?.toISOString()).toBe("2026-05-01T15:00:00.000Z");
  });

  it("refuse une URL de photo non http", () => {
    expect(
      candidateSchema.safeParse({ nomAffiche: "Rakoto", photoUrl: "javascript:alert(1)" })
        .success,
    ).toBe(false);
  });

  it("accepte une photo https ou vide", () => {
    expect(
      candidateSchema.safeParse({ nomAffiche: "Rakoto", photoUrl: "https://exemple.mg/a.jpg" })
        .success,
    ).toBe(true);
    expect(candidateSchema.safeParse({ nomAffiche: "Rakoto", photoUrl: "" }).success).toBe(true);
  });
});

describe("trésorerie", () => {
  it("accepte une opération et interprète la date locale", () => {
    const value = treasuryEntrySchema.parse({
      type: "RECETTE",
      libelle: "Cotisations L1",
      categorie: "Cotisations",
      montant: "50000",
      date: "2026-05-01",
      moyenPaiement: "MVOLA",
      reference: "TX-001",
      payeur: "Association des étudiants L1",
      note: "",
      eventId: "",
    });
    expect(value.montant).toBe(50000);
    expect(value.date.toISOString()).toBe("2026-04-30T21:00:00.000Z");
    expect(value.payeur).toBe("Association des étudiants L1");
    expect(value.eventId).toBeNull();
  });

  it("refuse un montant nul ou négatif", () => {
    const base = {
      type: "DEPENSE",
      libelle: "Transport",
      categorie: "Transport",
      date: "2026-05-01",
      moyenPaiement: "ESPECES",
    };
    expect(treasuryEntrySchema.safeParse({ ...base, montant: 0 }).success).toBe(false);
    expect(treasuryEntrySchema.safeParse({ ...base, montant: -100 }).success).toBe(false);
  });
});
