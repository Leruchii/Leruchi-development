import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const ignored = new Set([".git", "node_modules"]);
const REQUIRED_MAJOR = "24";
const REQUIRED_ENGINE = ">=24 <25";

function fail(message, details = []) {
  console.error(message);
  for (const detail of details) console.error(" - " + detail);
  process.exit(1);
}

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

const nvmrc = fs.readFileSync(path.join(root, ".nvmrc"), "utf8").trim();
if (nvmrc !== REQUIRED_MAJOR) fail(".nvmrc must pin Node.js 24", [`found: ${nvmrc || "<empty>"}`]);

const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
if (packageJson?.engines?.node !== REQUIRED_ENGINE) {
  fail("package.json must enforce the Node.js 24 runtime range", [`found: ${packageJson?.engines?.node ?? "<missing>"}`]);
}

const violations = [];
for (const file of walk(root)) {
  const rel = path.relative(root, file).replaceAll(path.sep, "/");
  let source;
  try { source = fs.readFileSync(file, "utf8"); } catch { continue; }

  if (rel.startsWith(".github/workflows/")) {
    for (const match of source.matchAll(/node-version:\s*["']?([^\s"'#}]+)/gi)) {
      if (match[1] !== REQUIRED_MAJOR) violations.push(`${rel}: node-version ${match[1]}`);
    }
  }

  if (/(^|\/)Dockerfile(?:\.|$)/i.test(rel)) {
    for (const match of source.matchAll(/FROM\s+node:([0-9]+)/gi)) {
      if (match[1] !== REQUIRED_MAJOR) violations.push(`${rel}: FROM node:${match[1]}`);
    }
  }

  for (const match of source.matchAll(/NODE_VERSION\s*=\s*["']?([0-9]+)/gi)) {
    if (match[1] !== REQUIRED_MAJOR) violations.push(`${rel}: NODE_VERSION=${match[1]}`);
  }
}

if (violations.length) fail("Only Node.js 24 is allowed in active runtime configuration", violations);
console.log("Runtime policy passed: Node.js 24 is the only configured project runtime.");
