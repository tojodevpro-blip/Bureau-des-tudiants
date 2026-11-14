import { describe, expect, it } from "vitest";
import {
  InvalidMatriculeError,
  maskIdentifiant,
  namesMatch,
  normalizeIdentifiant,
  normalizeMatricule,
  normalizeName,
  tryNormalizeMatricule,
} from "@/lib/normalize";

describe("normalizeMatricule", () => {
  it("normalise le séparateur et complète à trois chiffres", () => {
    expect(normalizeMatricule("can31/01")).toBe("CAN31/001");
    expect(normalizeMatricule("MPJ18-5")).toBe("MPJ18/005");
    expect(normalizeMatricule("  can31 001 ")).toBe("CAN31/001");
  });

  it("accepte un matricule sans séparateur", () => {
    expect(normalizeMatricule("CAN31001")).toBe("CAN31/001");
  });

  it("rejette les formats invalides", () => {
    expect(() => normalizeMatricule("")).toThrow(InvalidMatriculeError);
    expect(() => normalizeMatricule("ABC")).toThrow(InvalidMatriculeError);
  });

  it("retourne un résultat typé sans lever d’exception", () => {
    expect(tryNormalizeMatricule("CAN31/1")).toEqual({ ok: true, value: "CAN31/001" });
    expect(tryNormalizeMatricule("nope").ok).toBe(false);
  });
});

describe("normalizeName", () => {
  it("ignore casse, accents, apostrophes et espaces", () => {
    expect(normalizeName("  Rákoa  Jean-Pierre ")).toBe("RAKOA JEAN PIERRE");
    expect(namesMatch("N'Dri", "n dri")).toBe(true);
    expect(namesMatch("Rakoto", "Rakotoa")).toBe(false);
  });
});

describe("normalizeIdentifiant", () => {
  it("normalise les numéros malgaches", () => {
    expect(normalizeIdentifiant("034 12 345 67")).toBe("+261341234567");
    expect(normalizeIdentifiant("+261 34 12 345 67")).toBe("+261341234567");
    expect(normalizeIdentifiant("341234567")).toBe("+261341234567");
  });

  it("normalise les emails en minuscules", () => {
    expect(normalizeIdentifiant(" Etudiant@UNIV.MG ")).toBe("etudiant@univ.mg");
  });
});

describe("maskIdentifiant", () => {
  it("masque la partie locale d’un email", () => {
    const masked = maskIdentifiant("etudiant@univ.mg");
    expect(masked.endsWith("@univ.mg")).toBe(true);
    expect(masked).not.toContain("etudiant");
  });

  it("masque un numéro de téléphone", () => {
    const masked = maskIdentifiant("+261341234567");
    expect(masked.startsWith("+261")).toBe(true);
    expect(masked.endsWith("67")).toBe(true);
    expect(masked).not.toBe("+261341234567");
  });

  it("gère les valeurs absentes", () => {
    expect(maskIdentifiant(null)).toBe("—");
  });
});
