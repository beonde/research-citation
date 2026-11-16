# Research citation contract — `research-citation/1.0.0`

One citation format shared by four independent MCP servers:

| Server | Owns | IDs it fills in |
| --- | --- | --- |
| Watchtower Library (mcp-wol) | Watchtower publications 1950–present, NWT, Kingdom Interlinear | `ids.wol`, plus `ids.osis` for scripture it resolves |
| archiveorg (mcp-archiveorg) | Internet Archive scans, OCR, page images, quote verification | `ids.archive`, `verification` |
| Perseus/Scaife (mcp-scaife) | Greek and Latin texts, LXX, patristics, Philo | `ids.cts_urn`, plus `ids.osis` for its own NT/LXX URNs |
| STEPBible (mcp-stepbible) | Hebrew OT and Greek NT editions, lexicons, concordance | `ids.osis`, `ids.strongs` |

**The contract is the data format only.** No server calls another, imports another's code, or knows another exists. The agent carries a citation from one server's output to another server's input.

Schema: [`citation.schema.json`](citation.schema.json) (JSON Schema draft 2020-12). Each server vendors an identical copy in `contract/` with a `MANIFEST.json` of SHA-256 hashes, and a test fails if the copy drifts.

## Rules

1. Every field in `ids` is optional. A server fills in only the IDs it owns and never guesses another server's IDs.
2. `cited_in` nests one level only. It says where this citation was found (a WOL article quoting a book). A `cited_in` cannot have its own `cited_in`.
3. `quote` is verbatim from the citing document, with ellipses kept as printed. Enclosing quotation marks are dropped and inner ones are kept. Use `null` when the quoted span is unclear.
4. `verification` is written only by a server that actually checked something. Without it, the citation is unchecked.
5. OSIS references use `Book.Chapter.Verse`: `John.1.1`, a range like `Prov.8.22-Prov.8.25`, or a chapter like `Ps.83`.
6. Precision over recall. A missed citation is acceptable; a wrong author/title pairing is not.
7. Version tag: every citation carries `"schema": "research-citation/1.0.0"`. Additions that are backwards compatible bump the minor version; anything else bumps the major.

## Fields

Each field below has one example.

### `schema` (required)
The contract version: `"research-citation/1.0.0"`.

### `source` (required): the work cited
| Field | Type | Example |
| --- | --- | --- |
| `kind` | `book` \| `article` \| `periodical` \| `bible` \| `ancient_text` \| `lexicon` \| `web` | `"book"` |
| `title` | string | `"Introduction to Sahidic Coptic"` |
| `author` | string \| null | `"Thomas O. Lambdin"` |
| `editor` | string \| null | `"Brooke Foss Westcott; Fenton John Anthony Hort"` |
| `year` | integer \| null | `1899` |
| `edition` | string \| null | `"perseus-grc2"` |
| `publisher` | string \| null | `"Watch Tower Bible & Tract Society"` |
| `volume` | string \| null | `"V"` |

Only `kind` and `title` are required. Leave unknown fields `null` (or omit them) rather than guessing.

### `locator` (required): where inside the source
| Field | Type | Example |
| --- | --- | --- |
| `kind` | `page` \| `leaf` \| `paragraph` \| `section` \| `verse` \| `column` \| `none` | `"page"` |
| `value` | string (empty when `kind` is `none`) | `"451"` |
| `end` | string \| null, the last page/verse of a range | `"25"` |

- `verse` values are OSIS (`"John.1.1"`).
- `section` values are CTS passage references (`"1.1"`).
- `paragraph` values for WOL are the printed paragraph number (`"8"`), or `"p<id>"` when the article has no printed numbers. `p<id>` is the WOL paragraph id, the same as the `#p5` URL anchor.

### `quote`
A verbatim string or `null`. Example: `"The use of the Coptic articles, both definite and indefinite, corresponds closely to the use of the articles in English."`

### `quote_language`
A BCP-47 tag or `null`. Example: `"en"`, `"grc"`, `"la"`.

### `cited_in`
A Citation (one level only) or `null`. Example: the WOL article that quotes the book. WOL describes the article itself (`kind: "article"`, the article title); the publication is identified by `ids.wol.symbol` and `docId`:
```json
{ "schema": "research-citation/1.0.0",
  "source": { "kind": "article", "title": "Was the Word “God” or “a god”?", "year": 2008 },
  "locator": { "kind": "paragraph", "value": "p5" },
  "ids": { "wol": { "docId": "2008812", "par": "p5", "symbol": "w08" } } }
```

### `ids`
| Field | Owner | Example |
| --- | --- | --- |
| `wol.docId` / `wol.par` / `wol.symbol` | WOL | `{ "docId": "502300113", "par": "8", "symbol": "ijwbv" }` |
| `archive.identifier` / `archive.leaf` / `archive.page` | archiveorg | `{ "identifier": "studiesinscriptu0000unse_t3s7", "leaf": 74, "page": "70" }` |
| `cts_urn` | Perseus/Scaife | `"urn:cts:greekLit:tlg0031.tlg004.perseus-grc2:1.1"` |
| `osis` | STEPBible (and WOL/Scaife for references they resolve themselves) | `"John.1.1"` |
| `strongs` | STEPBible | `["G2316"]`. STEPBible emits four-digit padding (`G0746`), and an extended letter suffix is allowed (`H1254A`). |

- `archive.leaf` is the scan's leaf number, which is the Archive's page index.
- `archive.page` is the printed page number on that leaf.

### `verification`
| Field | Values | Example |
| --- | --- | --- |
| `status` | `unchecked` \| `verbatim` \| `close` \| `differs` \| `not_found` \| `no_scan` | `"verbatim"` |
| `method` | `page_image` \| `ocr` \| `primary_text` \| `none` | `"ocr"` |
| `checked_by` | server name (`wol`, `archiveorg`, `scaife`, `stepbible`) | `"archiveorg"` |
| `note` | string \| null | `"Matched in the Archive's OCR text of leaf 74 (printed page 70); page image not read."` |

`method` must be honest:
- `ocr` when only OCR text was compared.
- `page_image` only when a page image was actually read.
- `primary_text` when compared against a digital edition (a Perseus or STEPBible text).

## How citations travel in tool output

Every tool that emits citations takes an optional `citations` parameter: `"none" | "compact" | "full"` (default `"compact"`).

- **`structuredContent.citations`** carries the full Citation objects, unless the mode is `none`.
- **Text block.** The Markdown output ends with exactly one fenced block tagged `json citations`, always placed **last**. To strip it, cut from the last "```json citations" line to the end.
  - `compact`: a `CompactEnvelope`. Sources are listed once under a key. Each hit carries only the source key, its locator and its IDs (plus `quote` and `status` where the server has them). Example:
    ```json
    {"schema":"research-citation/1.0.0",
     "sources":{"s1":{"kind":"bible","title":"Translators Amalgamated Greek NT (TAGNT)"}},
     "hits":[{"src":"s1","loc":{"kind":"verse","value":"John.1.1"},"osis":"John.1.1","strongs":["G2316"]}]}
    ```
  - `full`: a `FullEnvelope`, `{"schema": …, "citations": [ …full Citation objects… ]}`, for clients that drop `structuredContent` or when building an audit table.
  - `none`: no block and no `structuredContent.citations`.
- Only hits actually shown are included, never ones cut by `maxHits`, `limit`, paging or `maxChars`.

## Accepting citations

A server that can act on a citation accepts it as an optional `citation` input. It reads the fields it understands and ignores IDs it does not own. It must not fail because another server's ID is present.

Per-server details, including which tools emit and which accept, are in each server repo's own `CITATION_CONTRACT.md`.

## Shared fixtures (`fixtures/`)

| File | Direction |
| --- | --- |
| `wol-lambdin-2008812.json` | WOL → archive: Lambdin, *Introduction to Sahidic Coptic*, quoted in w08 11/1 |
| `wol-translators-nt-502300113-p8.json` | WOL → archive: *The Translator’s New Testament* p. 451, quoted in ijwbv article 12 ¶8 |
| `archive-series5-leaf74-verified.json` | archive → (none): *Studies in the Scriptures* Series V, leaf 74, verified |
| `john-1-1-osis-cts.json` | STEPBible ↔ Perseus: John 1:1 as `osis` and `cts_urn` |
| `compact-envelope-example.json` | Example of the compact text block |

Every server repo vendors these and round-trips them in its own tests, without live calls to other servers.
