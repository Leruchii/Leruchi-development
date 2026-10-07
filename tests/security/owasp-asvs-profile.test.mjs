import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("OWASP ASVS profile is pinned to stable 5.0.0", () => {
  const p = JSON.parse(fs.readFileSync("security/owasp-asvs-5.0.0-profile.json", "utf8"));
  assert.equal(p.standard, "OWASP ASVS");
  assert.equal(p.version, "5.0.0");
  assert.equal(p.chapters.length, 17);
  assert.equal(new Set(p.chapters.map((c) => c.id)).size, 17);
});

test("Level 2 baseline includes core security chapters", () => {
  const p = JSON.parse(fs.readFileSync("security/owasp-asvs-5.0.0-profile.json", "utf8"));
  const required = new Set(p.chapters.filter((c) => c.status === "REQUIRED").map((c) => c.id));
  for (const id of ["V1","V2","V4","V5","V6","V7","V8","V9","V10","V11","V13","V14","V15"]) {
    assert.ok(required.has(id), "missing required chapter " + id);
  }
});
