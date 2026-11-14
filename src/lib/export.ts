import "server-only";

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { ElectionResults } from "@/server/services/results";
import { formatDateTime, formatPercent } from "@/lib/utils";

export function toCsv(rows: (string | number | null | undefined)[][]) {
  const body = rows
    .map((row) =>
      row
        .map((cell) => {
          const value = cell === null || cell === undefined ? "" : String(cell);
          return /[";\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
        })
        .join(";"),
    )
    .join("\r\n");
  return `\uFEFF${body}`;
}

export function resultsToCsv(results: ElectionResults) {
  const rows: (string | number | null)[][] = [
    ["Procès-verbal — Élection BDE"],
    ["Titre", results.election.titre],
    ["Statut", results.election.statut],
    ["Généré le", formatDateTime(results.genereLe)],
    [],
    ["Indicateur", "Valeur"],
    ["Inscrits (comptes approuvés)", results.inscrits],
    ["Étudiants actifs", results.totalEtudiants],
    ["Votants", results.votants],
    ["Participation", formatPercent(results.participation)],
    ["Bulletins exprimés (total)", results.totalVotes],
    ["Votes blancs", results.blancs],
    [],
    ...(results.positions.length > 0
      ? [
          ["Poste", "Rang", "Candidat", "Voix", "Pourcentage"],
          ...results.positions.flatMap((positionResult) => [
            ...positionResult.classement.map((entry, index) => [
              positionResult.position.titre,
              index + 1,
              entry.candidate.nomAffiche,
              entry.votes,
              formatPercent(entry.pourcentage),
            ]),
            [
              positionResult.position.titre,
              "—",
              "Vote blanc",
              positionResult.blancs,
              formatPercent(positionResult.blancsPourcentage),
            ],
          ]),
        ]
      : [
          ["Rang", "Candidat", "Voix", "Pourcentage"],
          ...results.classement.map((entry, index) => [
            index + 1,
            entry.candidate.nomAffiche,
            entry.votes,
            formatPercent(entry.pourcentage),
          ]),
          ["—", "Vote blanc", results.blancs, formatPercent(results.blancsPourcentage)],
        ]),
    [],
    ["Mention", "Le vote est secret : aucun lien entre votants et bulletins."],
  ];
  return toCsv(rows);
}

function sanitizePdfText(value: string) {
  return value
    .normalize("NFC")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u00A0/g, " ")
    .replace(/[^\x00-\xFF]/g, "?");
}

export async function resultsToPdf(results: ElectionResults) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const width = 595.28;
  const height = 841.89;
  const margin = 50;
  let page = doc.addPage([width, height]);
  let y = height - margin;

  const purple = rgb(0.06, 0.41, 0.31);
  const dark = rgb(0.13, 0.15, 0.19);
  const grey = rgb(0.35, 0.38, 0.44);
  const line = rgb(0.86, 0.88, 0.91);

  const ensureSpace = (needed: number) => {
    if (y - needed < margin + 30) {
      page = doc.addPage([width, height]);
      y = height - margin;
    }
  };

  const text = (
    value: string,
    x: number,
    options: { size?: number; bold?: boolean; color?: typeof dark; maxWidth?: number } = {},
  ) => {
    const size = options.size ?? 11;
    const usedFont = options.bold ? bold : font;
    const content = sanitizePdfText(value);
    page.drawText(content, {
      x,
      y,
      size,
      font: usedFont,
      color: options.color ?? dark,
    });
    if (options.maxWidth) {
      return usedFont.widthOfTextAtSize(content, size);
    }
    return 0;
  };

  const hr = () => {
    page.drawLine({
      start: { x: margin, y },
      end: { x: width - margin, y },
      thickness: 0.8,
      color: line,
    });
  };

  text("BDE — Bureau des Étudiants", margin, { size: 10, bold: true, color: purple });
  y -= 22;
  text("Procès-verbal de l’élection", margin, { size: 22, bold: true });
  y -= 20;
  text(results.election.titre, margin, { size: 13, color: grey, maxWidth: width - margin * 2 });
  y -= 16;
  text(`Généré le ${formatDateTime(results.genereLe)}`, margin, { size: 9, color: grey });
  y -= 24;
  hr();
  y -= 24;

  const info: [string, string][] = [
    ["Statut", results.election.statut],
    ["Inscrits (comptes approuvés)", String(results.inscrits)],
    ["Étudiants actifs dans la liste", String(results.totalEtudiants)],
    ["Votants", String(results.votants)],
    ["Taux de participation", formatPercent(results.participation)],
    ["Bulletins exprimés", String(results.totalVotes)],
    ["Votes blancs", String(results.blancs)],
  ];

  for (const [label, value] of info) {
    ensureSpace(18);
    text(label, margin, { size: 10, color: grey });
    text(value, margin + 230, { size: 10, bold: true });
    y -= 17;
  }

  y -= 12;
  hr();
  y -= 26;

  const drawResultTable = (
    title: string,
    classement: typeof results.classement,
    blancs: number,
    blancsPourcentage: number,
  ) => {
    ensureSpace(55);
    text(title, margin, { size: 13, bold: true });
    y -= 22;

    text("Rang", margin, { size: 9, bold: true, color: grey });
    text("Candidat", margin + 42, { size: 9, bold: true, color: grey });
    text("Voix", margin + 340, { size: 9, bold: true, color: grey });
    text("Pourcentage", margin + 400, { size: 9, bold: true, color: grey });
    y -= 16;

    for (const [index, entry] of classement.entries()) {
      ensureSpace(24);
      text(String(index + 1), margin, { size: 10, bold: index === 0 });
      text(entry.candidate.nomAffiche.slice(0, 55), margin + 42, {
        size: 10,
        bold: index === 0,
      });
      text(String(entry.votes), margin + 340, { size: 10, bold: index === 0 });
      text(formatPercent(entry.pourcentage), margin + 400, { size: 10 });
      y -= 17;
      hr();
      y -= 8;
    }

    ensureSpace(24);
    text("—", margin, { size: 10 });
    text("Vote blanc", margin + 42, { size: 10 });
    text(String(blancs), margin + 340, { size: 10 });
    text(formatPercent(blancsPourcentage), margin + 400, { size: 10 });
    y -= 26;
  };

  if (results.positions.length > 0) {
    for (const positionResult of results.positions) {
      drawResultTable(
        positionResult.position.titre,
        positionResult.classement,
        positionResult.blancs,
        positionResult.blancsPourcentage,
      );
    }
  } else {
    drawResultTable(
      "Résultats par candidat",
      results.classement,
      results.blancs,
      results.blancsPourcentage,
    );
  }

  ensureSpace(70);
  y -= 22;
  text("Fait à Antananarivo, le " + formatDateTime(results.genereLe), margin, {
    size: 10,
  });
  y -= 36;
  text("Le président du bureau de vote", margin, { size: 10, color: grey });
  text("Signature : ______________________", margin + 300, { size: 10, color: grey });

  y -= 34;
  page.drawText(
    sanitizePdfText("Vote secret : aucun lien entre les votants et les bulletins."),
    { x: margin, y, size: 8, font, color: grey },
  );

  return doc.save();
}

export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "election";
}
