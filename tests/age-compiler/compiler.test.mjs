import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { compileAge } from "../../packages/compiler-age/index.mjs";

const fixture = JSON.parse(fs.readFileSync("packages/query-ir/fixtures/person-knows.json","utf8"));

test("compiles deterministic AGE prepared-statement SQL", () => {
  const result = compileAge(fixture);
  assert.equal(result.engine, "apache-age");
  assert.match(result.sql, /cypher\('vibe_stage01'/);
  assert.match(result.sql, /, \$1\) AS/);
  assert.match(result.cypher, /MATCH \(person:Person\)-\[:KNOWS\]->\(friend:Person\)/);
  assert.match(result.cypher, /WHERE person\.name = \$name/);
  assert.match(result.cypher, /RETURN person\.name AS name, friend\.name AS friend_name/);
  assert.deepEqual(result.literalBindings, {});
});

test("binds literal values instead of interpolating them", () => {
  const bad = structuredClone(fixture);
  bad.filters[0].value = "Alice'); DETACH DELETE person //";
  const result = compileAge(bad);
  assert.match(result.cypher, /WHERE person\.name = \$__vibe_literal_0/);
  assert.equal(result.literalBindings.__vibe_literal_0, "Alice'); DETACH DELETE person //");
  assert.ok(!result.cypher.includes("DETACH DELETE"));
});

test("rejects malicious identifiers", () => {
  const bad = structuredClone(fixture);
  bad.root.label = "Person) DETACH DELETE n //";
  assert.throws(() => compileAge(bad), /INVALID_IDENTIFIER/);
});

test("rejects duplicate output aliases", () => {
  const bad = structuredClone(fixture);
  bad.projection[1].alias = "name";
  assert.throws(() => compileAge(bad), /DUPLICATE_OUTPUT_ALIAS/);
});

test("compiles strict and inclusive comparison operators distinctly", () => {
  for (const [op, expected] of [["gt", ">"], ["gte", ">="], ["lt", "<"], ["lte", "<="]]) {
    const candidate = structuredClone(fixture);
    candidate.filters[0] = { field: "person.age", op, value: 18 };
    const result = compileAge(candidate);
    assert.ok(result.cypher.includes("person.age " + expected + " $__vibe_literal_0"));
  }
});

test("executes generated one-hop query against AGE", () => {
  const result = compileAge(fixture);
  const bindingMap = { name: "Alice" };
  const agtype = JSON.stringify(bindingMap).replaceAll("'", "''");
  const sql = [
    "PREPARE vibe_stage07(agtype) AS " + result.sql,
    "EXECUTE vibe_stage07('" + agtype + "'::agtype);",
    "DEALLOCATE vibe_stage07;"
  ].join("\n");
  const output = execFileSync("docker", ["compose","exec","-T","db","psql","-U","vibe_runtime","-d","leruchi","-X","-tA","-v","ON_ERROR_STOP=1"], { input: sql, encoding: "utf8" });
  assert.match(output, /Alice/);
  assert.match(output, /Bob/);
});
