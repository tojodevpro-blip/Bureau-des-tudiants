import "server-only";

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { formatDate, formatDateTime, formatMoney } from "@/lib/utils";

export type TreasuryReceiptInput = {
  id: string;
  date: Date;
  libelle: string;
  categorie: string;
  montant: number;
  moyenPaiement: string;
  reference: string | null;
  payeur: string | null;
  note: string | null;
  event: { titre: string } | null;
  createdBy: {
    email: string | null;
    student: { prenoms: string; nom: string } | null;
  } | null;
  branding: { name: string; shortName: string };
  generatedAt: Date;
};

function sanitizePdfText(value: string) {
  return value
    .normalize("NFC")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/[\u00A0\u2000-\u200A\u202F\u205F\u3000]/g, " ")
    .replace(/[^\x00-\xFF]/g, "?");
}

function receiptNumber(input: TreasuryReceiptInput) {
  const day = new Intl.DateTimeFormat("fr-CA", {
    timeZone: "Indian/Antananarivo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(input.date)
    .replace(/-/g, "");
  return `REC-${day}-${input.id.slice(-6).toUpperCase()}`;
}

export async function treasuryReceiptToPdf(input: TreasuryReceiptInput) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const width = 595.28;
  const height = 841.89;
  const margin = 50;
  const contentWidth = width - margin * 2;
  let page = doc.addPage([width, height]);
  let y = height - margin;

  const brand = rgb(0.06, 0.41, 0.31);
  const brandSoft = rgb(0.94, 0.98, 0.96);
  const dark = rgb(0.13, 0.15, 0.19);
  const grey = rgb(0.35, 0.38, 0.44);
  const line = rgb(0.86, 0.88, 0.91);

  const text = (
    value: string,
    x: number,
    options: {
      size?: number;
      bold?: boolean;
      color?: typeof dark;
    } = {},
  ) => {
    page.drawText(sanitizePdfText(value), {
      x,
      y,
      size: options.size ?? 10,
      font: options.bold ? bold : font,
      color: options.color ?? dark,
    });
  };

  const wrap = (value: string, size: number, maxWidth: number) => {
    const words = sanitizePdfText(value).split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    if (current) lines.push(current);
    return lines.length > 0 ? lines : [""];
  };

  const ensureSpace = (needed: number) => {
    if (y - needed < margin + 40) {
      page = doc.addPage([width, height]);
      y = height - margin;
    }
  };

  const hr = () => {
    page.drawLine({
      start: { x: margin, y },
      end: { x: width - margin, y },
      thickness: 0.8,
      color: line,
    });
  };

  const label = (value: string, x: number, atY: number) => {
    page.drawText(sanitizePdfText(value.toUpperCase()), {
      x,
      y: atY,
      size: 7,
      font: bold,
      color: grey,
    });
  };

  const value = (content: string, x: number, atY: number, size = 11, isBold = false) => {
    page.drawText(sanitizePdfText(content), {
      x,
      y: atY,
      size,
      font: isBold ? bold : font,
      color: dark,
    });
  };

  text(input.branding.shortName, margin, { size: 15, bold: true, color: brand });
  text(input.branding.name, margin, { size: 9, color: grey });
  y -= 34;

  page.drawText(sanitizePdfText("REÇU"), {
    x: width - margin - 40,
    y: height - margin,
    size: 12,
    font: bold,
    color: brand,
  });
  page.drawText(sanitizePdfText(receiptNumber(input)), {
    x: width - margin - 150,
    y: height - margin - 16,
    size: 10,
    font: bold,
    color: dark,
  });

  text("Reçu de recette", margin, { size: 24, bold: true });
  y -= 18;
  text(`Émis le ${formatDateTime(input.generatedAt)}`, margin, { size: 9, color: grey });
  y -= 22;
  hr();
  y -= 24;

  const colRight = margin + 270;

  label("Payeur", margin, y);
  label("Date du paiement", colRight, y);
  y -= 15;
  value(input.payeur || "Non renseigné", margin, y, 11, true);
  value(formatDate(input.date), colRight, y, 11, true);
  y -= 24;

  label("Moyen de paiement", margin, y);
  label("Référence", colRight, y);
  y -= 15;
  value(input.moyenPaiement, margin, y, 11, true);
  value(input.reference || "—", colRight, y, 11);
  y -= 26;

  ensureSpace(90);
  page.drawRectangle({
    x: margin,
    y: y - 52,
    width: contentWidth,
    height: 62,
    color: brandSoft,
    borderColor: rgb(0.78, 0.9, 0.84),
    borderWidth: 1,
  });
  page.drawText(sanitizePdfText("MONTANT REÇU"), {
    x: margin + 16,
    y: y - 8,
    size: 8,
    font: bold,
    color: grey,
  });
  page.drawText(sanitizePdfText(formatMoney(input.montant)), {
    x: margin + 16,
    y: y - 34,
    size: 22,
    font: bold,
    color: brand,
  });
  y -= 82;

  const rows: [string, string][] = [
    ["Objet de la recette", input.libelle],
    ["Catégorie", input.categorie],
    ["Événement associé", input.event?.titre ?? "Aucun"],
  ];

  for (const [rowLabel, rowValue] of rows) {
    ensureSpace(34);
    label(rowLabel, margin, y);
    y -= 15;
    value(rowValue, margin, y, 11);
    y -= 24;
  }

  if (input.note?.trim()) {
    ensureSpace(40);
    label("Note", margin, y);
    y -= 15;
    for (const lineText of wrap(input.note, 10, contentWidth)) {
      ensureSpace(15);
      value(lineText, margin, y, 10);
      y -= 14;
    }
    y -= 10;
  }

  ensureSpace(90);
  y -= 10;
  hr();
  y -= 28;
  text("Le trésorier / la trésorière du BDE", margin, { size: 10, color: grey });
  text("Signature et cachet : ______________________", margin + 280, { size: 10, color: grey });
  y -= 34;
  const issuer =
    input.createdBy?.student
      ? `${input.createdBy.student.prenoms} ${input.createdBy.student.nom}`
      : input.createdBy?.email ?? input.branding.name;
  text(`Opération enregistrée par ${issuer}`, margin, { size: 8, color: grey });
  y -= 14;
  for (const lineText of wrap(
    "Ce reçu atteste de l'encaissement saisi dans la trésorerie du BDE. Il ne constitue pas un titre de paiement électronique.",
    8,
    contentWidth,
  )) {
    ensureSpace(12);
    text(lineText, margin, { size: 8, color: grey });
    y -= 11;
  }

  return doc.save();
}
