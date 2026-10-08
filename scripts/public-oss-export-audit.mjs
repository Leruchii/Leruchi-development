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
const matchesInclude = (file) => includes.some((pattern) => pattern.test(file));
const matchesExclude = (file) => excludes.some((pattern) => pattern.test(file));

// Exclusions intentionally override broad includes such as tests/**.
// The previous audit ignored exclusions while calculating publicFiles, so any
// deliberate include/exclude overlap was incorrectly reported as a leak.
const publicFiles = files.filter((file) => matchesInclude(file) && !matchesExclude(file));
const excludedIncludeMatches = files.filter((file) => matchesInclude(file) && matchesExclude(file));
const forbiddenPublicPath = /^(?:AGENTS\.md|BUILD_(?:STATE|PLAN)\.md|NORTH_STAR\.md|OSS_BOUNDARY\.md|\.agents(?:\/|$)|\.claude(?:\/|$)|knowledge\/|prompts\/|\.github\/workflows\/|scripts\/audit-oss-boundary\.mjs$)/;
const leaked = publicFiles.filter((file) => forbiddenPublicPath.test(file));

if (leaked.length) {
  console.error("OSS export contract violation: private control paths are export-eligible:");
  for (const file of leaked) console.error(" - " + file);
  process.exit(1);
}

console.log("OSS export contract passed.");
console.log("Tracked files:", files.length);
console.log("Export-eligible files:", publicFiles.length);
console.log("Intentional include/exclude overlaps:", excludedIncludeMatches.length);
