import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

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
  assert.ok(manifest.include.includes("packages/**"));
  assert.ok(manifest.include.includes("tests/**"));
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
    "tests/oss-core-readiness/public-export-manifest.test.mjs",
    "tests/security/owasp-asvs-profile.test.mjs",
  ]) {
    assert.ok(manifest.exclude.includes(privateTest), "missing explicit exclusion: " + privateTest);
  }
});
