import { describe, expect, it } from "vitest";
import {
  formatMoney,
  formatPercent,
  initials,
  parseLocalDateTime,
  startOfUtcDay,
  toLocalDateTimeInput,
  truncate,
} from "@/lib/utils";

describe("dates Madagascar", () => {
  it("interprète une saisie locale comme UTC+3", () => {
    expect(parseLocalDateTime("2026-05-01T12:30")?.toISOString()).toBe(
      "2026-05-01T09:30:00.000Z",
    );
  });

  it("convertit une date UTC vers le champ local", () => {
    expect(toLocalDateTimeInput("2026-05-01T09:30:00.000Z")).toBe("2026-05-01T12:30");
  });

  it("gère les valeurs vides ou invalides", () => {
    expect(parseLocalDateTime("")).toBeNull();
    expect(parseLocalDateTime(null)).toBeNull();
    expect(toLocalDateTimeInput(null)).toBe("");
    expect(toLocalDateTimeInput("pas une date")).toBe("");
  });

  it("calcule le début du jour UTC", () => {
    expect(startOfUtcDay(new Date("2026-05-01T23:45:00Z")).toISOString()).toBe(
      "2026-05-01T00:00:00.000Z",
    );
  });
});

describe("formatage", () => {
  it("formate les pourcentages en français", () => {
    expect(formatPercent(62.345)).toBe("62,3 %");
    expect(formatPercent(100, 0)).toBe("100 %");
  });

  it("formate les montants en Ariary", () => {
    expect(formatMoney(50000)).toMatch(/^50\s*000\s*Ar$/);
    expect(formatMoney(0)).toBe("0 Ar");
  });

  it("calcule les initiales", () => {
    expect(initials("Rákoa Jean")).toBe("RJ");
    expect(initials("")).toBe("");
  });

  it("tronque proprement", () => {
    expect(truncate("abcdef", 4)).toBe("abc…");
    expect(truncate("abc", 4)).toBe("abc");
  });
});
