import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const CONFIG = {
  version: "1.0",
  date: "Novembre 2026",
  author: "Tojo Nambinina RANDRIAMIFALY",
  whatsapp: "038 77 299 58",
  github: "[lien GitHub à compléter]",
  demo: "[URL de démonstration à compléter]",
  email: "[email de contact à compléter]",
  captures: [
    { label: "Accueil public", file: "docs/captures/01-accueil.png" },
    { label: "Tableau de bord étudiant", file: "docs/captures/02-tableau-de-bord.png" },
    { label: "Administration", file: "docs/captures/03-admin.png" },
    { label: "Trésorerie et reçu PDF", file: "docs/captures/04-tresorerie.png" },
  ],
};

const W = 595.28;
const H = 841.89;
const M = 48;
const CONTENT_W = W - M * 2;
const BOTTOM = 48;

const brand = rgb(0.06, 0.41, 0.31);
const brandDark = rgb(0.035, 0.23, 0.18);
const brandSoft = rgb(0.94, 0.98, 0.96);
const brandLine = rgb(0.78, 0.9, 0.84);
const ink = rgb(0.1, 0.12, 0.16);
const grey = rgb(0.39, 0.43, 0.51);
const lightGrey = rgb(0.96, 0.97, 0.98);
const line = rgb(0.86, 0.88, 0.91);
const white = rgb(1, 1, 1);
const accent = rgb(0.82, 0.56, 0.16);

const sanitize = (value) =>
  value
    .normalize("NFC")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/[\u2192\u21D2]/g, "->")
    .replace(/[\u00A0\u2000-\u200A\u202F\u205F\u3000]/g, " ")
    .replace(/[^\x00-\xFF]/g, "?");

const doc = await PDFDocument.create();
doc.setTitle("Fiche technique - Plateforme communautaire BDE");
doc.setSubject("Presentation technique, architecture et fonctionnalites");
doc.setAuthor(CONFIG.author);
doc.setCreator("Plateforme communautaire BDE");
doc.setProducer("Plateforme communautaire BDE");

const font = await doc.embedFont(StandardFonts.Helvetica);
const bold = await doc.embedFont(StandardFonts.HelveticaBold);
const italic = await doc.embedFont(StandardFonts.HelveticaOblique);

let page;
let y;
let currentSection = "";

function addPage(section = "") {
  page = doc.addPage([W, H]);
  currentSection = section;
  y = H - M;
  if (section) {
    page.drawRectangle({ x: M, y: H - 28, width: 22, height: 3, color: accent });
    text("FICHE TECHNIQUE - PLATEFORME COMMUNAUTAIRE BDE", M, H - 43, {
      size: 7.2,
      bold: true,
      color: brand,
    });
    text(section, M, H - 61, { size: 8, color: grey });
    page.drawLine({
      start: { x: M, y: H - 76 },
      end: { x: W - M, y: H - 76 },
      thickness: 0.7,
      color: line,
    });
    y = H - 98;
  }
}

function text(value, x, atY, options = {}) {
  page.drawText(sanitize(value), {
    x,
    y: atY,
    size: options.size ?? 10,
    font: options.bold ? bold : options.italic ? italic : font,
    color: options.color ?? ink,
  });
}

function textRight(value, rightX, atY, options = {}) {
  const f = options.bold ? bold : options.italic ? italic : font;
  const size = options.size ?? 10;
  const clean = sanitize(value);
  const width = f.widthOfTextAtSize(clean, size);
  page.drawText(clean, {
    x: rightX - width,
    y: atY,
    size,
    font: f,
    color: options.color ?? ink,
  });
}

function wrap(value, size, maxWidth, useBold = false) {
  const f = useBold ? bold : font;
  const words = sanitize(value).split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (f.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
      continue;
    }
    if (current) {
      lines.push(current);
      current = "";
    }
    if (f.widthOfTextAtSize(word, size) <= maxWidth) {
      current = word;
      continue;
    }
    let chunk = "";
    for (const char of word) {
      const next = chunk + char;
      if (f.widthOfTextAtSize(next, size) > maxWidth && chunk) {
        lines.push(chunk);
        chunk = char;
      } else {
        chunk = next;
      }
    }
    current = chunk;
  }

  if (current) lines.push(current);
  return lines.length > 0 ? lines : [""];
}

function paragraph(value, options = {}) {
  const size = options.size ?? 9.6;
  const leading = options.leading ?? size * 1.45;
  const x = options.x ?? M;
  const width = options.width ?? CONTENT_W;
  for (const lineText of wrap(value, size, width, options.bold)) {
    if (y - leading < BOTTOM + 26) addPage(currentSection);
    text(lineText, x, y, {
      size,
      bold: options.bold,
      italic: options.italic,
      color: options.color ?? ink,
    });
    y -= leading;
  }
  y -= options.gap ?? 0;
}

function sectionTitle(title, kicker = null) {
  if (y < 80) addPage(currentSection);
  if (kicker) {
    text(kicker.toUpperCase(), M, y, { size: 7.1, bold: true, color: accent });
    y -= 13;
  }
  page.drawRectangle({ x: M, y: y - 2, width: 4, height: 17, color: brand });
  text(title, M + 12, y, { size: 15.5, bold: true, color: brandDark });
  y -= 23;
}

function feature(titleText, description) {
  if (y < BOTTOM + 40) addPage(currentSection);
  const size = 9.2;
  const leading = 12.2;
  const prefix = `${titleText} : `;
  const prefixWidth = bold.widthOfTextAtSize(sanitize(prefix), size);
  const lines = wrap(description, size, CONTENT_W - 14 - prefixWidth);

  page.drawRectangle({ x: M + 1, y: y + 3.2, width: 3.2, height: 3.2, color: brand });
  text(prefix, M + 12, y, { size, bold: true, color: ink });
  text(lines[0], M + 12 + prefixWidth, y, { size, color: ink });
  y -= leading;
  for (const lineText of lines.slice(1)) {
    page.drawText(sanitize(lineText), { x: M + 12, y, size, font, color: ink });
    y -= leading;
  }
  y -= 5.2;
}

function bulletList(items, options = {}) {
  const size = options.size ?? 9.4;
  const leading = options.leading ?? 12.4;
  for (const item of items) {
    if (y < BOTTOM + 30) addPage(currentSection);
    page.drawRectangle({ x: M + 1, y: y + 3.2, width: 3.2, height: 3.2, color: brand });
    for (const lineText of wrap(item, size, CONTENT_W - 14)) {
      page.drawText(sanitize(lineText), { x: M + 12, y, size, font, color: ink });
      y -= leading;
    }
    y -= 5.5;
  }
}

function cards(items, options = {}) {
  const gap = options.gap ?? 10;
  const height = options.height ?? 82;
  const width = (CONTENT_W - gap * (items.length - 1)) / items.length;
  const top = y;

  items.forEach((item, index) => {
    const x = M + index * (width + gap);
    page.drawRectangle({
      x,
      y: top - height,
      width,
      height,
      color: brandSoft,
      borderColor: brandLine,
      borderWidth: 0.8,
    });
    page.drawRectangle({
      x,
      y: top - 4,
      width,
      height: 4,
      color: index === 1 ? accent : brand,
    });
    text(item.title, x + 11, top - 23, { size: 10, bold: true, color: brandDark });
    let bodyY = top - 39;
    for (const lineText of wrap(item.body, 8, width - 22).slice(0, 4)) {
      page.drawText(sanitize(lineText), {
        x: x + 11,
        y: bodyY,
        size: 8,
        font,
        color: grey,
      });
      bodyY -= 10.2;
    }
  });

  y = top - height - 16;
}

function metrics(items, options = {}) {
  const gap = options.gap ?? 9;
  const height = options.height ?? 62;
  const width = (CONTENT_W - gap * (items.length - 1)) / items.length;
  const top = y;
  items.forEach((item, index) => {
    const x = M + index * (width + gap);
    page.drawRectangle({
      x,
      y: top - height,
      width,
      height,
      color: lightGrey,
      borderColor: line,
      borderWidth: 0.7,
    });
    text(item.value, x + 10, top - 24, { size: 17, bold: true, color: brand });
    text(item.label, x + 10, top - 42, { size: 7.2, bold: true, color: grey });
    if (item.detail) text(item.detail, x + 10, top - 54, { size: 6.8, color: grey });
  });
  y = top - height - 16;
}

function keyValueTable(rows, options = {}) {
  const labelWidth = options.labelWidth ?? 125;
  for (const [labelText, value] of rows) {
    const valueLines = wrap(value, 8.8, CONTENT_W - labelWidth - 10);
    const rowHeight = Math.max(19, valueLines.length * 10.8 + 7);
    if (y - rowHeight < BOTTOM + 30) addPage(currentSection);
    text(labelText, M + 2, y, { size: 9, bold: true, color: brandDark });
    let valueY = y;
    for (const lineText of valueLines) {
      page.drawText(sanitize(lineText), {
        x: M + labelWidth,
        y: valueY,
        size: 8.8,
        font,
        color: ink,
      });
      valueY -= 10.8;
    }
    page.drawLine({
      start: { x: M, y: y - 5 },
      end: { x: W - M, y: y - 5 },
      thickness: 0.45,
      color: line,
    });
    y -= rowHeight + 4;
  }
}

function arrow(x1, y1, x2, y2, color = brand, thickness = 1) {
  page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness, color });
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const size = 4.2;
  page.drawLine({
    start: { x: x2, y: y2 },
    end: {
      x: x2 - size * Math.cos(angle - Math.PI / 6),
      y: y2 - size * Math.sin(angle - Math.PI / 6),
    },
    thickness,
    color,
  });
  page.drawLine({
    start: { x: x2, y: y2 },
    end: {
      x: x2 - size * Math.cos(angle + Math.PI / 6),
      y: y2 - size * Math.sin(angle + Math.PI / 6),
    },
    thickness,
    color,
  });
}

function architectureDiagram(top) {
  const x = M + 8;
  const boxW = 296;
  const boxH = 36;
  const gap = 13;
  const items = [
    {
      title: "Navigateur",
      detail: "Site public - espace étudiant - back-office",
    },
    {
      title: "Next.js 15 - App Router",
      detail: "Server Components - Route Handlers - Middleware",
    },
    {
      title: "Services métier",
      detail: "21 services : auth, contenus, événements, trésorerie, élections",
    },
    {
      title: "Prisma ORM",
      detail: "Validation, transactions, migrations",
    },
    {
      title: "PostgreSQL 18",
      detail: "37 modèles - données, audit, paramètres",
    },
  ];

  let topY = top;
  items.forEach((item, index) => {
    page.drawRectangle({
      x,
      y: topY - boxH,
      width: boxW,
      height: boxH,
      color: index === 0 ? brandSoft : white,
      borderColor: index === 2 ? brand : line,
      borderWidth: index === 2 ? 1.1 : 0.8,
    });
    text(item.title, x + 11, topY - 15, {
      size: 9.2,
      bold: true,
      color: index === 2 ? brandDark : ink,
    });
    text(item.detail, x + 11, topY - 28, { size: 7.2, color: grey });
    if (index < items.length - 1) {
      arrow(x + boxW / 2, topY - boxH, x + boxW / 2, topY - boxH - gap + 2);
    }
    topY -= boxH + gap;
  });

  const sideX = M + 330;
  const sideW = 169;
  text("SERVICES TRANSVERSES", sideX, top - 2, {
    size: 6.8,
    bold: true,
    color: accent,
  });

  const sideItems = [
    { title: "Fichiers", detail: "local .data/uploads ou S3" },
    { title: "Exports", detail: "PDF, CSV, calendrier ICS" },
    { title: "Email optionnel", detail: "Resend si configure" },
    { title: "Sécurité", detail: "JWT, CSRF, audit, rôles" },
  ];
  sideItems.forEach((item, index) => {
    const boxTop = top - 18 - index * 57;
    page.drawRectangle({
      x: sideX,
      y: boxTop - 45,
      width: sideW,
      height: 45,
      color: lightGrey,
      borderColor: line,
      borderWidth: 0.7,
    });
    text(item.title, sideX + 10, boxTop - 18, {
      size: 8.4,
      bold: true,
      color: brandDark,
    });
    text(item.detail, sideX + 10, boxTop - 31, { size: 7, color: grey });
  });

  y = topY - 4;
}

async function screenshotCard(item, x, top, width, height) {
  const filePath = path.resolve(item.file);
  const hasImage = existsSync(filePath);

  page.drawRectangle({
    x,
    y: top - height,
    width,
    height,
    color: hasImage ? white : lightGrey,
    borderColor: line,
    borderWidth: 0.9,
  });

  if (hasImage) {
    try {
      const bytes = await fs.readFile(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const image =
        ext === ".jpg" || ext === ".jpeg"
          ? await doc.embedJpg(bytes)
          : await doc.embedPng(bytes);
      const maxW = width - 16;
      const maxH = height - 34;
      const scale = Math.min(maxW / image.width, maxH / image.height);
      image.draw(page, {
        x: x + (width - image.width * scale) / 2,
        y: top - 8 - image.height * scale,
        width: image.width * scale,
        height: image.height * scale,
      });
      text(item.label, x + 10, top - height + 12, {
        size: 7.4,
        bold: true,
        color: brandDark,
      });
      return;
    } catch {
      // Fall back to the placeholder below.
    }
  }

  page.drawLine({
    start: { x: x + 12, y: top - 28 },
    end: { x: x + 28, y: top - 28 },
    thickness: 1,
    color: brandLine,
  });
  page.drawLine({
    start: { x: x + 20, y: top - 36 },
    end: { x: x + 20, y: top - 20 },
    thickness: 1,
    color: brandLine,
  });
  text("EMPLACEMENT DE LA CAPTURE", x + 38, top - 31, {
    size: 7.2,
    bold: true,
    color: brand,
  });
  text(item.label, x + 12, top - 56, {
    size: 8.4,
    bold: true,
    color: brandDark,
  });
  text(item.file, x + 12, top - 72, { size: 6.6, color: grey });
}

function cover() {
  page = doc.addPage([W, H]);
  page.drawRectangle({ x: 0, y: H - 226, width: W, height: 226, color: brandDark });
  page.drawRectangle({ x: 0, y: H - 230, width: W, height: 4, color: accent });

  text("FICHE TECHNIQUE - VERSION 1.0", M, H - 45, {
    size: 7.8,
    bold: true,
    color: rgb(0.72, 0.88, 0.81),
  });
  text("Plateforme communautaire BDE", M, H - 91, {
    size: 27,
    bold: true,
    color: white,
  });
  text("Application web de gestion et d'animation de la vie étudiante", M, H - 118, {
    size: 11,
    color: rgb(0.82, 0.92, 0.87),
  });
  text("Annonces - événements - demandes - archives - communication - trésorerie", M, H - 144, {
    size: 8.4,
    color: rgb(0.72, 0.88, 0.81),
  });

  y = H - 262;
  text("EN BREF", M, y, { size: 7.2, bold: true, color: accent });
  y -= 17;
  paragraph(
    "Une plateforme web complète qui centralise la vie du Bureau des Étudiants : information officielle, événements, demandes, archives, communication, trésorerie et gestion administrative, avec des comptes étudiants vérifiés.",
    { size: 10.2, leading: 14.6, width: CONTENT_W - 20, gap: 6 },
  );

  metrics(
    [
      { value: "65", label: "ÉCRANS", detail: "public, étudiant, admin" },
      { value: "74", label: "ROUTES API", detail: "REST et validation" },
      { value: "37", label: "MODÈLES", detail: "PostgreSQL / Prisma" },
      { value: "35", label: "TESTS", detail: "unitaires et e2e" },
    ],
    { height: 66 },
  );

  text("SOMMAIRE", M, y, { size: 7.2, bold: true, color: accent });
  y -= 20;
  const toc = [
    ["01", "Présentation du projet", "2"],
    ["02", "Technologies et architecture", "3"],
    ["03", "Fonctionnalités", "4"],
    ["04", "Sécurité, qualité et exploitation", "5"],
    ["05", "Mon rôle et mes réalisations", "6"],
    ["06", "Captures et liens", "7"],
  ];
  toc.forEach(([number, label, pageNumber]) => {
    text(number, M, y, { size: 9, bold: true, color: brand });
    text(label, M + 26, y, { size: 9.4, color: ink });
    textRight(pageNumber, W - M, y, { size: 9, bold: true, color: grey });
    page.drawLine({
      start: { x: M, y: y - 6 },
      end: { x: W - M, y: y - 6 },
      thickness: 0.35,
      color: line,
    });
    y -= 22;
  });

  page.drawLine({
    start: { x: M, y: 104 },
    end: { x: W - M, y: 104 },
    thickness: 0.7,
    color: line,
  });
  text("Réalisé par", M, 86, { size: 7, bold: true, color: grey });
  text(CONFIG.author, M, 70, { size: 10.5, bold: true, color: brandDark });
  text(CONFIG.date, M, 54, { size: 8.4, color: grey });
  textRight("Projet privé - tous droits réservés", W - M, 54, {
    size: 7.4,
    color: grey,
  });
}

function pagePresentation() {
  addPage("Présentation du projet");

  sectionTitle("Le projet", "Contexte");
  paragraph(
    "La plateforme est l'espace officiel du Bureau des Étudiants. Elle rassemble les informations, les démarches et les échanges qui étaient auparavant dispersés entre groupes de messagerie, affiches, fichiers et bouche-à-oreille.",
    { gap: 6 },
  );
  paragraph(
    "Elle sert aussi bien aux étudiants qu'à l'équipe du BDE : les premiers trouvent une information fiable et un espace personnel ; la seconde publie, suit les demandes, organise les événements et conserve une trace de son activité.",
    { gap: 8 },
  );

  sectionTitle("Le problème résolu", "Pourquoi ce projet existe");
  bulletList([
    "L'information est dispersée et difficile à retrouver.",
    "Les étudiants multiplient les sources pour le programme, les documents et les démarches.",
    "Le BDE manque d'un outil unique pour publier, suivre les demandes et garder une trace.",
  ]);

  sectionTitle("Les objectifs", "Ce que la plateforme doit apporter");
  bulletList([
    "Centraliser l'information et les services de la vie étudiante.",
    "Vérifier l'identité des étudiants avec le matricule et le nom de famille.",
    "Donner au BDE des outils de publication, de suivi et de modération.",
    "Sécuriser les accès, les données et les actions sensibles.",
    "Offrir une expérience mobile-first, claire et accessible.",
    "Préparer une base maintenable et documentée pour la suite.",
  ]);

  sectionTitle("Trois espaces complémentaires", "Périmètre fonctionnel");
  cards([
    {
      title: "Site public",
      body: "Découvrir le BDE, les annonces, le programme, les archives et les pages de confiance.",
    },
    {
      title: "Espace étudiant",
      body: "Compte vérifié, profil, notifications, demandes, inscriptions et communication.",
    },
    {
      title: "Back-office BDE",
      body: "Publier, modérer, gérer les comptes, les événements, la trésorerie et l'audit.",
    },
  ]);

  sectionTitle("Chiffres clés", "État actuel du dépôt");
  metrics(
    [
      { value: "65", label: "PAGES", detail: "App Router" },
      { value: "74", label: "API", detail: "routes REST" },
      { value: "21", label: "SERVICES", detail: "logique métier" },
      { value: "37", label: "TABLES", detail: "Prisma / PostgreSQL" },
    ],
    { height: 64 },
  );

  sectionTitle("Les bénéfices attendus", "Ce que le projet change");
  bulletList([
    "Une information officielle, centralisée et facile à retrouver.",
    "Des échanges et des comptes vérifiés, avec des accès maîtrisés.",
    "Moins de recherches pour les étudiants et plus de traçabilité pour le BDE.",
  ]);
}

function pageArchitecture() {
  addPage("Technologies et architecture");

  sectionTitle("Stack technique", "Choix principaux");
  keyValueTable([
    ["Application", "Next.js 15.5, React 19, TypeScript strict, App Router"],
    ["Interface", "Tailwind CSS 3, thème clair/sombre, PWA installable"],
    ["Données", "PostgreSQL 18, Prisma 6, 37 modèles, migrations versionnées"],
    ["Authentification", "JWT HS256 avec jose, cookies httpOnly, bcryptjs"],
    ["Validation", "Zod sur les entrées et les formulaires"],
    ["Fichiers", "Stockage local ou S3 compatible, liens signés, sharp"],
    ["Exports", "pdf-lib pour les PDF, exceljs pour les CSV/XLSX, ICS"],
    ["Qualité", "Vitest, Playwright, ESLint, build de production"],
  ]);

  sectionTitle("Architecture applicative", "Séparation des responsabilités");
  architectureDiagram(y - 2);
  paragraph(
    "Les pages et les routes API restent fines. Les règles métier sont centralisées dans les services, puis exécutées via Prisma. Le stockage et les exports sont traités comme des services transverses.",
    { size: 8.4, leading: 11.6, color: grey, gap: 4 },
  );

  sectionTitle("Flux d'une requête", "Du navigateur vers la base");
  const steps = [
    "Le navigateur demande une page ou une route API.",
    "Le middleware vérifie la session, le rôle et le cookie CSRF.",
    "La page ou le handler valide les entrées avec Zod.",
    "Le service métier applique les règles et interroge Prisma.",
    "La réponse est rendue ou renvoyée en JSON ; l'action sensible est auditée.",
  ];
  steps.forEach((step, index) => {
    page.drawCircle({
      x: M + 7,
      y: y + 3,
      size: 6.4,
      color: brandSoft,
      borderColor: brandLine,
      borderWidth: 0.7,
    });
    textRight(String(index + 1), M + 9.7, y, { size: 6.2, bold: true, color: brand });
    text(step, M + 21, y, { size: 9, color: ink });
    y -= 15;
  });
}

function pageFeatures() {
  addPage("Fonctionnalités");

  sectionTitle("Site public et espace étudiant", "Au quotidien");
  feature("Annonces", "fil d'actualité, ciblage par classe, commentaires et notifications.");
  feature("Programme", "agenda, inscriptions, liste d'attente, export ICS et QR de présence.");
  feature("Demandes", "tickets étudiants, réponses du BDE, statut et FAQ.");
  feature("Archives", "albums photos, documents officiels et signalements.");
  feature("Communication", "canaux de discussion, réponses, réactions et modération.");
  feature("Sondages", "avis rapides et séparés du module électoral.");
  feature("Profil et PWA", "compte, sécurité, notifications et installation mobile.");

  sectionTitle("Back-office BDE", "Côté équipe");
  feature("Tableau de bord", "indicateurs, actions rapides et activité récente.");
  feature("Étudiants", "matricules, classes, import CSV/XLSX et validation des comptes.");
  feature("Comptes et rôles", "étudiant, membre, trésorier, administrateur; reconnexion au changement.");
  feature("Contenus", "annonces, événements, archives, documents, canaux, sondages et signalements.");
  feature("Identité et réglages", "nom, slogan, logo, modules activables et maintenance.");
  feature("Audit", "journal des actions sensibles et consultation filtrée.");
  feature("Présences", "scan caméra, import d'une photo du QR et saisie manuelle de secours.");

  sectionTitle("Trésorerie et module électoral", "Selon les besoins");
  feature("Trésorerie", "recettes, dépenses, catégories, moyen de paiement, payeur et solde.");
  feature("Reçus PDF", "consultation ou téléchargement avec numéro et coordonnées du payeur.");
  feature("Élection optionnelle", "candidatures, vote unique, résultats et exports PDF/CSV.");
  feature("Cycle du scrutin", "brouillon, candidatures, ouverte, clôturée, publiée.");
  feature("Confidentialité", "participation et bulletin séparés, sans lien vers le votant.");

  sectionTitle("Le parcours étudiant", "En quatre étapes");
  cards(
    [
      {
        title: "1. S'inscrire",
        body: "Matricule et nom de famille, puis vérification du compte.",
      },
      {
        title: "2. Explorer",
        body: "Annonces, programme, archives et canaux de discussion.",
      },
      {
        title: "3. Participer",
        body: "S'inscrire à un événement, poser une question, répondre à un sondage.",
      },
      {
        title: "4. Suivre",
        body: "Notifications, réponses du BDE et mise à jour du profil.",
      },
    ],
    { height: 84 },
  );
}

function pageSecurity() {
  addPage("Sécurité, qualité et exploitation");

  sectionTitle("Sécurité", "Les garanties");
  feature("Sessions", "JWT HS256 de 12 heures, cookie httpOnly, SameSite Lax, Secure en production.");
  feature("Mots de passe", "hachage bcrypt et politique minimale de longueur.");
  feature("CSRF", "double soumission cookie/header et vérification de l'origine.");
  feature("Limitation", "5 échecs de connexion ou d'inscription par 15 minutes; 300 votes par minute et par IP.");
  feature("Rôles", "contrôle dans le middleware puis nouvelle vérification en base.");
  feature("Entrées", "validation Zod et réponses API sans données sensibles.");
  feature("Fichiers", "liens signés, contrôle de type réel et stockage local ou S3.");
  feature("En-têtes", "CSP, HSTS, anti-clickjacking, nosniff et Permissions-Policy.");

  sectionTitle("Qualité et tests", "Vérifications automatisées");
  feature("TypeScript", "mode strict sur l'ensemble du projet.");
  feature("Tests unitaires", "35 tests Vitest sur les fonctions critiques.");
  feature("E2E", "parcours inscription, vote, résultats et exports avec Playwright.");
  feature("Charge", "script de test local pour vérifier la tenue du vote.");
  feature("Build", "compilation de production réussie avec 42 pages générées.");

  sectionTitle("Exploitation et déploiement", "Du poste local au serveur");
  feature("Local Windows", "Lancer-BDE.cmd, PostgreSQL embarqué sur le port 5433, données dans .data.");
  feature("VPS / Hostinger", "Node.js, PostgreSQL managé, disque persistant et HTTPS.");
  feature("Vercel", "possible avec un bucket S3 compatible pour les fichiers.");
  feature("Santé", "endpoint /api/health pour vérifier l'application et la base.");
  feature("Sauvegardes", "base PostgreSQL et dossier .data/uploads, ou bucket S3.");

  sectionTitle("Points à connaître", "Sans surpromettre");
  bulletList([
    "Les paiements MVola et Airtel Money sont préparés mais restent inactifs sans API marchand.",
    "Les emails sont optionnels ; les notifications dans l'application restent disponibles.",
    "Sans S3, le stockage local exige un disque persistant et une sauvegarde.",
    "Le module électoral est optionnel et peut rester désactivé.",
  ]);

  sectionTitle("Mise en production", "Les cinq étapes");
  const productionSteps = [
    "Créer la base PostgreSQL et renseigner les secrets de production.",
    "Appliquer les migrations et lancer les seeds nécessaires.",
    "Compiler l'application puis démarrer le serveur Node.js.",
    "Vérifier /api/health, la connexion admin et l'envoi de fichiers.",
    "Mettre en place les sauvegardes et vérifier le HTTPS.",
  ];
  productionSteps.forEach((step, index) => {
    page.drawCircle({
      x: M + 7,
      y: y + 3,
      size: 6.2,
      color: brandSoft,
      borderColor: brandLine,
      borderWidth: 0.7,
    });
    textRight(String(index + 1), M + 9.7, y, { size: 6.1, bold: true, color: brand });
    text(step, M + 21, y, { size: 8.9, color: ink });
    y -= 14.5;
  });
}

function pageRole() {
  addPage("Mon rôle et mes réalisations");

  paragraph(
    "J'ai assuré la conception et le développement full-stack de la plateforme, de la modélisation des données à la mise en service, en passant par la sécurité, les tests et la documentation.",
    { size: 10.2, leading: 14.4, gap: 8 },
  );

  sectionTitle("Mon rôle", "Conception et mise en service");
  keyValueTable([
    ["Cadrage produit", "Traduction du besoin BDE en parcours, rôles et priorités."],
    ["Architecture", "Structure Next.js, services métier, modèle de données et stockage."],
    ["Développement", "Interfaces publique, étudiante et administration, API et logique métier."],
    ["Sécurité", "Authentification, rôles, CSRF, limitation, audit et protection des fichiers."],
    ["Qualité", "TypeScript strict, validation Zod, tests unitaires et e2e."],
    ["Exploitation", "Lanceur Windows, base embarquée, déploiement, sauvegardes et documentation."],
  ]);

  sectionTitle("Mes réalisations", "Livrables concrets");
  bulletList([
    "Modèle de données de 37 tables avec rôles, statuts, audit et contraintes d'intégrité.",
    "Inscription vérifiée par matricule et nom, connexion, rôles et réinitialisation du mot de passe.",
    "65 écrans et 74 routes API pour les parcours public, étudiant et administrateur.",
    "Modules annonces, événements avec QR, demandes et FAQ, archives, communication et sondages.",
    "Trésorerie complète avec recettes, dépenses, solde et génération de reçus PDF.",
    "Module électoral optionnel avec candidatures, vote unique et exports PDF/CSV.",
    "Sécurité applicative : sessions, CSRF, limitation, audit, liens signés et en-têtes.",
    "Documentation de déploiement, checklist électorale, lanceur local et fiche technique.",
  ]);

  sectionTitle("Compétences mobilisées", "Stack et savoir-faire");
  const pills = [
    "Next.js",
    "React",
    "TypeScript",
    "PostgreSQL",
    "Prisma",
    "Tailwind CSS",
    "Authentification",
    "Sécurité web",
    "PDF / CSV",
    "Tests",
    "Déploiement",
    "Documentation",
  ];
  let pillX = M;
  let pillY = y;
  for (const pill of pills) {
    const pillW = bold.widthOfTextAtSize(pill, 7.4) + 16;
    if (pillX + pillW > W - M) {
      pillX = M;
      pillY -= 21;
    }
    page.drawRectangle({
      x: pillX,
      y: pillY - 12,
      width: pillW,
      height: 16,
      color: brandSoft,
      borderColor: brandLine,
      borderWidth: 0.7,
    });
    text(pill, pillX + 8, pillY - 8, { size: 7.4, bold: true, color: brand });
    pillX += pillW + 6;
  }
  y = pillY - 28;

  sectionTitle("Livrables", "Code et documentation");
  bulletList([
    "Code source complet, README et modèle d'environnement.",
    "Fiche technique, brief fonctionnel et guide de déploiement.",
    "Checklist du module électoral et conventions de captures.",
    "Lanceur Windows, base locale et scripts de vérification.",
  ]);

  const calloutTop = y;
  page.drawRectangle({
    x: M,
    y: calloutTop - 56,
    width: CONTENT_W,
    height: 62,
    color: brandSoft,
    borderColor: brandLine,
    borderWidth: 0.8,
  });
  page.drawRectangle({ x: M, y: calloutTop - 56, width: 4, height: 62, color: brand });
  text("POINT FORT", M + 15, calloutTop - 17, { size: 6.8, bold: true, color: brand });
  y = calloutTop - 32;
  paragraph(
    "Une plateforme complète, sécurisée et documentée, prête à être reprise par un autre développeur ou présentée à un chef de projet.",
    { x: M + 15, width: CONTENT_W - 30, size: 9, leading: 11.6, bold: true, gap: 0 },
  );
  y = calloutTop - 66;
}

async function pageCaptures() {
  addPage("Captures et liens");

  paragraph(
    "Les cadres ci-dessous sont prévus pour les captures définitives. Déposer les images dans docs/captures/ avec les noms indiqués, puis régénérer la fiche avec npm run docs:tech.",
    { size: 9, leading: 12.4, color: grey, gap: 10 },
  );

  const gap = 14;
  const cardW = (CONTENT_W - gap) / 2;
  const cardH = 122;
  const top = y;
  await screenshotCard(CONFIG.captures[0], M, top, cardW, cardH);
  await screenshotCard(CONFIG.captures[1], M + cardW + gap, top, cardW, cardH);
  await screenshotCard(CONFIG.captures[2], M, top - cardH - gap, cardW, cardH);
  await screenshotCard(CONFIG.captures[3], M + cardW + gap, top - cardH - gap, cardW, cardH);
  y = top - cardH * 2 - gap - 18;

  sectionTitle("Liens utiles", "Avant diffusion");
  keyValueTable([
    ["Dépôt GitHub", CONFIG.github],
    ["Démonstration", CONFIG.demo],
    ["Documentation", "README.md - docs/DEPLOIEMENT.md - docs/CHECKLIST-ELECTION.md"],
    ["Fiche fonctionnelle", "docs/Brief-fonctionnalites-BDE.pdf"],
    ["Captures", "docs/captures/"],
    ["Contact", `WhatsApp ${CONFIG.whatsapp} - ${CONFIG.email}`],
  ]);

  sectionTitle("En résumé", "Le message à retenir");
  paragraph(
    "Le projet donne au BDE un espace officiel, vérifié et durable. Les étudiants trouvent au même endroit les informations, le programme, les documents et les réponses à leurs questions. L'équipe publie, suit les demandes, gère les événements et conserve une trace de son activité.",
    { size: 9.6, leading: 13, gap: 8 },
  );

  sectionTitle("Prochaines étapes", "Finalisation");
  bulletList([
    "Ajouter les captures définitives dans docs/captures/ et régénérer la fiche.",
    "Renseigner l'URL de démonstration et le lien du dépôt GitHub.",
    "Vérifier les secrets, les sauvegardes et le HTTPS avant la mise en ligne.",
  ]);
}

cover();
pagePresentation();
pageArchitecture();
pageFeatures();
pageSecurity();
pageRole();
await pageCaptures();

const pages = doc.getPages();
pages.forEach((currentPage, index) => {
  if (index === 0) return;
  currentPage.drawLine({
    start: { x: M, y: 36 },
    end: { x: W - M, y: 36 },
    thickness: 0.6,
    color: line,
  });
  currentPage.drawText(
    sanitize("Fiche technique - Plateforme communautaire BDE"),
    { x: M, y: 24, size: 7.2, font, color: grey },
  );
  const pageLabel = `Page ${index + 1} / ${pages.length}`;
  const pageLabelWidth = font.widthOfTextAtSize(pageLabel, 7.2);
  currentPage.drawText(pageLabel, {
    x: W - M - pageLabelWidth,
    y: 24,
    size: 7.2,
    font,
    color: grey,
  });
});

const outputPath = path.resolve("docs/Fiche-technique-BDE.pdf");
await fs.writeFile(outputPath, await doc.save());
console.log(outputPath);
