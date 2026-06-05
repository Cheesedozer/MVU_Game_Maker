#!/usr/bin/env node
/**
 * build-card.mjs — compose the MVU card from extracted/manifest.json + source files,
 * and verify it reproduces the card currently embedded in dist/index.html.
 *
 * The manifest is the full card structure with every content field replaced by a
 * { $file, prefix, suffix, finalNewline } reference. This makes the card declaratively
 * defined: a subsystem's rules/scripts/GUI live in real files, and the manifest says how
 * they compose into the card. Adding a feature = add a file + a manifest entry.
 *
 *   node tools/build-card.mjs            # compose, verify deep-equal to live card, report
 *   node tools/build-card.mjs --json     # also print the composed card to stdout
 *
 * This does NOT modify dist/index.html (delivery stays with tools/embed-bundle.mjs). Its job
 * is to prove the manifest + files are a complete, faithful definition of the card.
 */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'extracted');
const BUNDLE = path.join(ROOT, 'dist', 'index.html');

function unescapeOnce(raw) {
  let out = '';
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (c !== '\\') { out += c; continue; }
    const d = raw[++i];
    switch (d) {
      case 'n': out += '\n'; break; case 't': out += '\t'; break; case 'r': out += '\r'; break;
      case 'b': out += '\b'; break; case 'f': out += '\f'; break; case 'v': out += '\v'; break; case '0': out += '\0'; break;
      case 'x': out += String.fromCharCode(parseInt(raw.substr(i + 1, 2), 16)); i += 2; break;
      case 'u':
        if (raw[i + 1] === '{') { const e = raw.indexOf('}', i); out += String.fromCodePoint(parseInt(raw.slice(i + 2, e), 16)); i = e; }
        else { out += String.fromCharCode(parseInt(raw.substr(i + 1, 4), 16)); i += 4; } break;
      case '\n': break; case '\r': if (raw[i + 1] === '\n') i++; break;
      default: out += d;
    }
  }
  return out;
}
function readBacktick(src, start) {
  let j = start + 1, raw = '';
  while (j < src.length) { const c = src[j]; if (c === '\\') { raw += c + src[j + 1]; j += 2; continue; } if (c === '`') return raw; raw += c; j++; }
  return null;
}
function liveCard() {
  const src = fs.readFileSync(BUNDLE, 'utf8');
  for (let i = 0; i < src.length; i++) {
    if (src[i] !== '`') continue;
    const raw = readBacktick(src, i); if (!raw) continue; i += raw.length;
    if (raw.length < 5000 || !raw.includes('character_book')) continue;
    try { const o = JSON.parse(unescapeOnce(raw)); if (o.character_book) return o; } catch {}
  }
  throw new Error('could not locate live card in dist/index.html');
}

const isRef = (v) => v && typeof v === 'object' && typeof v.$file === 'string';
function resolveRef(ref) {
  let content = fs.readFileSync(path.join(OUT, ref.$file), 'utf8');
  if (!ref.finalNewline && content.endsWith('\n')) content = content.slice(0, -1);
  if (ref.json) return JSON.parse(content);
  return (ref.prefix || '') + content + (ref.suffix || '');
}
function compose(node) {
  if (isRef(node)) return resolveRef(node);
  if (Array.isArray(node)) return node.map(compose);
  if (node && typeof node === 'object') { const o = {}; for (const k of Object.keys(node)) o[k] = compose(node[k]); return o; }
  return node;
}

const manifest = JSON.parse(fs.readFileSync(path.join(OUT, 'manifest.json'), 'utf8'));
const composed = compose(manifest);
const live = liveCard();

try {
  assert.deepStrictEqual(composed, live);
} catch (e) {
  console.error('✗ Composed card does NOT match the live card in dist/index.html.');
  console.error('  The manifest + source files are not a faithful definition of the card.');
  console.error('  ' + (e.message || e).split('\n').slice(0, 6).join('\n  '));
  process.exit(1);
}

const counts = {
  entries: composed.character_book?.entries?.length ?? 0,
  regex_scripts: composed.extensions?.regex_scripts?.length ?? 0,
  th_scripts: composed.extensions?.tavern_helper?.scripts?.length ?? 0,
};
console.log(`✓ Composed card from manifest + ${fs.readdirSync(path.join(OUT)).length} source dirs/files matches the live card exactly.`);
console.log(`  entries=${counts.entries}  regex_scripts=${counts.regex_scripts}  tavern_helper.scripts=${counts.th_scripts}`);
if (process.argv.includes('--json')) process.stdout.write(JSON.stringify(composed));
