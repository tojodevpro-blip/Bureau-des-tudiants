import { describe, expect, it } from "vitest";
import type { Election } from "@prisma/client";
import {
  ALLOWED_TRANSITIONS,
  canTransition,
  getElectionPhase,
  isVoteWindowOpen,
} from "@/lib/election-status";

function election(
  statut: Election["statut"],
  ouvreLe: Date | null,
  fermeLe: Date | null,
): Pick<Election, "statut" | "ouvreLe" | "fermeLe"> {
  return { statut, ouvreLe, fermeLe };
}

describe("transitions d’élection", () => {
  it("suit le cycle prévu", () => {
    expect(canTransition("BROUILLON", "CANDIDATURES")).toBe(true);
    expect(canTransition("CANDIDATURES", "OUVERTE")).toBe(true);
    expect(canTransition("OUVERTE", "CLOTUREE")).toBe(true);
    expect(canTransition("CLOTUREE", "PUBLIEE")).toBe(true);
    expect(canTransition("BROUILLON", "OUVERTE")).toBe(false);
    expect(canTransition("PUBLIEE", "CLOTUREE")).toBe(false);
    expect(ALLOWED_TRANSITIONS.PUBLIEE).toEqual([]);
  });
});

describe("fenêtre de vote", () => {
  const open = election("OUVERTE", new Date("2026-05-01T08:00:00Z"), new Date("2026-05-01T18:00:00Z"));

  it("accepte une date dans la fenêtre", () => {
    expect(isVoteWindowOpen(open, new Date("2026-05-01T12:00:00Z"))).toBe(true);
  });

  it("refuse avant et après la fenêtre", () => {
    expect(isVoteWindowOpen(open, new Date("2026-05-01T07:59:59Z"))).toBe(false);
    expect(isVoteWindowOpen(open, new Date("2026-05-01T18:00:01Z"))).toBe(false);
  });

  it("refuse si l’élection n’est pas ouverte ou sans dates", () => {
    expect(isVoteWindowOpen(election("CANDIDATURES", open.ouvreLe, open.fermeLe))).toBe(false);
    expect(isVoteWindowOpen(election("OUVERTE", null, null))).toBe(false);
  });
});

describe("phase d’élection", () => {
  it("distingue avant, pendant et après", () => {
    const window = election(
      "OUVERTE",
      new Date("2026-05-01T08:00:00Z"),
      new Date("2026-05-01T18:00:00Z"),
    );
    expect(getElectionPhase(window, new Date("2026-05-01T07:00:00Z"))).toBe("AVANT");
    expect(getElectionPhase(window, new Date("2026-05-01T12:00:00Z"))).toBe("PENDANT");
    expect(getElectionPhase(window, new Date("2026-05-01T19:00:00Z"))).toBe("APRES");
    expect(getElectionPhase(election("PUBLIEE", null, null))).toBe("APRES");
  });
});
