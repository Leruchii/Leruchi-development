import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const lockfiles = [
  { path: "package-lock.json", label: "Root" },
  { path: "apps/studio/package-lock.json", label: "Studio" },
];
const entries = [];

for (const lockfile of lockfiles) {
  const fullPath = path.join(root, lockfile.path);
  const lock = JSON.parse(fs.readFileSync(fullPath, "utf8"));
  if (lock.lockfileVersion !== 3 || !lock.packages) {
    throw new Error(`Expected npm lockfile v3 with package metadata: ${lockfile.path}`);
  }

  for (const [packagePath, metadata] of Object.entries(lock.packages)) {
    if (!packagePath.startsWith("node_modules/")) continue;
    const marker = "node_modules/";
    const name = packagePath.slice(packagePath.lastIndexOf(marker) + marker.length);
    const version = metadata.version;
    const license = typeof metadata.license === "string"
      ? metadata.license
      : typeof metadata.license?.type === "string"
        ? metadata.license.type
        : "";
    if (!name || !version || !license) {
      throw new Error(`Dependency missing name, version, or declared license metadata in ${lockfile.path}: ${packagePath}`);
    }
    entries.push({
      source: lockfile.label,
      name,
      version,
      license,
      dev: Boolean(metadata.dev),
      optional: Boolean(metadata.optional),
    });
  }
}

const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
entries.sort((a, b) =>
  compare(a.source, b.source) ||
  compare(a.name, b.name) ||
  compare(a.version, b.version) ||
  compare(a.license, b.license)
);

const licenseCounts = new Map();
for (const entry of entries) {
  licenseCounts.set(entry.license, (licenseCounts.get(entry.license) ?? 0) + 1);
}
const summary = [...licenseCounts.entries()].sort(([a], [b]) => compare(a, b));

const lines = [
  "# Third-party dependency license inventory",
  "",
  "This file is generated deterministically from the committed npm lockfiles. It records license metadata declared by dependencies; it is not legal advice, a substitute for reviewing license texts, or a claim that every license is compatible with every distribution model.",
  "",
  "Before publishing a candidate, review the licenses and notices for the exact dependency tree, including optional platform packages. In particular, expressions containing LGPL, MPL, or CC-BY require an explicit distribution/notice review. Optional dependencies are listed because a consumer or build platform may install them.",
  "",
  "## Inventory summary",
  "",
  `- Dependency entries: ${entries.length}`,
  `- Root lockfile entries: ${entries.filter((entry) => entry.source === "Root").length}`,
  `- Studio lockfile entries: ${entries.filter((entry) => entry.source === "Studio").length}`,
  "",
  "| Declared license metadata | Dependency entries |",
  "| --- | ---: |",
  ...summary.map(([license, count]) => `| ${license.replaceAll("|", "\\|")} | ${count} |`),
  "",
  "## Package-level inventory",
  "",
  "| Scope | Package | Version | Declared license metadata | Development dependency | Optional dependency |",
  "| --- | --- | --- | --- | --- | --- |",
  ...entries.map((entry) =>
    `| ${entry.source} | ${entry.name.replaceAll("|", "\\|")} | ${entry.version} | ${entry.license.replaceAll("|", "\\|")} | ${entry.dev ? "yes" : "no"} | ${entry.optional ? "yes" : "no"} |`
  ),
  "",
  "Regenerate/verify this file by running `node scripts/verify-third-party-notices.mjs` with Node.js 24 from the repository root.",
  "",
];
const expected = lines.join("\n");
const actual = fs.readFileSync(path.join(root, "THIRD_PARTY_NOTICES.md"), "utf8");
if (actual !== expected) {
  console.error("Third-party license inventory is stale. Regenerate THIRD_PARTY_NOTICES.md from the committed lockfiles.");
  process.exit(1);
}
console.log(`Third-party license inventory passed (${entries.length} dependency entries; ${summary.length} license expressions).`);
