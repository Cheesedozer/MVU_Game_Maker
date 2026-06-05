#!/usr/bin/env node
/**
 * verify-schema-consistency.mjs — single-source-of-truth guard for the derived-stat contract.
 *
 * The RPG derived stats are described in four places that must agree, or the system drifts
 * (the exact "edit 4 places" bug class this guards against):
 *   1. the recompute script  (extracted/schema/rpg-scheme.js, recomputeCharDerived)
 *   2. the GUI                (extracted/gui/rpg-statusmenu.html, recalculateDerivedStats)
 *   3. the emit contract      (extracted/lorebook/rpg-output-syntax.txt, "DO NOT EMIT" list)
 *   4. the schema reference   (extracted/lorebook/rpg-schema-syntax.txt, derived NOTE)
 *
 * This asserts: the script's and GUI's derived-stat sets are *identical* (they must compute the
 * same fields), and the prompt text in (3) and (4) lists *all* of them. Drift fails the build.
 *
 * It does NOT rewrite any AI-facing prose (that would be a risky behavior change) — it verifies.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

// Derived = computed max/atk/def fields (exclude the *_curr resources, which are AI-owned).
const isDerived = (n) => !/_curr$/.test(n);
const setEq = (a, b) => a.size === b.size && [...a].every((x) => b.has(x));

// (1) recompute script: set('<Field>', …) within recomputeCharDerived
function scriptDerived() {
  const s = read('extracted/schema/rpg-scheme.js');
  const body = s.slice(s.indexOf('function recomputeCharDerived'), s.indexOf('function onRpgVariableUpdateEnded'));
  const names = [...body.matchAll(/\bset\(\s*c\s*,\s*'([A-Za-z_]+)'/g)].map((m) => m[1])
    .concat([...body.matchAll(/_setN\(\s*c\s*,\s*'([A-Za-z_]+)'/g)].map((m) => m[1]));
  // the helper used in recomputeCharDerived is `_setN(c, 'X', …)`
  return new Set(names.filter(isDerived));
}

// (2) GUI: setVal(charObj, '<Field>', …) within recalculateDerivedStats
function guiDerived() {
  const s = read('extracted/gui/rpg-statusmenu.html');
  const start = s.indexOf('recalculateDerivedStats = function');
  const body = s.slice(start, start + 3000);
  const names = [...body.matchAll(/setVal\([^,]+,\s*'([A-Za-z_]+)'/g)].map((m) => m[1]);
  return new Set(names.filter(isDerived));
}

const failures = [];
const script = scriptDerived();
const gui = guiDerived();

if (script.size === 0 || gui.size === 0) failures.push(`could not extract derived sets (script=${script.size}, gui=${gui.size})`);
if (!setEq(script, gui)) failures.push(`script vs GUI derived-stat sets differ:\n    script: ${[...script].sort().join(', ')}\n    gui:    ${[...gui].sort().join(', ')}`);

// (3)/(4) prose must mention every derived stat
const outSyntax = read('extracted/lorebook/rpg-output-syntax.txt');
const schemaSyntax = read('extracted/lorebook/rpg-schema-syntax.txt');
for (const name of script) {
  if (!outSyntax.includes(name)) failures.push(`rpg-output-syntax.txt does not mention derived stat ${name}`);
  if (!schemaSyntax.includes(name)) failures.push(`rpg-schema-syntax.txt does not mention derived stat ${name}`);
}
// the emit contract must actually forbid emitting them
if (!/DO NOT EMIT/i.test(outSyntax)) failures.push(`rpg-output-syntax.txt missing the "DO NOT EMIT" derived-stat rule`);

if (failures.length) {
  console.error('Schema/derived-stat consistency FAILED:');
  for (const m of failures) console.error('  ✗ ' + m);
  process.exit(1);
}
console.log(`✓ Derived-stat contract consistent across script, GUI, and prompt text: ${[...script].sort().join(', ')}`);
