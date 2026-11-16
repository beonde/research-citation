// Copies the schema, base contract doc and fixtures into each server repo's contract/ directory,
// and writes contract/MANIFEST.json (version + sha256 of every file) that each repo's test checks.
//   node scripts/sync.mjs           copy into ../mcp-wol ../mcp-archiveorg ../mcp-scaife ../mcp-stepbible
//   node scripts/sync.mjs --check   fail if any repo's copy differs
//   node scripts/sync.mjs --to DIR  copy into one repo only
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const schema = JSON.parse(readFileSync(join(root, "citation.schema.json"), "utf8"));
const version = schema.title; // "research-citation/1.0.0"
const args = process.argv.slice(2);
const check = args.includes("--check");
const to = args.includes("--to") ? [resolve(args[args.indexOf("--to") + 1])] : undefined;
const repos = to ?? ["mcp-wol", "mcp-archiveorg", "mcp-scaife", "mcp-stepbible"].map((r) => resolve(root, "..", r));

const files = {
    "citation.schema.json": readFileSync(join(root, "citation.schema.json")),
    "CONTRACT.md": readFileSync(join(root, "CITATION_CONTRACT.md")),
};
for (const f of readdirSync(join(root, "fixtures")).filter((f) => f.endsWith(".json"))) {
    files[`fixtures/${f}`] = readFileSync(join(root, "fixtures", f));
}
for (const f of readdirSync(join(root, "mappings")).filter((f) => f.endsWith(".json"))) {
    files[`mappings/${f}`] = readFileSync(join(root, "mappings", f));
}
const sha = (b) => createHash("sha256").update(b).digest("hex");
const manifest = {
    version,
    note: "Vendored from github.com/beonde/research-citation. Do not edit; run its scripts/sync.mjs.",
    files: Object.fromEntries(Object.entries(files).map(([k, v]) => [k, sha(v)])),
};
const manifestText = `${JSON.stringify(manifest, null, 2)}\n`;

let bad = 0;
for (const repo of repos) {
    if (!existsSync(repo)) {
        console.warn(`- skip ${repo} (not found)`);
        continue;
    }
    const dir = join(repo, "contract");
    const all = { ...files, "MANIFEST.json": Buffer.from(manifestText) };
    for (const [name, body] of Object.entries(all)) {
        const target = join(dir, name);
        if (check) {
            if (!existsSync(target) || !readFileSync(target).equals(body)) {
                bad++;
                console.error(`✗ ${target} differs from ${version}`);
            }
        } else {
            mkdirSync(dirname(target), { recursive: true });
            writeFileSync(target, body);
        }
    }
    if (!check) console.log(`✓ ${repo}/contract ← ${version}`);
}
if (check) {
    if (bad) process.exit(1);
    console.log(`✓ all copies match ${version}`);
}
