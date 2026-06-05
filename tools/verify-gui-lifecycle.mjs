#!/usr/bin/env node
/**
 * verify-gui-lifecycle.mjs — regression guard for the Stage 1a GUI render-lifecycle fix.
 *
 * The original panels leaked a VARIABLE_UPDATE_ENDED handler (and a 2s setInterval) onto
 * the shared parent window on every iframe re-creation, rendered non-idempotently, and the
 * level-up panel blind-polled 30x. This checks, by static analysis of the extracted panel
 * source, that the hardened invariants hold so the leak can't silently return.
 *
 * Dependency-free (no jsdom): asserts structure, not runtime behavior. Exits non-zero on
 * any failure.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const GUI = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'extracted', 'gui');
const read = (f) => fs.readFileSync(path.join(GUI, f), 'utf8');
const count = (s, re) => (s.match(re) || []).length;

const failures = [];
const check = (cond, msg) => { if (!cond) failures.push(msg); };

// Status panels: exactly one subscription, deduped + torn down, idempotent, no leaked interval.
for (const f of ['rpg-statusmenu.html', 'love-statusmenu.html']) {
  const s = read(f);
  check(count(s, /eventOn\(/g) === 1, `${f}: expected exactly 1 eventOn() call, found ${count(s, /eventOn\(/g)}`);
  check(/eventRemoveListener\(/.test(s), `${f}: missing eventRemoveListener (dedupe of prior handler)`);
  check(/addEventListener\('pagehide'/.test(s), `${f}: missing pagehide teardown`);
  check(/clearInterval\(/.test(s), `${f}: missing clearInterval (interval must not leak)`);
  check(/renderIfChanged\(/.test(s), `${f}: missing idempotent renderIfChanged gate`);
  check(/isStatDataReady\(/.test(s), `${f}: missing isStatDataReady readiness gate`);
  check(!/const isDifferent = JSON\.stringify/.test(s), `${f}: old full-object dirty-check still present`);
}

// Level-up panel: event-then-render, deduped + torn down, blind 30x retry removed.
{
  const f = 'rpg-leveluppanel.html', s = read(f);
  check(!/retryCount\s*<\s*30/.test(s), `${f}: blind 'retryCount < 30' retry still present`);
  check(/eventOn\(/.test(s) && /eventRemoveListener\(/.test(s), `${f}: missing event subscription/teardown`);
  check(/addEventListener\('pagehide'/.test(s), `${f}: missing pagehide teardown`);
}

// The two status panels share one render lifecycle — keep them in sync (fix once, not twice).
// They must be byte-identical from "// --- MVU Event Logic" through initMvuConnection, modulo
// the per-panel handler key. An edit to one that isn't mirrored to the other fails here.
function lifecycleBlock(f) {
  const s = read(f);
  const a = s.indexOf('// --- MVU Event Logic (Native) ---');
  const b = s.indexOf('return initialStat;', a);
  if (a < 0 || b < 0) return null;
  const end = s.indexOf('};', b) + 2;
  return s.slice(a, end).replace(/__mzsmb(Rpg|Love)StatusHandler/g, '__H__');
}
{
  const r = lifecycleBlock('rpg-statusmenu.html'), l = lifecycleBlock('love-statusmenu.html');
  if (!r || !l) check(false, 'could not extract a status-panel lifecycle block for the sync check');
  else if (r !== l) {
    let i = 0; while (i < r.length && r[i] === l[i]) i++;
    failures.push(`rpg/love status-panel lifecycles diverged (first diff at offset ${i}) — mirror the edit to both`);
  }
}

if (failures.length) {
  console.error('GUI lifecycle verification FAILED:');
  for (const m of failures) console.error('  ✗ ' + m);
  process.exit(1);
}
console.log('✓ GUI lifecycle invariants hold (single deduped subscription, teardown, idempotent render, no blind retry) and the two status panels are in sync.');
