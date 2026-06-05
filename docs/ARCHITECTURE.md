# MVU Game Maker — card source architecture

The shipped product is `dist/index.html` (a minified Vue app) with the entire MVU character
card embedded as one JSON object. That JSON is **not** edited by hand. Instead it is defined by
the readable source in the `extracted/` tree and composed/patched back by the tools in `tools/`.

> ⚠️ `extracted/` is **regenerated** by `tools/extract-bundle.mjs` (it wipes and rewrites the
> directory from `dist/index.html`). Don't keep hand-authored files there — authored docs live in
> `docs/`. Edit the per-subsystem source files and `manifest.json`, then **embed** (don't re-extract,
> which would resync from `dist` and discard un-embedded edits).

## The pieces

| File / dir | What it is |
|---|---|
| `extracted/lorebook/*.txt` | One file per World-Info entry (the rules/prompt text). |
| `extracted/gui/*.html\|.txt` | One file per SillyTavern regex script (GUI panels + display/hide rules). |
| `extracted/scripts/*.js`, `extracted/schema/*.js` | Tavern Helper runtime scripts and Zod schema registration. |
| `extracted/manifest.json` | **The card, declaratively.** The full card structure with every content field replaced by a `{ $file, prefix, suffix, finalNewline }` reference. Source of truth for *what is in the card and how it is configured* (entry order, `constant`, `position`, keys, regex placement, script `enabled`, …). |
| `extracted/sourcemap.json` | Machine map (file → card location) used by the patch-based embedder. |
| `extracted/card.json` | Convenience: the fully-inlined card (base64 elided) for reading/grep. |

## The tools

- `tools/extract-bundle.mjs` — parse the card out of `dist/index.html` into the files above
  (+ `manifest.json`, `sourcemap.json`). Idempotent. **Wipes and rewrites `extracted/`.**
- `tools/build-card.mjs` — **compose** the card from `manifest.json` + source files and assert it
  is deep-equal to the card currently in `dist/index.html`. Proves the manifest + files are a
  complete, faithful definition. Run after any change; a mismatch means "not yet shipped" or drift.
- `tools/embed-bundle.mjs` — **deliver**: write source changes into `dist/index.html`. It
  content-patches existing items with byte-minimal diffs (no-op rebuild is byte-identical) **and
  inserts new entries/scripts** that exist in the manifest but not yet in the live card. `--check`
  verifies the round-trip without writing.
- `tools/verify-gui-lifecycle.mjs` — regression guard for the Stage-1a GUI render-lifecycle invariants.

## Editing an existing rule / script / panel

1. Edit the file in `extracted/` (rule text, GUI script, schema, …).
2. `node tools/embed-bundle.mjs` — write the change into `dist/index.html`.
3. `node tools/build-card.mjs` — confirm the composed card matches the shipped card.
4. Commit **both** the source edit and the rebuilt `dist/index.html`.

## Adding a new module (feature) — end to end

1. Create the content file(s), e.g. `extracted/lorebook/rpg-my-feature.txt` (and/or a GUI/script file).
2. Add the item to `extracted/manifest.json` in the right array
   (`character_book.entries`, `extensions.regex_scripts`, or `extensions.tavern_helper.scripts`) with:
   - a **unique `id`** (this is how the embedder detects it's new),
   - its activation metadata (for a WI entry: `comment` with a `[RPG]`/`[Love]`/`[Share]` tag,
     `constant`, `position`, `insertion_order`, `keys`, …),
   - `content` (or `replaceString`) set to a `{ "$file": "lorebook/rpg-my-feature.txt", "prefix": "",
     "suffix": "", "finalNewline": true }` reference.
3. `node tools/embed-bundle.mjs` — it inserts the new item into `dist/index.html` (reports
   `item(s) added`).
4. `node tools/build-card.mjs` — confirms `dist` now matches the manifest exactly.
5. Smoke-test in SillyTavern, then commit source + `dist/index.html`.

**Current limitation:** the embedder handles content edits to existing items and **additions** of new
items. Changing an *existing* item's metadata (e.g. toggling `constant`/`position`) is not wired yet —
the deep-equal guard fails loudly rather than silently mis-shipping, so it's safe; that capability is a
planned follow-on.

## A subsystem = a module (direction)

`manifest.json` makes each subsystem's footprint explicit. The `[RPG]` / `[Love]` / `[Share]` comment
tags act as genre selectors; `[Share]` is the spine shared by both genres.

**Roadmap (each verified by `build-card.mjs` deep-equal, so behavior never changes unless intended):**
- Group the flat manifest into per-subsystem module objects (schema fragment + rules + predicate +
  panel + hooks) so a feature is one self-contained addition.
- Unify the GUI render lifecycle (Stage 1a) into one shared snippet driven by a `registerPanel(...)`
  host, so panels stop duplicating it.
- Single-source the stat schema (Zod ↔ prose) to end the duplication across `rpg-scheme.js`,
  `rpg-schema-syntax.txt`, the GUI, and the recompute.
- Wire existing-item metadata edits (constant/position/enabled) through the embedder.
