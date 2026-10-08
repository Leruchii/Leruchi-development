import { execFileSync } from "node:child_process";
import { chmodSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
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

const trackedEntries = execFileSync("git", ["ls-files", "-s", "-z"], { cwd: sourceRoot, encoding: "utf8" })
  .split("\0").filter(Boolean).map((entry) => {
    const tab = entry.indexOf("\t");
    const metadata = entry.slice(0, tab).split(" ");
    return { file: entry.slice(tab + 1), mode: metadata[0] };
  });
const includes = manifest.include.map(globToRegExp);
const excludes = manifest.exclude.map(globToRegExp);
const selected = trackedEntries.filter(({ file }) => includes.some((r) => r.test(file)))
  .filter(({ file }) => !excludes.some((r) => r.test(file)))
  .sort((a, b) => a.file < b.file ? -1 : a.file > b.file ? 1 : 0);

for (const { file, mode } of selected) {
  if (mode === "120000") throw new Error("Symlinks are not allowed in the OSS candidate: " + file);
  if (mode !== "100644" && mode !== "100755") {
    throw new Error("Unsupported tracked file mode in OSS candidate: " + mode + " " + file);
  }
  const source = path.join(sourceRoot, file);
  const destination = path.join(outputRoot, file);
  mkdirSync(path.dirname(destination), { recursive: true });
  writeFileSync(destination, readFileSync(source));
  chmodSync(destination, mode === "100755" ? 0o755 : 0o644);
}
console.log("OSS candidate built.");
console.log("Selected files:", selected.length);
