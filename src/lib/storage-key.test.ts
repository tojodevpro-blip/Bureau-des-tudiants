import { describe, expect, it } from "vitest";
import { isSafeStorageKey } from "@/lib/storage-key";

describe("isSafeStorageKey", () => {
  it("accepte les clés générées avec extension", () => {
    expect(isSafeStorageKey("identite/123e4567-e89b-12d3-a456-426614174000.webp")).toBe(true);
    expect(
      isSafeStorageKey("albums/cm123/thumbs/123e4567-e89b-12d3-a456-426614174000.webp"),
    ).toBe(true);
    expect(isSafeStorageKey("documents/reglement.pdf")).toBe(true);
  });

  it("rejette les traversées et caractères dangereux", () => {
    expect(isSafeStorageKey("../secret.webp")).toBe(false);
    expect(isSafeStorageKey("albums/../../secret.webp")).toBe(false);
    expect(isSafeStorageKey("albums\\secret.webp")).toBe(false);
    expect(isSafeStorageKey("albums//secret.webp")).toBe(false);
    expect(isSafeStorageKey("C:/secret.webp")).toBe(false);
    expect(isSafeStorageKey("albums/secret photo.webp")).toBe(false);
  });
});
