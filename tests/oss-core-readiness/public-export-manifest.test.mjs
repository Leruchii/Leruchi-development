import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

test("public export manifest excludes private control material", () => {
  const manifest = JSON.parse(fs.readFileSync("OSS_EXPORT_MANIFEST.json", "utf8"));
  const exclusions = new Set(manifest.exclude);
  for (const required of [
    "AGENTS.md",
    "BUILD_PLAN.md",
    "BUILD_STATE.md",
    "NORTH_STAR.md",
    "knowledge/**",
    "prompts/**",
    ".agents/**",
  ]) {
    assert.ok(exclusions.has(required), `missing exclusion: ${required}`);
  }
  assert.ok(manifest.include.includes("OSS_EXPORT_MANIFEST.json"));
  assert.ok(manifest.include.includes("scripts/public-*.mjs"));
  assert.ok(manifest.include.includes("packages/**"));
  assert.ok(manifest.include.includes("tests/**"));
  assert.ok(manifest.include.includes("package-lock.json"));
  assert.ok(manifest.include.includes("apps/studio/**"));
  assert.ok(fs.existsSync("package-lock.json"), "root npm lockfile must be committed");
  assert.ok(fs.existsSync("apps/studio/package-lock.json"), "Studio npm lockfile must be committed");
  for (const script of [
    "scripts/leruchi-backup.sh",
    "scripts/leruchi-restore.sh",
    "scripts/vibedb-backup.sh",
    "scripts/vibedb-restore.sh",
  ]) {
    assert.ok(manifest.include.includes(script), `backup/recovery test dependency missing from export: ${script}`);
  }
});

test("public export manifest does not allow the private control directories", () => {
  const manifest = JSON.parse(fs.readFileSync("OSS_EXPORT_MANIFEST.json", "utf8"));
  const includeText = manifest.include.join("\n");
  for (const privateName of ["knowledge", "prompts", ".agents", "BUILD_STATE", "BUILD_PLAN"]) {
    assert.equal(includeText.includes(privateName), false, `private path appears in include: ${privateName}`);
  }
});

test("private release-gate tests are excluded despite the broad tests/** include", () => {
  const manifest = JSON.parse(fs.readFileSync("OSS_EXPORT_MANIFEST.json", "utf8"));
  assert.ok(manifest.include.includes("tests/**"));
  for (const privateTest of [
    "tests/oss-core-readiness/**",
    "tests/security/owasp-asvs-profile.test.mjs",
  ]) {
    assert.ok(manifest.exclude.includes(privateTest), "missing explicit exclusion: " + privateTest);
  }
});

test("candidate builder includes its manifest and removes stale output files", () => {
  const output = fs.mkdtempSync(path.join(os.tmpdir(), "leruchi-export-"));
  fs.writeFileSync(path.join(output, "stale-secret.txt"), "must not survive rebuild");
  const builder = path.resolve("scripts/build-oss-core-candidate.mjs");
  const result = spawnSync(process.execPath, [builder, process.cwd(), output], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.existsSync(path.join(output, "stale-secret.txt")), false);
  assert.equal(fs.existsSync(path.join(output, "OSS_EXPORT_MANIFEST.json")), true);
  assert.equal(fs.existsSync(path.join(output, "BUILD_STATE.md")), false);
  assert.equal(fs.existsSync(path.join(output, "tests/oss-core-readiness")), false);
  fs.rmSync(output, { recursive: true, force: true });
});
