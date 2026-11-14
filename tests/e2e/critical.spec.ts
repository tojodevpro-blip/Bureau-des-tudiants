import "dotenv/config";

import { expect, test, type APIRequestContext } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const e2eEnabled =
  process.env.E2E_ALLOW === "1" && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(baseURL);
const RUN = `${Date.now()}`.slice(-6);

test.describe.configure({ mode: "serial" });
test.skip(!e2eEnabled, "Définir E2E_ALLOW=1 et pointer vers localhost pour lancer les e2e.");

function headers(token: string) {
  return { "x-csrf-token": token, origin: baseURL };
}

async function csrf(context: APIRequestContext) {
  await context.get("/connexion");
  const cookies = await context.cookies();
  const token = cookies.find((cookie) => cookie.name === "bde_csrf")?.value;
  if (!token) throw new Error("Cookie CSRF absent");
  return token;
}

async function loginAdmin(context: APIRequestContext) {
  const token = await csrf(context);
  const response = await context.post("/api/auth/login", {
    headers: headers(token),
    data: {
      identifiant: process.env.E2E_ADMIN_EMAIL ?? process.env.ADMIN_EMAIL,
      motDePasse: process.env.E2E_ADMIN_PASSWORD ?? process.env.ADMIN_PASSWORD,
    },
  });
  expect(response.status(), await response.text()).toBe(200);
  return token;
}

test.afterAll(async () => {
  await prisma.$disconnect();
});

test("les pages publiques répondent et l’admin anonyme est redirigé", async ({ request }) => {
  const home = await request.get("/");
  expect(home.status()).toBe(200);
  expect(await home.text()).toContain("BDE");

  const admin = await request.get("/admin", { maxRedirects: 0 });
  expect([302, 307]).toContain(admin.status());
  expect(admin.headers().location).toContain("/connexion");

  const api = await request.post("/api/admin/elections", { data: {} });
  expect(api.status()).toBe(403);
});

test("parcours critique inscription, vote, résultats et exports", async ({ playwright }) => {
  const startedAt = new Date();
  const admin = await playwright.request.newContext({ baseURL });
  const student = await playwright.request.newContext({ baseURL });
  const matricule = `EIE31/${RUN}`;
  let electionId: string | null = null;
  let studentId: string | null = null;
  let userId: string | null = null;
  let previousSetting: string | null = null;

  try {
    const setting = await prisma.setting.findUnique({
      where: { key: "validation_manuelle_inscriptions" },
    });
    previousSetting = setting?.valeur ?? null;
    await prisma.setting.upsert({
      where: { key: "validation_manuelle_inscriptions" },
      create: { key: "validation_manuelle_inscriptions", valeur: "false" },
      update: { valeur: "false" },
    });

    await prisma.student.deleteMany({ where: { matricule } });
    const createdStudent = await prisma.student.create({
      data: {
        matricule,
        nom: "E2eNom",
        prenoms: "Étudiant Test",
        classe: "TEST",
        actif: true,
      },
    });
    studentId = createdStudent.id;

    const adminToken = await loginAdmin(admin);

    const createdElection = await admin.post("/api/admin/elections", {
      headers: headers(adminToken),
      data: {
        titre: `[E2E] Élection ${RUN}`,
        description: "Scrutin temporaire de test de bout en bout.",
        ouvreLe: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        fermeLe: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      },
    });
    expect(createdElection.status(), await createdElection.text()).toBe(201);
    const election = (await createdElection.json()).data as { id: string; titre: string };
    electionId = election.id;

    for (const nomAffiche of ["Candidat E2E A", "Candidat E2E B"]) {
      const candidate = await admin.post(`/api/admin/elections/${election.id}/candidates`, {
        headers: headers(adminToken),
        data: { nomAffiche, slogan: "Test", programme: "Programme de test" },
      });
      expect(candidate.status(), await candidate.text()).toBe(201);
    }

    const dbCandidates = await prisma.candidate.findMany({
      where: { electionId: election.id },
      orderBy: { ordre: "asc" },
    });
    const reorder = await admin.post(`/api/admin/elections/${election.id}/reorder`, {
      headers: headers(adminToken),
      data: { orderedIds: [...dbCandidates].reverse().map((candidate) => candidate.id) },
    });
    expect(reorder.status(), await reorder.text()).toBe(200);
    const reordered = await prisma.candidate.findMany({
      where: { electionId: election.id },
      orderBy: { ordre: "asc" },
    });
    expect(reordered[0].id).toBe(dbCandidates[1].id);

    const detail = await admin.get(`/admin/elections/${election.id}`);
    expect(detail.status()).toBe(200);
    expect(await detail.text()).toContain(election.titre);

    for (const statut of ["CANDIDATURES", "OUVERTE"]) {
      const transition = await admin.post(`/api/admin/elections/${election.id}/status`, {
        headers: headers(adminToken),
        data: { statut },
      });
      expect(transition.status(), await transition.text()).toBe(200);
    }

    const studentToken = await csrf(student);
    const unknown = await student.post("/api/auth/register", {
      headers: headers(studentToken),
      data: {
        matricule: `EIE32/${RUN}`,
        nom: "Inconnu",
        identifiant: `e2e-unknown-${RUN}@example.invalid`,
        motDePasse: "MotDePasse!2026",
      },
    });
    expect(unknown.status()).toBe(400);

    const registration = await student.post("/api/auth/register", {
      headers: headers(studentToken),
      data: {
        matricule,
        nom: "E2eNom",
        identifiant: `e2e-${RUN}@example.invalid`,
        motDePasse: "MotDePasse!2026",
      },
    });
    expect(registration.status(), await registration.text()).toBe(201);
    const registered = await prisma.user.findUnique({ where: { studentId: createdStudent.id } });
    expect(registered?.statut).toBe("APPROUVE");
    userId = registered?.id ?? null;

    const alreadyClaimed = await student.post("/api/auth/register", {
      headers: headers(studentToken),
      data: {
        matricule,
        nom: "E2eNom",
        identifiant: `e2e-other-${RUN}@example.invalid`,
        motDePasse: "MotDePasse!2026",
      },
    });
    expect(alreadyClaimed.status()).toBe(400);

    const studentCsrf = await csrf(student);
    const adminAsStudent = await student.get("/admin", { maxRedirects: 0 });
    expect([302, 307]).toContain(adminAsStudent.status());
    expect(adminAsStudent.headers().location).toContain("/tableau-de-bord");

    const firstVote = await student.post("/api/vote", {
      headers: headers(studentCsrf),
      data: { electionId: election.id, candidateId: null },
    });
    expect(firstVote.status(), await firstVote.text()).toBe(200);

    const secondVote = await student.post("/api/vote", {
      headers: headers(studentCsrf),
      data: { electionId: election.id, candidateId: null },
    });
    expect(secondVote.status()).toBe(409);
    expect((await secondVote.json()).error.code).toBe("DEJA_VOTE");

    expect(await prisma.voteParticipation.count({ where: { electionId: election.id } })).toBe(1);
    expect(await prisma.ballot.count({ where: { electionId: election.id } })).toBe(1);

    const voteLog = await prisma.auditLog.findFirst({
      where: { action: "VOTE_ENREGISTRE", acteur: userId ?? "" },
      orderBy: { createdAt: "desc" },
    });
    expect(voteLog?.details).toMatchObject({ electionId: election.id });

    const close = await admin.post(`/api/admin/elections/${election.id}/status`, {
      headers: headers(adminToken),
      data: { statut: "CLOTUREE" },
    });
    expect(close.status()).toBe(200);

    const pdf = await admin.get(`/api/admin/elections/${election.id}/export/pdf`);
    expect(pdf.status()).toBe(200);
    expect(pdf.headers()["content-type"]).toContain("application/pdf");

    const csv = await admin.get(`/api/admin/elections/${election.id}/export/csv`);
    expect(csv.status()).toBe(200);
    expect(csv.headers()["content-type"]).toContain("text/csv");

    const beforePublish = await student.get("/resultats");
    const beforePublishHtml = await beforePublish.text();
    expect(beforePublishHtml).not.toContain("Candidat E2E A");

    const publish = await admin.post(`/api/admin/elections/${election.id}/status`, {
      headers: headers(adminToken),
      data: { statut: "PUBLIEE" },
    });
    expect(publish.status()).toBe(200);

    const publicResults = await student.get("/resultats");
    expect(publicResults.status()).toBe(200);
    expect(await publicResults.text()).toContain(election.titre);

    const auditPage = await admin.get("/admin/audit");
    expect(auditPage.status()).toBe(200);
    expect(await auditPage.text()).toContain("Vote enregistré");
  } finally {
    if (electionId) await prisma.election.deleteMany({ where: { id: electionId } });
    if (userId) await prisma.user.deleteMany({ where: { id: userId } });
    if (studentId) await prisma.student.deleteMany({ where: { id: studentId } });
    await prisma.setting.deleteMany({ where: { key: "validation_manuelle_inscriptions" } });
    if (previousSetting !== null) {
      await prisma.setting.upsert({
        where: { key: "validation_manuelle_inscriptions" },
        create: { key: "validation_manuelle_inscriptions", valeur: previousSetting },
        update: { valeur: previousSetting },
      });
    }
    await prisma.auditLog.deleteMany({ where: { createdAt: { gte: startedAt } } });
    await prisma.rateLimit.deleteMany({
      where: {
        OR: [
          { key: { startsWith: "connexion:" } },
          { key: { startsWith: "inscription:" } },
          { key: { startsWith: "vote:" } },
        ],
      },
    });
    await admin.dispose();
    await student.dispose();
  }
});
