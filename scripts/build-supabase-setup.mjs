import { readFileSync, writeFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const files = [
  "supabase/schema.sql",
  "supabase/migrations/20261022_reliable_storage.sql",
  "supabase/migrations/20261023_norely_profile.sql",
  "supabase/migrations/20261023_planning_upgrades.sql",
  "supabase/migrations/20261023_push_notifications.sql",
];
const sections = files.map((file) => {
  // Individual migrations own transactions; the combined installer uses one.
  // PL/pgSQL block BEGIN/END statements have different syntax and stay intact.
  const sql = readFileSync(new URL(file, root), "utf8")
    .replace(/\r\n/g, "\n")
    .replace(/^(?:BEGIN|COMMIT);(?:\n|$)/gm, "")
    .trim();
  return `-- Source: ${file}\n${sql}`;
});
const output = [
  "-- memorIA: instalación completa de Supabase.",
  "-- Generado con npm run db:setup. No editar este archivo a mano.",
  "-- Usa este instalador O los archivos individuales en el orden documentado.",
  "-- No incluye datos de ejemplo ni elimina registros existentes.",
  "BEGIN;",
  ...sections,
  "COMMIT;\n",
].join("\n\n");
const target = new URL("supabase/setup_complete.sql", root);

if (process.argv.includes("--check")) {
  if (readFileSync(target, "utf8").replace(/\r\n/g, "\n") !== output)
    throw new Error("setup_complete.sql está desactualizado. Ejecuta npm run db:setup.");
} else {
  writeFileSync(target, output);
  console.log("Actualizado supabase/setup_complete.sql desde las migraciones.");
}
