# RPG Genre — Reliability & Extensibility Refactor (Design Proposal)

> Status: **Proposal for review** — no implementation has been performed yet.
> Scope: the **RPG genre** of MVU Game Maker, with the architecture designed to absorb the Love
> genre later. Must remain compatible with **Megumin Suite**, **ST-Prompt-Template**, and
> **Tavern Helper (JS-Slash-Runner)**.

## 1. Problem statement

Two reliability issues are reported in the field:

1. **Variables don't update correctly** — "the AI isn't reading the injected entries correctly."
2. **The GUI sometimes fails to load correctly.**

Goals for the refactor:

- **Efficiency** — fewer tokens per turn, achieving the same gameplay.
- **A better delivery method** than a pile of always-on `constant` lorebook entries (the user asked
  specifically whether ST-Scripts / Tavern Helper scripts could replace them).
- **Continued Megumin Suite compatibility.**
- **Enhanced extensibility** — add new features more easily, with fewer bugs.

## 2. How the RPG system actually works today

The RPG system is **not** a plain lorebook — it is a three-layer hybrid, all baked into the
minified `dist/index.html` generator and emitted into the exported character card:

| Layer | Mechanism | Role |
|---|---|---|
| **Rules** | ~30 `[RPG]` lorebook entries (`character_book.entries`), most `constant:true`, `position:"after_char"`, `insertion_order` ~820–835, `use_regex:true` | The game-system rules the AI must obey (battle, equipment, monster, healing, economy, familiar, journey, progression, …) |
| **Live state** | One entry, `[Share] CURRENT_VARIABLE_DATA` = `<CURRENT_VARIABLE_DATA>{{format_message_variable::stat_data}}</CURRENT_VARIABLE_DATA>` (an **ST-Prompt-Template** macro) | Renders the current `stat_data` object into the prompt each turn |
| **GUI** | **Tavern Helper** iframe scripts using `window.Mvu` (`getMvuData`, `parseMessage`, `eventOn(Mvu.events.VARIABLE_UPDATE_ENDED)`) | Renders the status menu / level-up panel / familiar portraits and re-renders on variable update |

The generator filters entries by genre tag (`[RPG]` / `[Love]` / `[Share]`) and merges them into the
card. Updates flow as the AI emitting `<UpdateVariable>` RFC-6902 JSONPatch over tuple-valued stats
(`[value, "Label"]`, e.g. `/stat_data/Mainchar/Hp_curr/0`); MVU parses → Zod-validates → persists →
fires `VARIABLE_UPDATE_ENDED` → the iframe re-renders.

**Key finding:** conditional injection is **completely unused** — there is not a single
`[GENERATE:*]`, `@@if`, `@INJECT`, or `getvar/setvar` in any entry. `{{format_message_variable}}`
appears exactly once. The full power of ST-Prompt-Template is on the table but untapped.

## 3. Root-cause analysis

### 3.1 "Variables don't update" → attention dilution
All ~30 rule blocks are present **every turn** (the README reports ~75k tokens/reply by reply 2000).
On any given turn most are irrelevant (e.g. monster/equipment/economy rules during a quiet dialogue
scene). The model spends its instruction-following budget parsing inert rules and then emits
malformed or partial JSONPatch. The bundle already contains a warning about numeric
"double-application" — direct evidence the **emit surface is too large** and that asking the AI to
maintain derived stats is itself a bug source.

### 3.2 "GUI doesn't load" → render race + non-idempotent render
Rendering is **time-triggered**, not **data-triggered**: a mix of `DOMContentLoaded`, `setTimeout`,
and `requestAnimationFrame`, plus a hand-rolled **retry loop capped at 30** and a single
`scriptInitialized` boolean guarding subscribe/unsubscribe. If `getMvuData` runs before MVU has
parsed the message, the fallback chain (chat → message → `message_id:-1`) lands on empty/stale data;
the poll masks rather than fixes the race; the boolean guard permits double-subscription and
wrong-`message_id` renders on swipes/regens → blank, flicker, or wrong-character panels.

## 4. Is "ST-Scripts / Tavern Helper instead of lorebook" the answer?

**Partly.** The right move is **not** "replace lorebook with scripts." It is:

- Keep the entries as the rule store, but make their **activation state-conditional** via
  ST-Prompt-Template, so only the relevant subsystem's rules are present each turn.
- Push more deterministic work into the **Tavern Helper** layer (recompute derived stats,
  validate/auto-repair patches, drive the GUI) so the AI has to emit less and can't corrupt state.

This delivers the efficiency *and* the reliability without discarding what works and without
breaking the Megumin contract.

## 5. The Megumin Suite contract (must not break)

Megumin injects an `[[MVU]]` output-format block at `injection_depth 1`, right after the thinking
block, containing `<StoryAnalysis>` / `<combat_calculation>` / `<gametxt>[[count]]</gametxt>` /
`<UpdateVariable>`. Its thinking-cleanup regex is deliberately scoped to **avoid** those XML tags.
Therefore the refactor must **not**:

- rename `StoryAnalysis`, `combat_calculation`, `gametxt`, or `UpdateVariable`;
- change the `[[count]]` word-count placeholder;
- move the `[[MVU]]` output-order position.

Stages 1a/1b below are independent of the Megumin prompt entirely. Stage 1c changes only **which
rules are present in context** (World-Info activation) — a different seam than **what the AI emits**.

## 6. Proposed approach (staged)

### Stage 1a — GUI reliability hardening *(ship first; zero prompt change)*
Make rendering **data-triggered and idempotent**:
- **One** `VARIABLE_UPDATE_ENDED` subscription; always `eventRemoveListener` before `eventOn`;
  tear down on iframe unload (kills double-subscription).
- **Event-then-render**, not poll-until-ready: if `stat_data` isn't ready, register the handler and
  let the event drive the first successful render; keep a single short bounded timeout only as a
  last resort.
- `isStatDataReady(data)` shape check (`Mainchar`, `World`, …) → render a stable loading skeleton
  instead of a half/empty panel.
- Idempotency: track `lastRenderedMessageId` + a data-version hash; re-render only on change.
- Keep the chat→message→`-1` fallback, but make it **explicit and logged**.

### Stage 1b — Update-contract hardening *(backward-safe; measurable lift)*
- **Shrink the emit surface:** the AI emits **only base-stat deltas**; *all* derived-stat
  computation (HP_max, attack, defense, …) moves into the Tavern Helper layer, recomputed
  deterministically on `VARIABLE_UPDATE_ENDED`. Removes the "double-application" bug class.
- **Compact schema reference:** replace verbose `Schema_Syntax` / `Update_Analysis_Detail` prose
  with a terse `path → type → tuple/scalar → example` table; keep the tuple convention and path
  shape exactly as today.
- **Validate + auto-repair** after `Mvu.parseMessage`: Zod-validate, auto-repair unambiguous
  malformations (tuple/scalar mismatch, clamp to bounds, refill label), recompute derived stats,
  and **surface** unrepairable failures in-GUI instead of silently corrupting state.
- **Telemetry:** per-turn success / repaired / failed counts.

### Stage 1c — Conservative state-conditional injection *(opt-in)*
Make entry **activation** state-dependent via ST-Prompt-Template. Three tiers:
- **Tier 0 — always-on core (stays `constant`):** `Output_Syntax`, `JSONPatch Format`,
  `Schema_Syntax`, `Update_Analysis_Detail`, `COT_Guide`, `Core Points`,
  `[Share] CURRENT_VARIABLE_DATA`. This is the contract the `[[MVU]]` block references — it must
  never lose its referent.
- **Tier 1 — state-gated subsystems (conservative set):** `Battle_System`, `Combat Calc`,
  `Encounter_guide`, `Monster_Guide`, `Familiar_System`, `Healing_System`, `Journey`. Gate via a
  single `World.Mode` state machine (`exploration | combat | dialogue | shop | levelup`) plus
  authoritative `stat_data` flags read with EJS — e.g. `Familiar` non-empty → familiar rules;
  `combatActive` → battle/combat/encounter rules. Pattern: title prefix `[GENERATE:AFTER]` + body
  wrapped in null-safe `<% if (variables.stat_data?.World?.combatActive) { %> …rules… <% } %>`.
- **Belt-and-suspenders:** keep each entry's existing `use_regex:true` keyword triggers as a
  fallback re-activation so a missed flag never silently drops a needed rule. Predicates bias toward
  over-inclusion; a **panic toggle** reverts all entries to `constant` for debugging.

Per the conservative choice, hard-gating of large Tier-2 reference tables is **deferred**, and any
core rule that is cheap to keep stays always-on.

### Stage 2 — Module/registry re-architecture *(extensibility)*
The generator app's unbuilt source is unavailable (the attached `index.html` is the minified build),
so begin by **extracting** the entries, Tavern Helper scripts, and schema out of the bundle into
clean per-module source. Then restructure so **a subsystem = one self-contained module** declaring:

1. **Zod schema fragment** — its slice of `stat_data`. The composed schema becomes the **single
   source of truth** for both runtime validation and the emitted card (no more schema duplicated
   across prose, GUI, and validator).
2. **Rule text + a declarative activation predicate** over `World.Mode` / flags (Stage-1c gating, now
   first-class metadata instead of ad-hoc EJS scattered per entry).
3. **GUI panel** registered via a host `registerPanel({ id, modeVisibleIn, isReady, render })`
   registry that drives every panel through the single Stage-1a lifecycle — eliminating per-panel
   race code by construction.
4. **Update hooks/validators** — per-subsystem derived recompute + auto-repair.

`[RPG]` / `[Love]` / `[Share]` tags become **module-manifest selectors**: a genre is an ordered set
of enabled modules; `[Share]` is the Tier-0 spine shared by both genres. **Adding a feature (or a
third genre) = adding a module and flipping it on — touching nothing else.** Emitted cards carry
`schemaVersion` / `mvuModuleVersion`; each module is semver'd. (Clean break = no migration of old
saves required.)

## 7. Migration, compatibility & verification

- **Clean break is acceptable**, so no back-compat machinery is required; the best architecture wins.
- Stages **1a/1b are backward-safe** and ship independently; **1c is opt-in**.
- **Verification metrics:**
  - **Tokens/turn** per game mode (exploration vs combat), before/after 1c — expect a large drop on
    non-combat turns (primary efficiency metric).
  - **Patch-parse success rate** (success/repaired/failed from 1b telemetry), before/after.
  - **GUI "failed first render" rate** before/after 1a (swipe / regen / cold-load cases).
  - End-to-end run in SillyTavern with ST-Prompt-Template + Tavern Helper **and Megumin Suite with
    MVU Compatibility enabled**: confirm `<UpdateVariable>` still parses, the GUI renders on first
    message and re-renders on update, and Megumin's thinking box behaves.
  - Tune auto-repair tolerances against the **lowest supported model (GLM-5.1)**, not just
    Gemini 3 Flash / Sonnet — shrinking context + emit should help weak models most.

## 8. Risks & tradeoffs

- **Conditional injection can hide a rule the AI needed** *(primary risk)*. Mitigations: Tier-0 spine
  stays always-on; `use_regex` keyword triggers as a safety net; predicates bias toward
  over-inclusion; opt-in + conservative rollout; a panic toggle.
- **More logic in the Tavern Helper layer.** But it is deterministic and unit-testable (unlike prompt
  behavior) — a net reliability win, and the module pattern keeps it isolated per subsystem.
- **Dependence on ST-Prompt-Template EJS correctness.** Mitigate with null-safe predicates and
  default-on for any predicate that errors.
- **Model-quality sensitivity** (README: Deepseek fails, GLM borderline). Shrinking context and emit
  should help the weak end most; validate there.
- **Megumin coupling is load-bearing.** Do not touch the tag names, `[[count]]`, or output-order
  position; any new emit-side tag must coordinate with Megumin's cleanup regex.

## 9. Open (non-blocking) questions

1. Where the Stage-2 authored-source module repo should live (a new `mvu-modules` repo vs. inside
   `MVU_Game_Maker`).
2. Whether to design the Stage-2 architecture to absorb **both** RPG and Love from day one
   (recommended — the `[Share]` spine is already cross-genre).

## 10. References

- SillyTavern docs — World Info, STscript, Extensions API, Regex:
  <https://docs.sillytavern.app/usage/core-concepts/worldinfo/>,
  <https://docs.sillytavern.app/usage/st-script/>,
  <https://docs.sillytavern.app/for-contributors/writing-extensions/>
- ST-Prompt-Template (EJS templating, conditional/regex injection): <https://codeberg.org/zonde306/ST-Prompt-Template/>
- JS-Slash-Runner / Tavern Helper (JS execution, `Mvu` API, events, iframe UI):
  <https://github.com/N0VI028/JS-Slash-Runner>, <https://n0vi028.github.io/JS-Slash-Runner-Doc/>
- MVU Zod Status Menu Builder: <https://github.com/KritBlade/MVU_Zod_StatusMenuBuilder>
