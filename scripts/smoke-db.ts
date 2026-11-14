import { startEmbeddedPostgres } from "./embedded-db-utils";
const { pg } = await startEmbeddedPostgres({ port: 5433, databaseDir: ".data/pg-test", databaseName: "bde_test" });
const client = pg.getPgClient();
await client.connect();
const res = await client.query("SELECT version()");
console.log(res.rows[0].version);
await client.end();
await pg.stop();
