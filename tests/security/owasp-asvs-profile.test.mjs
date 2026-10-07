import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("OWASP ASVS profile is pinned to stable 5.0.0", () => {
  const p = JSON.parse(fs.readFileSync("security/owasp-asvs-5.0.0-profile.json", "utf8"));
  assert.equal(p.standard, "OWASP ASVS");
  assert.equal(p.version, "5.0.0");
  assert.equal(p.chapters.length, 17);
  assert.equal(new Set(p.chapters.map((c) => c.id)).size, 17);
  assert.match(fs.readFileSync("scripts/owasp-asvs-verification.mjs", "utf8"), /github.*_pat_/);
});

test("Level 2 baseline includes core security chapters", () => {
  const p = JSON.parse(fs.readFileSync("security/owasp-asvs-5.0.0-profile.json", "utf8"));
  const required = new Set(p.chapters.filter((c) => c.status === "REQUIRED").map((c) => c.id));
  for (const id of ["V1","V2","V3","V4","V6","V7","V8","V9","V11","V12","V13","V14","V15","V16"]) {
    assert.ok(required.has(id), "missing required chapter " + id);
  }
});

test("ASVS requirement evidence ledger is complete and conservative", () => {
  const ledger = JSON.parse(fs.readFileSync("security/owasp-asvs-5.0.0-evidence.json", "utf8"));
  assert.equal(ledger.standard, "OWASP ASVS");
  assert.equal(ledger.version, "5.0.0");
  assert.equal(ledger.target, "Level 2");
  assert.equal(ledger.compliance_claim, "NOT_CLAIMED");
  assert.equal(ledger.requirements.length, 345);
  assert.equal(new Set(ledger.requirements.map((r) => r.id)).size, 345);

  const baseline = ledger.requirements.filter((r) => r.level <= 2);
  assert.equal(baseline.length, 253);
  assert.equal(baseline.filter((r) => r.status === "UNMAPPED").length, 208);
  assert.equal(baseline.filter((r) => r.status === "SCOPING_REQUIRED").length, 45);

  for (const r of ledger.requirements) {
    assert.ok(["UNMAPPED","SCOPING_REQUIRED","DEFERRED_LEVEL3","PASS","PARTIAL","BLOCKED","NOT_APPLICABLE"].includes(r.status));
    if (r.status === "PASS") assert.ok(r.evidence.length > 0, "PASS without evidence: " + r.id);
  }
});
