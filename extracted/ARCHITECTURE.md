# MVU Game Maker — card source architecture

The shipped product is `dist/index.html` (a minified Vue app) with the entire MVU character
card embedded as one JSON object. That JSON is **not** edited by hand. Instead it is defined by
the readable source in this `extracted/` tree and composed/patched back by the tools in `tools/`.

## The pieces

| File / dir | What it is |
|---|---|
| `extracted/lorebook/*.txt` | One file per World-Info entry (the rules/prompt text). |
| `extracted/gui/*.html\|.txt` | One file per SillyTavern regex script (GUI panels + display/hide rules). |
| `extracted/scripts/*.js`, `extracted/schema/*.js` | Tavern Helper runtime scripts and Zod schema registration. |
| `extracted/manifest.json` | **The card, declaratively.** The full card structure with every content field replaced by a `{ $file, prefix, suffix, finalNewline }` reference. This is the source of truth for *what is in the card and how it is configured* (entry order, `constant`, `position`, keys, regex placement, script `enabled`, …). |
| `extracted/sourcemap.json` | Machine map (file → card location) used by the patch-based embedder. |
| `extracted/card.json` | Convenience: the fully-inlined card (base64 elided) for reading/grep. |

## The tools

- `tools/extract-bundle.mjs` — parse the card out of `dist/index.html` into the files above
  (+ `manifest.json`, `sourcemap.json`). Idempotent.
- `tools/build-card.mjs` — **compose** the card from `manifest.json` + source files and assert it
  is deep-equal to the card currently in `dist/index.html`. This proves the manifest + files are a
  complete, faithful definition (zero drift). Run it after any structural change.
- `tools/embed-bundle.mjs` — **deliver**: patch changed content values back into `dist/index.html`
  with byte-minimal diffs (no-op rebuild is byte-identical). `--check` verifies the round-trip.
- `tools/verify-gui-lifecycle.mjs` — regression guard for the Stage-1a GUI render-lifecycle invariants.

## Editing workflow (today)

1. Edit the relevant file(s) in `extracted/` (rule text, GUI script, schema, …).
2. `node tools/build-card.mjs` — confirm the manifest still composes (catches a stale/incomplete manifest).
3. `node tools/embed-bundle.mjs` — write the change into `dist/index.html`.
4. Commit **both** the source edits and the rebuilt `dist/index.html`.

## A subsystem = a module (direction)

`manifest.json` makes each subsystem's footprint explicit: its schema fragment, its rule entries
(with activation metadata), its GUI panel, and its update hooks are all addressable in one place.
The `[RPG]` / `[Love]` / `[Share]` comment tags act as genre selectors; `[Share]` is the spine
shared by both genres.

**Roadmap (incremental, each verified by `build-card.mjs` deep-equal so behavior never changes
unless intended):**
- Group the flat manifest into per-subsystem module objects (schema fragment + rules + predicate +
  panel + hooks) so adding a feature is one self-contained addition.
- Teach `embed-bundle.mjs` to insert *new* entries/scripts (not just patch existing ones), so a new
  module reaches `dist/` end-to-end.
- Unify the GUI render lifecycle (Stage 1a) into one shared snippet driven by a `registerPanel(...)`
  host, so panels stop duplicating it.
- Single-source the stat schema (Zod ↔ prose) to end the duplication across `rpg-scheme.js`,
  `rpg-schema-syntax.txt`, the GUI, and the recompute.
