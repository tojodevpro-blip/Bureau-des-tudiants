import { startEmbeddedPostgres, databaseUrlFor } from "./embedded-db-utils";

async function main() {
  const port = Number(process.env.EMBEDDED_PG_PORT ?? 5433);
  const databaseName = process.env.EMBEDDED_PG_DATABASE ?? "bde";

  console.log("Démarrage de PostgreSQL local (embedded-postgres)...");
  console.log(`Dossier : ${process.env.EMBEDDED_PG_DIR ?? ".data/pg"}`);
  console.log(`Port    : ${port}`);

  const { pg } = await startEmbeddedPostgres({ port, databaseName });

  console.log("");
  console.log("PostgreSQL local prêt.");
  console.log(`DATABASE_URL="${databaseUrlFor(port, databaseName)}"`);
  console.log("");
  console.log("Laisse ce terminal ouvert. Ctrl+C pour arrêter.");

  const shutdown = async () => {
    console.log("\nArrêt de PostgreSQL...");
    try {
      await pg.stop();
    } finally {
      process.exit(0);
    }
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  await new Promise(() => {});
}

main().catch((error) => {
  console.error("Impossible de démarrer PostgreSQL :", error);
  process.exit(1);
});
