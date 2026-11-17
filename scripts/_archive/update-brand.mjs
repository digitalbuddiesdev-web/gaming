import { PGlite } from "@electric-sql/pglite";

async function main() {
  const db = new PGlite("./.data/pg");
  await db.waitReady;
  await db.query("update operators set name = 'Club-8910' where slug = 'demo'");
  const res = await db.query("select * from operators");
  console.log("Updated operators:", res.rows);
}

main().catch(console.error);
