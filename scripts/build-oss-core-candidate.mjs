import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const sourceRoot = path.resolve(process.argv[2] ?? ".");
const outputRoot = path.resolve(process.argv[3] ?? ".oss-core-candidate");
const manifest = JSON.parse(readFileSync(path.join(sourceRoot, "OSS_EXPORT_MANIFEST.json"), "utf8"));

function globToRegExp(glob) {
  return new RegExp("^" + glob
    .replace(/[.+^$(){}|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "§DOUBLE§")
    .replace(/\*/g, "[^/]*")
    .replace(/§DOUBLE§/g, ".*") + "$");
}

const files = execFileSync("git", ["ls-files", "-z"], { cwd: sourceRoot, encoding: "utf8" })
  .split("\0").filter(Boolean);
const includes = manifest.include.map(globToRegExp);
const excludes = manifest.exclude.map(globToRegExp);
const selected = files.filter((file) => includes.some((r) => r.test(file)))
  .filter((file) => !excludes.some((r) => r.test(file))).sort();

for (const file of selected) {
  const source = path.join(sourceRoot, file);
  const destination = path.join(outputRoot, file);
  mkdirSync(path.dirname(destination), { recursive: true });
  writeFileSync(destination, readFileSync(source));
}
console.log("OSS candidate built.");
console.log("Selected files:", selected.length);
