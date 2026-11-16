// Validates every fixture against citation.schema.json. No network, no runtime deps beyond ajv.
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const schema = JSON.parse(readFileSync(join(root, "citation.schema.json"), "utf8"));
const ajv = new Ajv2020({ allErrors: true, strict: true });
ajv.addSchema(schema);
const citation = ajv.getSchema(schema.$id);
const compact = ajv.getSchema(`${schema.$id}#/$defs/CompactEnvelope`);

let failed = 0;
const fail = (file, what, errors) => {
    failed++;
    console.error(`✗ ${file}: ${what}\n${JSON.stringify(errors, null, 2)}`);
};
for (const file of readdirSync(join(root, "fixtures")).filter((f) => f.endsWith(".json"))) {
    const fx = JSON.parse(readFileSync(join(root, "fixtures", file), "utf8"));
    for (const [i, c] of (fx.citations ?? []).entries()) {
        if (!citation(c)) fail(file, `citations[${i}]`, citation.errors);
    }
    if (fx.envelope && !compact(fx.envelope)) fail(file, "envelope", compact.errors);
    if (!fx.citations && !fx.envelope) fail(file, "no citations[] or envelope", []);
}

// Negative checks: the schema must reject these.
const lambdin = JSON.parse(readFileSync(join(root, "fixtures", "wol-lambdin-2008812.json"), "utf8")).citations[0];
const mustReject = {
    "two-level cited_in": { ...lambdin, cited_in: { ...lambdin.cited_in, cited_in: lambdin.cited_in } },
    "unknown top-level field": { ...lambdin, extra: 1 },
    "unknown id": { ...lambdin, ids: { isbn: "x" } },
    "bad osis": { ...lambdin, ids: { osis: "John 1:1" } },
    "bad status": { ...lambdin, verification: { ...lambdin.verification, status: "ok" } },
    "wrong schema tag": { ...lambdin, schema: "research-citation/2.0.0" },
};
for (const [name, doc] of Object.entries(mustReject)) {
    if (citation(doc)) fail("negative", `accepted ${name}`, []);
}

if (failed) process.exit(1);
console.log(`✓ schema ${schema.title}: all fixtures valid, ${Object.keys(mustReject).length} negative cases rejected`);
