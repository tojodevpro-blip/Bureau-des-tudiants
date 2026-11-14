import { spawn } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { startEmbeddedPostgres, databaseUrlFor } from "./embedded-db-utils";

const root = process.cwd();
const appPort = Number(process.env.PORT ?? 3000);
const pgPort = Number(process.env.EMBEDDED_PG_PORT ?? 5433);
const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");
const prismaBin = path.join(root, "node_modules", "prisma", "build", "index.js");
const tsxBin = path.join(root, "node_modules", "tsx", "dist", "cli.mjs");

function loadEnv() {
  const file = path.join(root, ".env");
  if (!existsSync(file)) return;
  for (const rawLine of readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

function run(command: string, args: string[], env = process.env) {
  return new Promise<number>((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, env, stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => resolve(code ?? 1));
  });
}

function portOpen(port: number) {
  return new Promise<boolean>((resolve) => {
    const socket = net.connect({ host: "127.0.0.1", port });
    socket.setTimeout(800);
    socket.on("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.on("error", () => resolve(false));
  });
}

function newestMtime(target: string): number {
  if (!existsSync(target)) return 0;
  const stats = statSync(target);
  if (stats.isFile()) return stats.mtimeMs;
  let newest = 0;
  const stack = [target];
  while (stack.length) {
    const current = stack.pop()!;
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(entryPath);
      } else {
        newest = Math.max(newest, statSync(entryPath).mtimeMs);
      }
    }
  }
  return newest;
}

function buildRequired() {
  const buildId = path.join(root, ".next", "BUILD_ID");
  const marker = path.join(root, ".next", ".bde-build-root");
  if (!existsSync(buildId)) return true;
  if (!existsSync(marker) || readFileSync(marker, "utf8").trim() !== root) return true;
  const builtAt = statSync(buildId).mtimeMs;
  const sourceFiles = [
    path.join(root, "src"),
    path.join(root, "public"),
    path.join(root, "prisma"),
    path.join(root, "package.json"),
    path.join(root, "package-lock.json"),
    path.join(root, "next.config.ts"),
    path.join(root, "tailwind.config.ts"),
    path.join(root, "postcss.config.mjs"),
    path.join(root, ".env"),
  ];
  return sourceFiles.some((file) => newestMtime(file) > builtAt);
}

function openBrowser(url: string) {
  if (process.platform === "win32") {
    spawn("cmd.exe", ["/c", "start", "", url], { detached: true, stdio: "ignore" }).unref();
  }
}

async function ensureAdmin(env: NodeJS.ProcessEnv) {
  const prisma = new PrismaClient();
  try {
    const count = await prisma.user.count({ where: { role: "ADMIN" } });
    if (count > 0) return 0;
  } finally {
    await prisma.$disconnect();
  }
  console.log("Aucun administrateur détecté : création du compte initial...");
  return run(process.execPath, [tsxBin, path.join(root, "scripts", "seed-admin.ts")], env);
}

async function main() {
  loadEnv();

  if (await portOpen(appPort)) {
    const url = `http://localhost:${appPort}`;
    console.log(`BDE tourne déjà sur ${url}.`);
    openBrowser(url);
    return;
  }

  for (const file of [nextBin, prismaBin, tsxBin]) {
    if (!existsSync(file)) {
      throw new Error(
        `Dépendances incomplètes (${file}). Lance d'abord « npm ci » dans le dossier du projet.`,
      );
    }
  }

  const configuredUrl = process.env.DATABASE_URL;
  const localDatabase = !configuredUrl || /localhost|127\.0\.0\.1/.test(configuredUrl);
  let pg: Awaited<ReturnType<typeof startEmbeddedPostgres>>["pg"] | null = null;

  if (localDatabase) {
    const running = await portOpen(pgPort);
    if (!running) {
      console.log(`Démarrage de PostgreSQL local sur le port ${pgPort}...`);
      const started = await startEmbeddedPostgres({ port: pgPort });
      pg = started.pg;
    } else {
      console.log(`PostgreSQL local déjà disponible sur le port ${pgPort}.`);
    }
    process.env.DATABASE_URL = databaseUrlFor(pgPort);
  }

  if (buildRequired()) {
    console.log("Préparation de Prisma...");
    const generateCode = await run(
      process.execPath,
      [prismaBin, "generate"],
      process.env,
    );
    if (generateCode !== 0) throw new Error("La génération Prisma a échoué.");
    console.log("Compilation de l'application...");
    const buildCode = await run(process.execPath, [nextBin, "build"], process.env);
    if (buildCode !== 0) throw new Error("La compilation a échoué.");
    writeFileSync(path.join(root, ".next", ".bde-build-root"), root, "utf8");
  }

  if (localDatabase) {
    console.log("Mise à jour du schéma de la base locale...");
    const pushCode = await run(
      process.execPath,
      [prismaBin, "db", "push", "--skip-generate"],
      process.env,
    );
    if (pushCode !== 0) throw new Error("Impossible de préparer la base de données.");
  }

  const adminCode = await ensureAdmin(process.env);
  if (adminCode !== 0) throw new Error("Impossible de créer le compte administrateur.");

  const url = `http://localhost:${appPort}`;
  console.log("");
  console.log(`BDE est prêt : ${url}`);
  console.log("Ferme cette fenêtre ou appuie sur Ctrl+C pour arrêter.");
  console.log("");

  const server = spawn(process.execPath, [nextBin, "start", "-p", String(appPort)], {
    cwd: root,
    env: process.env,
    stdio: "inherit",
  });

  setTimeout(() => openBrowser(url), 2500);

  let stopping = false;
  const shutdown = async () => {
    if (stopping) return;
    stopping = true;
    server.kill();
    if (pg) {
      await pg.stop().catch(() => undefined);
    }
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  server.on("exit", async (code) => {
    if (!stopping && pg) await pg.stop().catch(() => undefined);
    process.exit(code ?? 0);
  });
}

main().catch((error) => {
  console.error("");
  console.error("Échec du lancement local :", error instanceof Error ? error.message : error);
  process.exit(1);
});
