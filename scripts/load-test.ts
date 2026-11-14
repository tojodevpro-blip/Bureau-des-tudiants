import "dotenv/config";

import { PrismaClient } from "@prisma/client";
import { SignJWT } from "jose";

const prisma = new PrismaClient();

const COUNT = Number(process.env.LOAD_TEST_COUNT ?? 300);
const CONCURRENCY = Number(process.env.LOAD_TEST_CONCURRENCY ?? 50);
const BASE_URL = (process.env.LOAD_TEST_URL ?? "http://localhost:3000").replace(/\/$/, "");
const MARKER = "[LOADTEST]";
const MATRICULE_PREFIX = "LOADTEST/";

type Result = { ok: boolean; status: number; duration: number; message?: string };

function percentile(values: number[], ratio: number) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil(ratio * sorted.length) - 1);
  return sorted[index];
}

async function cleanup() {
  await prisma.election.deleteMany({ where: { titre: { startsWith: MARKER } } });
  await prisma.user.deleteMany({ where: { email: { startsWith: "loadtest-" } } });
  await prisma.student.deleteMany({ where: { matricule: { startsWith: MATRICULE_PREFIX } } });
  await prisma.rateLimit.deleteMany({ where: { key: { startsWith: "vote:ip:" } } });
}

async function main() {
  if (process.env.LOAD_TEST_ALLOW !== "1") {
    console.error(
      "Test de charge désactivé. Relance avec LOAD_TEST_ALLOW=1 et une base de test locale.",
    );
    process.exitCode = 1;
    return;
  }

  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET manquant ou trop court.");
  }
  if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(BASE_URL)) {
    throw new Error("LOAD_TEST_URL doit pointer vers localhost pour éviter la production.");
  }

  console.log(`Nettoyage des anciennes données ${MARKER}…`);
  await cleanup();

  const now = Date.now();
  const election = await prisma.election.create({
    data: {
      titre: `${MARKER} Scrutin de charge`,
      description: "Données temporaires créées par scripts/load-test.ts.",
      statut: "OUVERTE",
      ouvreLe: new Date(now - 60 * 60 * 1000),
      fermeLe: new Date(now + 60 * 60 * 1000),
    },
  });

  const candidates = await Promise.all(
    ["Candidat Charge A", "Candidat Charge B"].map((nomAffiche, index) =>
      prisma.candidate.create({
        data: { electionId: election.id, nomAffiche, ordre: index + 1 },
      }),
    ),
  );

  console.log(`Création de ${COUNT} comptes étudiants de test…`);
  const voters: { userId: string; index: number }[] = [];
  for (let index = 0; index < COUNT; index += 1) {
    const student = await prisma.student.create({
      data: {
        matricule: `${MATRICULE_PREFIX}${String(index + 1).padStart(4, "0")}`,
        nom: "Charge",
        prenoms: `Étudiant ${index + 1}`,
        classe: "TEST",
        actif: true,
      },
    });
    const user = await prisma.user.create({
      data: {
        studentId: student.id,
        claimedStudent: { connect: { id: student.id } },
        email: `loadtest-${index + 1}@example.invalid`,
        motDePasseHash: "load-test-no-login",
        role: "STUDENT",
        statut: "APPROUVE",
      },
    });
    voters.push({ userId: user.id, index });
  }

  const key = new TextEncoder().encode(secret);
  const results: Result[] = [];
  const startedAt = performance.now();

  async function runBatch(batch: { userId: string; index: number }[]) {
    await Promise.all(
      batch.map(async ({ userId, index }) => {
        const token = await new SignJWT({ role: "STUDENT" })
          .setProtectedHeader({ alg: "HS256" })
          .setSubject(userId)
          .setIssuedAt()
          .setExpirationTime("1h")
          .sign(key);

        const csrf = crypto.randomUUID();
        const candidateId = index % 10 === 0 ? null : candidates[index % 2].id;
        const start = performance.now();

        try {
          const response = await fetch(`${BASE_URL}/api/vote`, {
            method: "POST",
            signal: AbortSignal.timeout(20_000),
            headers: {
              "content-type": "application/json",
              cookie: `bde_session=${token}; bde_csrf=${csrf}`,
              "x-csrf-token": csrf,
              origin: BASE_URL,
              "x-forwarded-for": `10.0.${Math.floor(index / 250)}.${(index % 250) + 1}`,
            },
            body: JSON.stringify({ electionId: election.id, candidateId }),
          });
          const duration = performance.now() - start;
          const payload = (await response.json().catch(() => null)) as
            | { ok: boolean; error?: { message?: string } }
            | null;
          results.push({
            ok: response.ok && payload?.ok === true,
            status: response.status,
            duration,
            message: payload?.error?.message,
          });
        } catch (error) {
          results.push({
            ok: false,
            status: 0,
            duration: performance.now() - start,
            message: error instanceof Error ? error.message : String(error),
          });
        }
      }),
    );
  }

  for (let index = 0; index < voters.length; index += CONCURRENCY) {
    await runBatch(voters.slice(index, index + CONCURRENCY));
    const done = Math.min(index + CONCURRENCY, voters.length);
    process.stdout.write(`\r${done}/${voters.length} votes envoyés…`);
  }
  process.stdout.write("\n");

  const totalDuration = performance.now() - startedAt;
  const durations = results.map((result) => result.duration);
  const success = results.filter((result) => result.ok).length;
  const failures = results.filter((result) => !result.ok);
  const statusCounts = results.reduce<Record<number, number>>((acc, result) => {
    acc[result.status] = (acc[result.status] ?? 0) + 1;
    return acc;
  }, {});

  const [participations, ballots] = await Promise.all([
    prisma.voteParticipation.count({ where: { electionId: election.id } }),
    prisma.ballot.count({ where: { electionId: election.id } }),
  ]);

  console.log("");
  console.log("=== Résultat du test de charge ===");
  console.log(`URL           : ${BASE_URL}`);
  console.log(`Votes envoyés : ${results.length}`);
  console.log(`Succès        : ${success}`);
  console.log(`Échecs        : ${failures.length}`);
  console.log(`Statuts HTTP  : ${JSON.stringify(statusCounts)}`);
  console.log(`Durée totale  : ${(totalDuration / 1000).toFixed(2)} s`);
  console.log(`Débit         : ${((results.length / totalDuration) * 1000).toFixed(1)} req/s`);
  console.log(`Latence p50   : ${percentile(durations, 0.5).toFixed(0)} ms`);
  console.log(`Latence p95   : ${percentile(durations, 0.95).toFixed(0)} ms`);
  console.log(`Latence max   : ${Math.max(...durations, 0).toFixed(0)} ms`);
  console.log(`Participations en base : ${participations}`);
  console.log(`Bulletins en base      : ${ballots}`);

  if (failures.length > 0) {
    const messages = new Map<string, number>();
    for (const failure of failures) {
      const label = `${failure.status} ${failure.message ?? "sans message"}`;
      messages.set(label, (messages.get(label) ?? 0) + 1);
    }
    console.log("");
    console.log("Principales erreurs :");
    for (const [label, count] of [...messages].sort((a, b) => b[1] - a[1]).slice(0, 10)) {
      console.log(`- ${count} × ${label}`);
    }
  }

  if (success !== COUNT || participations !== COUNT) {
    process.exitCode = 1;
  }

  if (process.env.LOAD_TEST_KEEP === "1") {
    console.log(`Données conservées. Élection : ${election.id}`);
  } else {
    console.log("Nettoyage des données de test…");
    await cleanup();
  }
}

main()
  .catch((error) => {
    console.error("Échec du test de charge :", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
