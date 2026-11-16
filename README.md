# research-citation

Canonical home of the `research-citation/1.0.0` contract. It is a JSON Schema plus fixtures shared by four independent research MCP servers (mcp-wol, mcp-archiveorg, mcp-scaife, mcp-stepbible).

There's no runtime code here. Each server vendors a copy into its `contract/` directory and checks the SHA-256 hashes in `contract/MANIFEST.json` in its own tests.

- [`citation.schema.json`](citation.schema.json): the schema.
- [`CITATION_CONTRACT.md`](CITATION_CONTRACT.md): every field, with one example each; the rules; how citations travel in tool output.
- [`fixtures/`](fixtures): cross-server fixtures.
- [`mappings/osis-cts.json`](mappings/osis-cts.json): OSIS book ↔ CTS work for the Greek NT and the Septuagint on Scaife, with versification caveats. Perseus/Scaife and STEPBible use it to accept each other's references.

```sh
npm ci
npm run validate      # all fixtures valid, negative cases rejected
npm run sync          # copy into ../mcp-wol ../mcp-archiveorg ../mcp-scaife ../mcp-stepbible
npm run check         # validate + fail if any server's copy differs
```

To change the contract:
1. Edit the schema and doc, and bump the version in `title`, `$id` and `SchemaTag`.
2. Run `npm run sync`.
3. Open one PR per server repo, each stating the version it implements.
