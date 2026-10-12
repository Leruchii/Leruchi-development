import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('public development repository visibility is not an OSS publication blocker', () => {
  const agents = read('../../AGENTS.md');
  const identity = read('../../PRODUCT_IDENTITY.md');
  const boundary = read('../../knowledge/decisions/public-oss-repository-boundary.md');
  const decision = read('../../knowledge/decisions/development-repository-visibility-release-policy.md');

  assert.match(agents, /Leruchii\/Leruchi-development.*not, by itself, a security defect or a blocker to publishing/i);
  assert.match(agents, /public visibility of `Leruchi-development` is explicitly not a gate/i);
  assert.match(identity, /public.*not a release blocker/i);
  assert.match(boundary, /visibility is not, by itself, a release blocker/i);
  assert.match(decision, /FINAL OWNER DECISION — ADOPTED/);
  assert.doesNotMatch(agents, /If either development or internal control repositories are public when intended to be private, stop merge\/publication actions/);
});
