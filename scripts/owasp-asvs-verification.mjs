import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const root = process.cwd();
const profile = JSON.parse(fs.readFileSync(path.join(root, "security/owasp-asvs-5.0.0-profile.json"), "utf8"));
assert.equal(profile.standard, "OWASP ASVS");
assert.equal(profile.version, "5.0.0");
assert.equal(profile.chapters.length, 17);

const required = profile.chapters.filter((c) => c.status === "REQUIRED");
const conditional = profile.chapters.filter((c) => c.status === "CONDITIONAL");
assert.ok(required.length >= 10);
assert.equal(required.length + conditional.length, 17);

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if ([".git", "node_modules"].includes(entry.name)) continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walk(p));
      continue;
    }
    if (entry.isSymbolicLink()) continue;
    if (entry.isFile()) out.push(p);
  }
  return out;
}

// Build credential signatures without embedding a complete live-detection pattern
// in this verifier's own source. This prevents the verifier from matching itself.
const patPrefix = "github" + "_pat_";
const ghpPrefix = "ghp_";
const privateKeyHeader = "-----" + "BEGIN " + "PRIVATE KEY-----";
const forbidden = [
  new RegExp(patPrefix + "[A-Za-z0-9_]+", "i"),
  new RegExp(ghpPrefix + "[A-Za-z0-9]+"),
  new RegExp(privateKeyHeader, "i")
];

for (const file of walk(root)) {
  const rel = path.relative(root, file);
  if (rel.startsWith("security" + path.sep)) continue;
  const text = fs.readFileSync(file, "utf8");
  for (const pattern of forbidden) {
    assert.equal(pattern.test(text), false, "credential/private-key pattern in " + rel);
  }
}

const workflowDir = path.join(root, ".github/workflows");
for (const workflow of walk(workflowDir)) {
  const rel = path.relative(root, workflow);
  const text = fs.readFileSync(workflow, "utf8");
  const runtimePins = [...text.matchAll(/node-version:\s*([^\s#]+)/g)].map((m) => m[1]);
  assert.ok(runtimePins.every((version) => version === "24"), "non-24 Node runtime in " + rel);
  assert.equal(/contents:\s*write\b/.test(text), false, "broad contents:write permission in " + rel);
}

console.log("OWASP ASVS " + profile.version + " verification profile: PASS");
console.log("Required chapters: " + required.length + "; conditional chapters: " + conditional.length);
