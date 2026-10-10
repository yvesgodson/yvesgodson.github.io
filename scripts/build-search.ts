import { spawn } from "node:child_process";
import { readdir, readFile, rm } from "node:fs/promises";
import { resolve, sep } from "node:path";

const dist = resolve("dist");
const pagefindOutput = resolve(dist, "pagefind");

if (!pagefindOutput.startsWith(`${dist}${sep}`)) {
  throw new Error("Refusing to modify a search directory outside dist.");
}

async function hasSearchableArticle(directory: string): Promise<boolean> {
  const items = await readdir(directory, { withFileTypes: true });
  for (const item of items) {
    const path = resolve(directory, item.name);
    if (item.isDirectory() && (await hasSearchableArticle(path))) return true;
    if (
      item.isFile() &&
      item.name.endsWith(".html") &&
      (await readFile(path, "utf8")).includes("data-pagefind-body")
    )
      return true;
  }
  return false;
}

if (!(await hasSearchableArticle(dist))) {
  await rm(pagefindOutput, { recursive: true, force: true });
  console.log("No published article bodies found. Pagefind index skipped.");
  process.exit(0);
}

const pagefind = resolve("node_modules/pagefind/lib/runner/bin.cjs");
const child = spawn(
  process.execPath,
  [pagefind, "--site", "dist", "--root-selector", "[data-pagefind-body]"],
  { stdio: "inherit" },
);

child.on("exit", (code) => process.exit(code ?? 1));
child.on("error", (error) => {
  console.error(error);
  process.exit(1);
});
