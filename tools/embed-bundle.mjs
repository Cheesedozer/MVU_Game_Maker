#!/usr/bin/env node
/**
 * embed-bundle.mjs — inverse of tools/extract-bundle.mjs
 *
 * Applies the editable files under `extracted/` back into the MVU character card
 * embedded in `dist/index.html`. The card lives as one JSON object inside a single
 * backtick template literal. Rather than re-serialize the whole card (which would
 * not reproduce esbuild's context-sensitive escaping and would pollute every diff),
 * this does **targeted patching**: it keeps the original backtick body byte-for-byte
 * and replaces only the values that actually changed, mapping each decoded-JSON span
 * back to its exact byte range in the raw literal.
 *
 * Result: a no-op rebuild is byte-identical to the original bundle; real edits produce
 * minimal, reviewable diffs.
 *
 * Usage:
 *   node tools/embed-bundle.mjs            # rebuild dist/index.html in place
 *   node tools/embed-bundle.mjs --check    # verify round-trip in memory, write nothing
 */

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BUNDLE = path.join(ROOT, 'dist', 'index.html');
const OUT = path.join(ROOT, 'extracted');
const CHECK = process.argv.includes('--check');

/**
 * Decode one layer of template-literal escapes AND return a map from each decoded
 * char index to the byte offset in `raw` where it began (map[len] = raw end).
 */
function decodeWithMap(raw) {
  let out = '';
  const map = [];
  let i = 0;
  while (i < raw.length) {
    const start = i;
    let ch;
    if (raw[i] === '\\') {
      const d = raw[i + 1];
      switch (d) {
        case 'n': ch = '\n'; i += 2; break;
        case 't': ch = '\t'; i += 2; break;
        case 'r': ch = '\r'; i += 2; break;
        case 'b': ch = '\b'; i += 2; break;
        case 'f': ch = '\f'; i += 2; break;
        case 'v': ch = '\v'; i += 2; break;
        case '0': ch = '\0'; i += 2; break;
        case 'x': ch = String.fromCharCode(parseInt(raw.substr(i + 2, 2), 16)); i += 4; break;
        case 'u':
          if (raw[i + 2] === '{') { const e = raw.indexOf('}', i); ch = String.fromCodePoint(parseInt(raw.slice(i + 3, e), 16)); i = e + 1; }
          else { ch = String.fromCharCode(parseInt(raw.substr(i + 2, 4), 16)); i += 6; }
          break;
        case '\n': ch = ''; i += 2; break;
        case '\r': ch = ''; i += (raw[i + 2] === '\n' ? 3 : 2); break;
        default: ch = d; i += 2;
      }
    } else { ch = raw[i]; i += 1; }
    for (let q = 0; q < ch.length; q++) map.push(start);
    out += ch;
  }
  map.push(raw.length);
  return { json: out, map };
}

/** Escape a value's JSON text for safe embedding in the backtick literal (for changed values only). */
function backtickEscape(s) {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$\{/g, '\\${')
    .replace(/<!--/g, '\\x3C!--')
    .replace(/<\/(script|style)/gi, '<\\/$1')
    .replace(/[﻿\uD800-\uDFFF]/g, (ch) => '\\u' + ch.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0'));
}

function readBacktick(src, start) {
  let j = start + 1, raw = '';
  while (j < src.length) {
    const c = src[j];
    if (c === '\\') { raw += c + src[j + 1]; j += 2; continue; }
    if (c === '`') return { raw, open: start, end: j };
    raw += c; j++;
  }
  return null;
}

const src = fs.readFileSync(BUNDLE, 'utf8');

// ---- Locate the card literal ----
let lit = null, decoded = null, card = null;
for (let i = 0; i < src.length; i++) {
  if (src[i] !== '`') continue;
  const l = readBacktick(src, i);
  if (!l) continue;
  i = l.end;
  if (l.raw.length < 5000 || !l.raw.includes('character_book')) continue;
  try { const d = decodeWithMap(l.raw); const c = JSON.parse(d.json); if (c.character_book) { lit = l; decoded = d; card = c; break; } }
  catch { /* keep scanning */ }
}
assert(lit, 'Could not locate the embedded card JSON in dist/index.html');
const { json, map } = decoded;

// ---- Self-test: the index map is exact (json span ↔ raw span round-trips) ----
{
  const probe = card.character_book.entries.find(e => (e.content || '').length > 200) || card.character_book.entries[0];
  const tok = JSON.stringify(probe.content ?? '');
  const at = json.indexOf(tok);
  assert(at >= 0 && lit.raw.slice(map[at], map[at + tok.length]) === backtickEscape(tok),
    'index map self-test failed — aborting to avoid corruption');
}

/** Resolve a source-map locator to {value, jsonToken} for the current card. */
function currentValue(loc) {
  if (loc.kind === 'entry') return card.character_book.entries[loc.index]?.content ?? '';
  if (loc.kind === 'regex') return card.extensions.regex_scripts[loc.index]?.replaceString ?? '';
  if (loc.kind === 'thscript') return card.extensions.tavern_helper.scripts[loc.index]?.content ?? '';
  if (loc.kind === 'variables') return card.extensions.tavern_helper.variables;
  return undefined;
}

// ---- Collect edits from extracted/ via the source map ----
const smap = JSON.parse(fs.readFileSync(path.join(OUT, 'sourcemap.json'), 'utf8'));
const edits = [];
let missing = 0;
for (const f of smap.files) {
  const abs = path.join(OUT, f.file);
  if (!fs.existsSync(abs)) { missing++; console.warn(`  missing: ${f.file}`); continue; }
  let content = fs.readFileSync(abs, 'utf8');
  if (!f.hadFinalNewline && content.endsWith('\n')) content = content.slice(0, -1);
  const newValue = f.kind === 'variables' ? JSON.parse(content) : (f.prefix || '') + content + (f.suffix || '');
  const oldValue = currentValue(f);
  if (oldValue === undefined) { console.warn(`  unmapped node: ${f.file}`); continue; }
  if (JSON.stringify(newValue) === JSON.stringify(oldValue)) continue; // unchanged

  const oldTok = JSON.stringify(oldValue);
  const first = json.indexOf(oldTok);
  assert(first >= 0, `cannot locate current value for ${f.file} in the bundle`);
  assert(json.indexOf(oldTok, first + 1) === -1,
    `value for ${f.file} is ambiguous (appears more than once) — targeted patch unsafe`);
  edits.push({ file: f.file, rawStart: map[first], rawEnd: map[first + oldTok.length], replacement: backtickEscape(JSON.stringify(newValue)) });
}

// ---- Apply edits to the raw literal (descending offset, so ranges stay valid) ----
edits.sort((a, b) => b.rawStart - a.rawStart);
let newRaw = lit.raw;
for (const e of edits) newRaw = newRaw.slice(0, e.rawStart) + e.replacement + newRaw.slice(e.rawEnd);

const newBundle = src.slice(0, lit.open + 1) + newRaw + src.slice(lit.end);
const byteIdentical = newBundle === src;

// ---- Verify the rebuilt literal re-extracts to the intended card ----
const rebuilt = JSON.parse(decodeWithMap(newRaw).json);
const intended = JSON.parse(json);
for (const f of smap.files) { /* fold edits into `intended` for the deep check */
  const abs = path.join(OUT, f.file); if (!fs.existsSync(abs)) continue;
  let content = fs.readFileSync(abs, 'utf8'); if (!f.hadFinalNewline && content.endsWith('\n')) content = content.slice(0, -1);
  const v = f.kind === 'variables' ? JSON.parse(content) : (f.prefix || '') + content + (f.suffix || '');
  if (f.kind === 'entry') intended.character_book.entries[f.index].content = v;
  else if (f.kind === 'regex') intended.extensions.regex_scripts[f.index].replaceString = v;
  else if (f.kind === 'thscript') intended.extensions.tavern_helper.scripts[f.index].content = v;
  else if (f.kind === 'variables') intended.extensions.tavern_helper.variables = v;
}
assert.deepStrictEqual(rebuilt, intended, 'rebuilt card does not match intended edits — aborting');

// ---- Report / write ----
console.log(`Card "${card.name}": ${edits.length} value(s) changed, ${missing} file(s) missing.`);
console.log(`  dist/index.html byte-identical to current: ${byteIdentical}`);
console.log(`  rebuilt card matches intended edits:        true`);
if (CHECK) {
  console.log(edits.length === 0 && byteIdentical
    ? '\n✓ identity round-trip verified (no edits → byte-identical)'
    : '\n(check mode — nothing written)');
} else {
  fs.writeFileSync(BUNDLE, newBundle);
  console.log(`\nWrote ${path.relative(ROOT, BUNDLE)} (${newBundle.length.toLocaleString()} bytes)`);
}
