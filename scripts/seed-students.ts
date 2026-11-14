import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { PrismaClient } from "@prisma/client";
import { tryNormalizeMatricule } from "../src/lib/normalize";

const prisma = new PrismaClient();

type CsvRow = {
  matricule?: string;
  nom?: string;
  prenoms?: string;
  classe?: string;
  a_verifier?: string;
};

async function main() {
  const candidates = [
    process.env.STUDENTS_CSV,
    path.join("data", "etudiants_bde.csv"),
    "etudiants_bde.csv",
  ].filter(Boolean) as string[];

  const file = candidates.find((candidate) => fs.existsSync(candidate));
  if (!file) {
    console.error(
      "Fichier introuvable. Place le CSV dans data/etudiants_bde.csv ou définis STUDENTS_CSV.",
    );
    process.exitCode = 1;
    return;
  }

  const content = fs.readFileSync(file, "utf8");
  const rows = parse(content, {
    columns: true,
    bom: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  }) as CsvRow[];

  let crees = 0;
  let maj = 0;
  let ignoresReclames = 0;
  let invalides = 0;
  const seen = new Set<string>();
  const erreurs: string[] = [];

  for (const [index, row] of rows.entries()) {
    const ligne = index + 2;
    const matriculeBrut = String(row.matricule ?? "").trim();
    const nom = String(row.nom ?? "").trim();
    const prenoms = String(row.prenoms ?? "").trim();
    const classe = String(row.classe ?? "").trim();
    const note = String(row.a_verifier ?? "").trim();

    if (!matriculeBrut) {
      invalides += 1;
      erreurs.push(`Ligne ${ligne} : matricule vide.`);
      continue;
    }

    const normalized = tryNormalizeMatricule(matriculeBrut);
    if (!normalized.ok) {
      invalides += 1;
      erreurs.push(`Ligne ${ligne} (${matriculeBrut}) : ${normalized.reason}`);
      continue;
    }
    if (seen.has(normalized.value)) {
      invalides += 1;
      erreurs.push(`Ligne ${ligne} : doublon ${normalized.value} dans le fichier.`);
      continue;
    }
    seen.add(normalized.value);

    if (!nom || !prenoms || !classe) {
      invalides += 1;
      erreurs.push(`Ligne ${ligne} (${normalized.value}) : nom, prénoms ou classe manquant.`);
      continue;
    }

    const existing = await prisma.student.findUnique({
      where: { matricule: normalized.value },
      select: { id: true, claimedByUserId: true },
    });

    if (existing) {
      if (existing.claimedByUserId) {
        ignoresReclames += 1;
        continue;
      }
      await prisma.student.update({
        where: { id: existing.id },
        data: {
          matriculeBrut,
          nom,
          prenoms,
          classe,
          noteVerification: note || null,
        },
      });
      maj += 1;
    } else {
      await prisma.student.create({
        data: {
          matricule: normalized.value,
          matriculeBrut,
          nom,
          prenoms,
          classe,
          noteVerification: note || null,
          actif: true,
        },
      });
      crees += 1;
    }
  }

  console.log("");
  console.log("=== Import des étudiants BDE ===");
  console.log(`Fichier      : ${file}`);
  console.log(`Lignes lues  : ${rows.length}`);
  console.log(`Créés        : ${crees}`);
  console.log(`Mis à jour   : ${maj}`);
  console.log(`Ignorés (réclamés) : ${ignoresReclames}`);
  console.log(`Invalides    : ${invalides}`);
  if (erreurs.length) {
    console.log("");
    console.log("Détail des lignes ignorées :");
    for (const erreur of erreurs.slice(0, 50)) console.log(`- ${erreur}`);
    if (erreurs.length > 50) console.log(`… et ${erreurs.length - 50} autres.`);
  }
  console.log("");
  console.log("Relancer ce script ne crée aucun doublon (upsert sur le matricule normalisé).");
}

main()
  .catch((error) => {
    console.error("Échec du seed étudiants :", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
