import { PrismaClient } from "@prisma/client";
import { hashPassword, isStrongAdminPassword } from "../src/lib/auth/password";
import { isEmail, normalizeIdentifiant } from "../src/lib/normalize";

const prisma = new PrismaClient();

async function main() {
  const rawEmail = process.env.ADMIN_EMAIL?.trim();
  const password = process.env.ADMIN_PASSWORD;
  const nom = process.env.ADMIN_NOM?.trim() || "Administrateur BDE";

  if (!rawEmail || !password) {
    console.error("ADMIN_EMAIL et ADMIN_PASSWORD sont obligatoires dans .env.");
    process.exitCode = 1;
    return;
  }

  const email = normalizeIdentifiant(rawEmail);
  if (!isEmail(email)) {
    console.error("ADMIN_EMAIL n’est pas une adresse email valide.");
    process.exitCode = 1;
    return;
  }

  if (!isStrongAdminPassword(password)) {
    console.error(
      "ADMIN_PASSWORD trop faible : 12 caractères minimum, avec majuscule, minuscule, chiffre et caractère spécial.",
    );
    process.exitCode = 1;
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing && existing.role !== "ADMIN") {
    console.error(
      "Un compte étudiant utilise déjà cet email. Choisis un autre ADMIN_EMAIL.",
    );
    process.exitCode = 1;
    return;
  }

  const motDePasseHash = await hashPassword(password);

  const admin = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      motDePasseHash,
      role: "ADMIN",
      statut: "APPROUVE",
    },
    update: {
      motDePasseHash,
      role: "ADMIN",
      statut: "APPROUVE",
      studentId: null,
    },
  });

  await prisma.auditLog.create({
    data: {
      acteur: admin.id,
      action: existing ? "ADMIN_MOT_DE_PASSE_MAJ" : "ADMIN_CREE",
      details: { email, nom },
    },
  });

  console.log("");
  console.log("=== Compte administrateur ===");
  console.log(`Email : ${email}`);
  console.log(`Nom   : ${nom}`);
  console.log(existing ? "Mot de passe mis à jour." : "Compte créé.");
  console.log("Connecte-toi sur /connexion puis accède à /admin.");
}

main()
  .catch((error) => {
    console.error("Échec de la création de l’admin :", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
