import "server-only";

import { parse as parseCsv } from "csv-parse/sync";
import ExcelJS from "exceljs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { tryNormalizeMatricule } from "@/lib/normalize";
import { logAudit } from "@/lib/audit";
import { importRowSchema } from "@/lib/validation";

export type ImportStatus = "NOUVEAU" | "EXISTANT" | "DOUBLON_FICHIER" | "INVALIDE";

export type ImportPreviewRow = {
  ligne: number;
  matricule: string;
  matriculeNormalise: string | null;
  nom: string;
  prenoms: string;
  classe: string;
  aVerifier: string;
  statut: ImportStatus;
  raison?: string;
};

export type ImportPreview = {
  rows: ImportPreviewRow[];
  resume: {
    total: number;
    nouveaux: number;
    existants: number;
    doublons: number;
    invalides: number;
  };
  colonnesManquantes: string[];
};

const MAX_ROWS = 2000;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

function normalizeHeader(header: string) {
  const cleaned = header
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (cleaned === "a_verifier" || cleaned === "note_verification" || cleaned === "verifier") {
    return "aVerifier";
  }
  if (cleaned === "matricules") return "matricule";
  if (cleaned === "prenom" || cleaned === "pr_noms") return "prenoms";
  return cleaned;
}

function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object") {
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text).join("").trim();
    }
    if ("text" in value && typeof value.text === "string") return value.text.trim();
    if ("result" in value) return cellText(value.result as ExcelJS.CellValue);
  }
  return String(value).trim();
}

async function readRows(buffer: Buffer, filename: string): Promise<Record<string, string>[]> {
  const lower = filename.toLowerCase();
  const isExcel = lower.endsWith(".xlsx") || lower.endsWith(".xls");

  if (isExcel) {
    if (lower.endsWith(".xls")) {
      throw new ApiError(
        400,
        "Le format .xls n’est pas supporté. Enregistre le fichier en .xlsx ou en .csv.",
        "FORMAT_NON_SUPPORTE",
      );
    }
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
    const sheet = workbook.worksheets[0];
    if (!sheet) throw new ApiError(400, "Le classeur Excel est vide.", "FICHIER_VIDE");

    const headers: string[] = [];
    sheet.getRow(1).eachCell({ includeEmpty: false }, (cell, colNumber) => {
      headers[colNumber] = normalizeHeader(cellText(cell.value));
    });

    const rows: Record<string, string>[] = [];
    for (let r = 2; r <= sheet.rowCount; r += 1) {
      const row = sheet.getRow(r);
      const record: Record<string, string> = {};
      let hasValue = false;
      headers.forEach((header, colNumber) => {
        if (!header) return;
        const value = cellText(row.getCell(colNumber).value);
        record[header] = value;
        if (value) hasValue = true;
      });
      if (hasValue) rows.push(record);
    }
    return rows;
  }

  const records = parseCsv(buffer, {
    bom: true,
    columns: (headers: string[]) => headers.map(normalizeHeader),
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
    relax_quotes: true,
  }) as Record<string, string>[];

  return records.map((record) => {
    const cleaned: Record<string, string> = {};
    for (const [key, value] of Object.entries(record)) {
      const normalizedKey = normalizeHeader(key);
      cleaned[normalizedKey] = typeof value === "string" ? value.trim() : String(value ?? "");
    }
    return cleaned;
  });
}

export async function previewImport(file: File): Promise<ImportPreview> {
  if (file.size > MAX_FILE_SIZE) {
    throw new ApiError(400, "Fichier trop volumineux (5 Mo maximum).", "FICHIER_TROP_GROS");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const rows = await readRows(buffer, file.name || "import.csv");

  if (rows.length === 0) {
    throw new ApiError(400, "Le fichier ne contient aucune ligne.", "FICHIER_VIDE");
  }
  if (rows.length > MAX_ROWS) {
    throw new ApiError(
      400,
      `Trop de lignes (${rows.length}). Limite : ${MAX_ROWS} par import.`,
      "TROP_DE_LIGNES",
    );
  }

  const colonnes = new Set<string>();
  for (const row of rows) Object.keys(row).forEach((key) => colonnes.add(key));
  const colonnesManquantes = ["matricule", "nom", "prenoms", "classe"].filter(
    (col) => !colonnes.has(col),
  );

  const validMatricules: string[] = [];
  const prepared = rows.map((row, index) => {
    const matriculeBrut = (row.matricule ?? "").trim();
    const nom = (row.nom ?? "").trim();
    const prenoms = (row.prenoms ?? "").trim();
    const classe = (row.classe ?? "").trim();
    const aVerifier = (row.aVerifier ?? "").trim();
    const normalized = matriculeBrut ? tryNormalizeMatricule(matriculeBrut) : null;

    if (normalized?.ok) validMatricules.push(normalized.value);

    return {
      ligne: index + 2,
      matricule: matriculeBrut,
      matriculeNormalise: normalized?.ok ? normalized.value : null,
      nom,
      prenoms,
      classe,
      aVerifier,
      raison: normalized && !normalized.ok ? normalized.reason : undefined,
    };
  });

  const existing = new Set<string>();
  const uniqueMatricules = [...new Set(validMatricules)];
  for (let i = 0; i < uniqueMatricules.length; i += 500) {
    const chunk = uniqueMatricules.slice(i, i + 500);
    const found = await prisma.student.findMany({
      where: { matricule: { in: chunk } },
      select: { matricule: true },
    });
    found.forEach((student) => existing.add(student.matricule));
  }

  const seen = new Set<string>();
  const previewRows: ImportPreviewRow[] = prepared.map((row) => {
    if (!row.matriculeNormalise) {
      return { ...row, statut: "INVALIDE", raison: row.raison ?? "Matricule invalide." };
    }
    if (!row.nom || !row.prenoms || !row.classe) {
      return { ...row, statut: "INVALIDE", raison: "Nom, prénoms et classe sont obligatoires." };
    }
    if (seen.has(row.matriculeNormalise)) {
      return { ...row, statut: "DOUBLON_FICHIER", raison: "Doublon dans le fichier." };
    }
    seen.add(row.matriculeNormalise);
    if (existing.has(row.matriculeNormalise)) {
      return { ...row, statut: "EXISTANT", raison: "Déjà présent : la ligne sera ignorée." };
    }
    return { ...row, statut: "NOUVEAU" };
  });

  return {
    rows: previewRows,
    resume: {
      total: previewRows.length,
      nouveaux: previewRows.filter((r) => r.statut === "NOUVEAU").length,
      existants: previewRows.filter((r) => r.statut === "EXISTANT").length,
      doublons: previewRows.filter((r) => r.statut === "DOUBLON_FICHIER").length,
      invalides: previewRows.filter((r) => r.statut === "INVALIDE").length,
    },
    colonnesManquantes,
  };
}

export async function commitImport(
  rawRows: unknown[],
  acteur: string,
  ip: string,
) {
  const prepared: {
    matricule: string;
    nom: string;
    prenoms: string;
    classe: string;
    aVerifier: string;
    raw: unknown;
  }[] = [];

  for (const raw of rawRows) {
    const parsed = importRowSchema.safeParse(raw);
    if (!parsed.success) {
      continue;
    }
    const normalized = tryNormalizeMatricule(parsed.data.matricule);
    if (!normalized.ok) continue;
    prepared.push({
      matricule: normalized.value,
      nom: parsed.data.nom.trim(),
      prenoms: parsed.data.prenoms.trim(),
      classe: parsed.data.classe.trim(),
      aVerifier: parsed.data.aVerifier?.trim() ?? "",
      raw,
    });
  }

  const uniqueMatricules = [...new Set(prepared.map((row) => row.matricule))];
  const existing = new Set<string>();
  for (let i = 0; i < uniqueMatricules.length; i += 500) {
    const chunk = uniqueMatricules.slice(i, i + 500);
    const found = await prisma.student.findMany({
      where: { matricule: { in: chunk } },
      select: { matricule: true },
    });
    found.forEach((student) => existing.add(student.matricule));
  }

  let ajoutes = 0;
  let ignores = 0;
  const erreurs: { matricule: string; message: string }[] = [];
  const seen = new Set<string>();

  for (const row of prepared) {
    if (seen.has(row.matricule) || existing.has(row.matricule)) {
      ignores += 1;
      continue;
    }
    seen.add(row.matricule);

    try {
      await prisma.student.create({
        data: {
          matricule: row.matricule,
          matriculeBrut: row.matricule,
          nom: row.nom,
          prenoms: row.prenoms,
          classe: row.classe,
          noteVerification: row.aVerifier || null,
        },
      });
      ajoutes += 1;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        ignores += 1;
        continue;
      }
      erreurs.push({
        matricule: row.matricule,
        message: "Erreur lors de l’enregistrement.",
      });
    }
  }

  await logAudit({
    acteur,
    action: "IMPORT_MATRICULES",
    details: {
      total: rawRows.length,
      ajoutes,
      ignores,
      erreurs: erreurs.length,
    },
    ip,
  });

  return { total: rawRows.length, ajoutes, ignores, erreurs };
}
