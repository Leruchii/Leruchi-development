import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const script = path.resolve("scripts/oss-core-readiness-audit.mjs");

function runAudit(root) {
  return spawnSync(process.execPath, [script, root], { encoding: "utf8" });
}

function makeFixture(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "leruchi-oss-"));
  for (const [rel, content] of Object.entries(files)) {
    const file = path.join(root, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
  return root;
}

test("accepts a minimal sanitized public candidate", () => {
  const root = makeFixture({
    "README.md": "# VibeDB\n",
    ".nvmrc": "24\n",
    "packages/core/index.mjs": "export const core = true;\n",
  });
  const result = runAudit(root);
  assert.equal(result.status, 0, result.stderr);
});

test("rejects internal build documents", () => {
  const root = makeFixture({
    "README.md": "# VibeDB\n",
    ".nvmrc": "24\n",
    "BUILD_STATE.md": "private\n",
  });
  const result = runAudit(root);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /forbidden public path/);
});

test("rejects credentials", () => {
  const root = makeFixture({
    "README.md": "# VibeDB\n",
    ".nvmrc": "24\n",
    "config.txt": ["github", "_pat_", "not-a-real-token\\n"].join(""),
  });
  const result = runAudit(root);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /forbidden secret pattern/);
});

test("rejects non-24 Node runtime configuration and requires Node 24", () => {
  const root = makeFixture({
    "README.md": "# VibeDB\n",
    ".nvmrc": "23\n",
    ".github/workflows/test.yml": ["steps:\\n  - uses: actions/setup-node@v6\\n    with:\\n      node-version: ", "23", "\\n"].join(""),
  });
  const result = runAudit(root);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /non-24 workflow runtime|runtime baseline/);
});


test("rejects a public package engine outside Node 24", () => {
  const root = makeFixture({
    "README.md": "# Leruchi\\n",
    ".nvmrc": "24\\n",
    "package.json": JSON.stringify({ engines: { node: ">=22 <23" } }),
  });
  const result = runAudit(root);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /public package engine must be >=24 <25/);
});
