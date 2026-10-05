import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const manifest = JSON.parse(readFileSync(new URL("../OSS_EXPORT_MANIFEST.json", import.meta.url), "utf8"));
const files = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" }).split("\0").filter(Boolean);

const globToRegExp = (glob) => new RegExp("^" + glob
  .replace(/[.+^$(){}|[\]\\]/g, "\\$&")
  .replace(/\*\*/g, "§DOUBLE§")
  .replace(/\*/g, "[^/]*")
  .replace(/§DOUBLE§/g, ".*") + "$");

const includes = manifest.include.map(globToRegExp);
const excludes = manifest.exclude.map(globToRegExp);

const publicFiles = files.filter((file) => includes.some((r) => r.test(file)));
const excludedMatches = files.filter((file) => excludes.some((r) => r.test(file)));
const leaked = excludedMatches.filter((file) => publicFiles.includes(file));

if (leaked.length) {
  console.error("OSS export contract violation:");
  for (const file of leaked) console.error(" - " + file);
  process.exit(1);
}

console.log("OSS export contract passed.");
console.log("Tracked files:", files.length);
console.log("Export-eligible files:", publicFiles.length);
