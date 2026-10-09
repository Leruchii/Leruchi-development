import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const tracked = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean);

const failures = [];
const productFacingFiles = [
  "README.md",
  "apps/studio/app/layout.tsx",
  "apps/studio/app/page.tsx",
  "packages/vibe-cli/README.md",
  "packages/vibe-sdk/README.md",
  "packages/mcp-server/README.md",
  "packages/agent-intent/README.md",
  "packages/context-ir/README.md",
  "packages/context-resolution/README.md",
  "knowledge/mcp.md",
  "knowledge/decisions/bidirectional-mcp-developer-first.md",
  "infra/docker/postgres/Dockerfile",
  "packages/context-ir/v1.schema.json",
  "packages/retrieval-ir/v1.schema.json",
  "packages/agent-intent/v1.schema.json",
];

for (const file of productFacingFiles) {
  const content = readFileSync(file, "utf8");
  if (file.endsWith(".schema.json")) {
    const schema = JSON.parse(content);
    if (/\bVibeDB\b/i.test(String(schema.title ?? ""))) {
      failures.push(file + ": schema title contains legacy product branding");
    }
  } else if (/\bVibeDB\b/.test(content)) {
    failures.push(file + ": legacy product branding remains in an active product-facing surface");
  }
}

for (const file of tracked.filter((path) => path.endsWith("package.json"))) {
  const pkg = JSON.parse(readFileSync(file, "utf8"));
  if (typeof pkg.name === "string" && pkg.name.startsWith("@vibeplatform/")) {
    failures.push(file + ": package namespace must use @leruchi/*");
  }
}

for (const file of tracked.filter((path) => path.startsWith(".github/workflows/") && path.endsWith(".yml"))) {
  const content = readFileSync(file, "utf8");
  for (const line of content.split("\n")) {
    if (/^\s*(?:name:|-\s*name:).*\bVibeDB\b/i.test(line)) {
      failures.push(file + ": workflow display name contains legacy product branding: " + line.trim());
    }
  }
}

const studioPage = readFileSync("apps/studio/app/page.tsx", "utf8");
const studioLayout = readFileSync("apps/studio/app/layout.tsx", "utf8");
if (!studioPage.includes("<span>Leruchi</span>")) failures.push("Studio header must display Leruchi");
if (!studioLayout.includes("Leruchi Graph Studio")) failures.push("Studio metadata must identify Leruchi Graph Studio");

if (failures.length) {
  console.error("Leruchi brand audit failed:");
  for (const failure of failures) console.error(" - " + failure);
  process.exit(1);
}

console.log("Leruchi brand audit passed.");
console.log("Checked product-facing files, package namespaces and workflow display names.");
