import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const files = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean);

const forbiddenPathPatterns = [
  /^(?:cloud|enterprise)(?:\/|$)/i,
  /^packages\/(?:cloud|enterprise)(?:\/|$)/i,
  /^apps\/(?:cloud|enterprise)(?:\/|$)/i,
  /^services\/(?:cloud|enterprise)(?:\/|$)/i,
];

const forbiddenImportPatterns = [
  /(?:from|import)\s*["'][^"']*(?:vibedb-cloud|vibedb-enterprise|\/cloud(?:\/|["'])|\/enterprise(?:\/|["']))/i,
  /require\(\s*["'][^"']*(?:vibedb-cloud|vibedb-enterprise)/i,
];

const pathViolations = files.filter((file) => forbiddenPathPatterns.some((pattern) => pattern.test(file)));
if (pathViolations.length) {
  console.error("OSS boundary violation: private Cloud/Enterprise path found:");
  for (const file of pathViolations) console.error(" - " + file);
  process.exit(1);
}

const sourceExtensions = /\.(?:mjs|cjs|js|ts|tsx|jsx)$/i;
const importViolations = [];
for (const file of files.filter((f) => sourceExtensions.test(f))) {
  const content = readFileSync(file, "utf8");
  if (forbiddenImportPatterns.some((pattern) => pattern.test(content))) {
    importViolations.push(file);
  }
}

if (importViolations.length) {
  console.error("OSS boundary violation: Core source references Cloud/Enterprise modules:");
  for (const file of importViolations) console.error(" - " + file);
  process.exit(1);
}

console.log("OSS boundary audit passed for " + files.length + " tracked files.");
