#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv[2] ?? ".");
const failures = [];
const forbiddenPathFragments = [
  "AGENTS.md", "BUILD_STATE.md", "BUILD_PLAN.md", ".agents",
  "knowledge", "prompts", "internal", "enterprise", "cloud"
];
const forbiddenContent = [
  /github_pat_[A-Za-z0-9_]{20,}/i,
  /\bgh[pousr]_[A-Za-z0-9]{20,}\b/i,
  /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/i,
  /\bAIza[0-9A-Za-z_-]{30,}\b/,
  /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/,
  /BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY/,
  new RegExp("-----" + "BEGIN PRIVATE KEY-----"),
  /AKIA[0-9A-Z]{16}/,
];

const files = [];
function collect(dir, prefix = "") {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = path.posix.join(prefix, entry.name);
    if (entry.isDirectory()) collect(path.join(dir, entry.name), rel);
    else files.push(rel);
  }
}
collect(root);
files.sort();

for (const rel of files) {
  const normalized = `/${rel}/`;
  if (forbiddenPathFragments.some((fragment) =>
    normalized.includes(`/${fragment}/`) || rel === fragment
  )) {
    failures.push(`forbidden public path: ${rel}`);
  }
  const filePath = path.join(root, rel);
  const stat = fs.statSync(filePath);
  if (stat.size > 1024 * 1024) failures.push(`file exceeds 1 MiB public artifact limit: ${rel}`);
  if (stat.size <= 1024 * 1024) {
    const text = fs.readFileSync(filePath, "utf8");
    for (const pattern of forbiddenContent) {
      if (pattern.test(text)) failures.push(`forbidden secret pattern in: ${rel}`);
    }
    for (const match of text.matchAll(/node-version:\s*["']?([^\s"'#}]+)/gi)) {
      if (match[1] !== "24") failures.push(`non-24 workflow runtime in ${rel}: ${match[1]}`);
    }
    for (const match of text.matchAll(/FROM\s+node:([0-9]+)/gi)) {
      if (match[1] !== "24") failures.push(`non-24 Docker Node runtime in ${rel}: ${match[1]}`);
    }
    for (const match of text.matchAll(/NODE_VERSION\s*=\s*["']?([0-9]+)/gi)) {
      if (match[1] !== "24") failures.push(`non-24 NODE_VERSION in ${rel}: ${match[1]}`);
    }
  }
}

for (const rel of ["README.md", "THIRD_PARTY_NOTICES.md", ".nvmrc", "package-lock.json", "apps/studio/package-lock.json"]) {
  if (!files.includes(rel)) failures.push(`required public file missing: ${rel}`);
}
const nvmrc = files.includes(".nvmrc")
  ? fs.readFileSync(path.join(root, ".nvmrc"), "utf8").trim()
  : "";
if (nvmrc !== "24") failures.push(`public runtime baseline must be Node 24; found: ${nvmrc || "<missing>"}`);
for (const rel of ["package-lock.json", "apps/studio/package-lock.json"]) {
  if (!files.includes(rel)) continue;
  try {
    const lock = JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));
    if (lock.lockfileVersion !== 3 || !lock.packages || !Object.hasOwn(lock.packages, "")) {
      failures.push("public lockfile must be npm lockfile v3 with a root package entry: " + rel);
    }
  } catch {
    failures.push("public lockfile is invalid JSON: " + rel);
  }
}

if (files.includes("package.json")) {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
    if (pkg?.engines?.node !== ">=24 <25") failures.push(`public package engine must be >=24 <25; found: ${pkg?.engines?.node ?? "<missing>"}`);
  } catch {
    failures.push("public package.json is invalid JSON");
  }
}

if (failures.length) {
  console.error("OSS CORE READINESS: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`OSS CORE READINESS: PASS (${files.length} files audited)`);
