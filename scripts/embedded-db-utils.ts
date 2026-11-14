import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";
import path from "node:path";

type StartOptions = {
  port?: number;
  databaseDir?: string;
  databaseName?: string;
  user?: string;
  password?: string;
};

export async function startEmbeddedPostgres(options: StartOptions = {}) {
  const port = options.port ?? Number(process.env.EMBEDDED_PG_PORT ?? 5433);
  const databaseDir = path.resolve(
    options.databaseDir ?? process.env.EMBEDDED_PG_DIR ?? ".data/pg",
  );
  const user = options.user ?? "postgres";
  const password = options.password ?? "postgres";
  const databaseName = options.databaseName ?? "bde";

  const pg = new EmbeddedPostgres({
    databaseDir,
    user,
    password,
    port,
    persistent: true,
    autoRehydrateSymlinks: true,
    initdbFlags: ["--encoding=UTF8", "--locale=C"],
  });

  if (!existsSync(path.join(databaseDir, "PG_VERSION"))) {
    await pg.initialise();
  }
  await pg.start();

  try {
    await pg.createDatabase(databaseName);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/already exists/i.test(message)) {
      throw error;
    }
  }

  return { pg, port, databaseName, user, password };
}

export function databaseUrlFor(port = 5433, databaseName = "bde") {
  return `postgresql://postgres:postgres@localhost:${port}/${databaseName}?schema=public`;
}
