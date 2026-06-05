#!/usr/bin/env node
/**
 * extract-bundle.mjs
 *
 * Extracts the original, never-minified source embedded inside the built
 * `dist/index.html` Vue bundle into an organized, human-readable tree under
 * `extracted/`.
 *
 * The MVU Game Maker ships only a minified build with no sourcemap, so the Vue
 * component source itself cannot be recovered. But the entire MVU character card
 * — every lorebook entry, every GUI/display regex script, the Tavern Helper
 * runtime scripts, the Zod schema registration, and the initial variable tree —
 * is embedded as one large JSON object inside a single backtick template literal.
 * We locate that literal, unescape it once to recover clean JSON, `JSON.parse`
 * it, and walk the object. JSON.parse handles all string escaping, so every
 * extracted file is byte-faithful to the author's source.
 *
 * Extraction only — `dist/` is never modified. Re-running is idempotent.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BUNDLE = path.join(ROOT, 'dist', 'index.html');
const OUT = path.join(ROOT, 'extracted');

const sha1 = (s) => crypto.createHash('sha1').update(s).digest('hex').slice(0, 8);
const slug = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);

/** Decode one layer of JS string-literal / template-literal escapes. */
function unescapeOnce(raw) {
  let out = '';
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (c !== '\\') { out += c; continue; }
    const d = raw[++i];
    switch (d) {
      case 'n': out += '\n'; break;
      case 't': out += '\t'; break;
      case 'r': out += '\r'; break;
      case 'b': out += '\b'; break;
      case 'f': out += '\f'; break;
      case 'v': out += '\v'; break;
      case '0': out += '\0'; break;
      case 'x': out += String.fromCharCode(parseInt(raw.substr(i + 1, 2), 16)); i += 2; break;
      case 'u':
        if (raw[i + 1] === '{') { const e = raw.indexOf('}', i); out += String.fromCodePoint(parseInt(raw.slice(i + 2, e), 16)); i = e; }
        else { out += String.fromCharCode(parseInt(raw.substr(i + 1, 4), 16)); i += 4; }
        break;
      case '\n': break;
      case '\r': if (raw[i + 1] === '\n') i++; break;
      default: out += d; // \\ \` \$ \" \' -> literal char
    }
  }
  return out;
}

/** Read a backtick template literal's raw (escaped) body starting at `start`. */
function readBacktick(src, start) {
  let j = start + 1, raw = '';
  while (j < src.length) {
    const c = src[j];
    if (c === '\\') { raw += c + src[j + 1]; j += 2; continue; }
    if (c === '`') return { raw, end: j };
    raw += c; j++;
  }
  return null;
}

const src = fs.readFileSync(BUNDLE, 'utf8');

// ---- Locate the card JSON: the largest backtick literal that parses and has a character_book ----
function findCard() {
  for (let i = 0; i < src.length; i++) {
    if (src[i] !== '`') continue;
    const lit = readBacktick(src, i);
    if (!lit) continue;
    i = lit.end;
    if (lit.raw.length < 5000 || !lit.raw.includes('character_book')) continue;
    try {
      const obj = JSON.parse(unescapeOnce(lit.raw));
      if (obj && obj.character_book) return { obj, pos: lit.end - lit.raw.length };
    } catch { /* not the one */ }
  }
  return null;
}

const card = findCard();
if (!card) { console.error('Could not locate the embedded card JSON.'); process.exit(1); }
const data = card.obj;

if (fs.existsSync(OUT)) fs.rmSync(OUT, { recursive: true });
const records = [];
const used = new Set();

function detectVersion(t) {
  const m = t.match(/SCRIPT_VERSION\s*=\s*['"]?v?([0-9][\w.\-]*)/i)
    || t.match(/#\s*v(?:ersion)?[:\s]*([0-9]+\.[0-9]+(?:\.[0-9]+)?)/i)
    || t.match(/\b[Vv]ersion[:\s]+([0-9]+\.[0-9]+(?:\.[0-9]+)?)/);
  return m ? m[1] : '';
}

function write(group, dir, base, ext, text, meta = {}, locator = null, prefix = '', suffix = '') {
  if (!base) base = group;
  let name = `${base}.${ext}`;
  if (used.has(path.join(dir, name))) name = `${base}-${sha1(text).slice(0, 6)}.${ext}`;
  used.add(path.join(dir, name));
  const abs = path.join(OUT, dir, name);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  // A trailing newline is added for readability; the source map records whether the
  // original value already ended in one, so the embedder can round-trip exactly.
  const hadFinalNewline = text.endsWith('\n');
  fs.writeFileSync(abs, hadFinalNewline ? text : text + '\n');
  records.push({
    group, file: `${dir}/${name}`, bytes: Buffer.byteLength(text),
    version: detectVersion(text), sha1: sha1(text), meta,
    locator, prefix, suffix, hadFinalNewline,
  });
}

// ---- Lorebook entries ----
data.character_book?.entries?.forEach((e, i) => {
  const label = e.comment || (Array.isArray(e.keys) && e.keys[0]) || `entry-${e.id}`;
  write('lorebook', 'lorebook', slug(label) || `entry-${e.id}`, 'txt', e.content ?? '', {
    comment: e.comment, id: e.id, enabled: e.enabled !== false && !e.disable,
    constant: !!e.constant, position: e.position, order: e.insertion_order ?? e.order,
    keys: Array.isArray(e.keys) ? e.keys : [],
  }, { kind: 'entry', index: i });
});

// ---- GUI / display regex scripts ----
data.extensions?.regex_scripts?.forEach((r, i) => {
  const raw = String(r.replaceString ?? '');
  const pre = (raw.match(/^```\w*\n?/) || [''])[0];
  let rest = raw.slice(pre.length);
  const suf = (rest.match(/\n?```$/) || [''])[0];
  const text = rest.slice(0, rest.length - suf.length);
  const ext = /<!DOCTYPE|<html|<body|<div|<script|<style/i.test(text.slice(0, 300)) ? 'html'
    : /^\s*(\(function|function |const |let |var |window\.|document\.|\/\/|\/\*)/.test(text) ? 'js' : 'txt';
  write('gui', 'gui', slug(r.scriptName) || 'regex-script', ext, text, {
    scriptName: r.scriptName, findRegex: r.findRegex, disabled: !!r.disabled,
  }, { kind: 'regex', index: i }, pre, suf);
});

// ---- Tavern Helper runtime scripts (+ schema registration) ----
data.extensions?.tavern_helper?.scripts?.forEach((sc, i) => {
  const text = String(sc.content ?? '');
  const isSchema = /registerMvuSchema|^\s*import\b/.test(text);
  let base = slug(sc.name);
  if (!base || !/[a-z]/.test(base)) {
    base = /終極診斷|diagnostic/i.test(text) ? 'mvu-diagnostic-script'
      : /數值監護|onVariableUpdateEnded/.test(text) ? 'stat-guardian-script'
      : isSchema ? 'register-mvu-schema' : 'tavern-helper-script';
  }
  const [grp, dir] = isSchema ? ['schema', 'schema'] : ['script', 'scripts'];
  write(grp, dir, base, 'js', text, { name: sc.name }, { kind: 'thscript', index: i });
});

// ---- Initial variable / stat tree ----
if (data.extensions?.tavern_helper?.variables) {
  write('data', 'data', 'initial-variables', 'json',
    JSON.stringify(data.extensions.tavern_helper.variables, null, 2),
    {}, { kind: 'variables' });
}

// ---- Embedded base64 assets (walk every string value) ----
let assetN = 0;
(function walk(o) {
  if (Array.isArray(o)) return o.forEach(walk);
  if (o && typeof o === 'object') return Object.values(o).forEach(walk);
  if (typeof o === 'string') {
    const m = o.match(/^data:([a-z]+\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/i);
    if (m && m[2].length > 2000) {
      const ext = (m[1].split('/')[1] || 'bin').replace('jpeg', 'jpg');
      const buf = Buffer.from(m[2], 'base64');
      const name = (assetN++ === 0 ? 'default-character' : `asset-${assetN}`) + '.' + ext;
      fs.mkdirSync(path.join(OUT, 'assets'), { recursive: true });
      fs.writeFileSync(path.join(OUT, 'assets', name), buf);
      records.push({ group: 'asset', file: `assets/${name}`, bytes: buf.length, version: '', sha1: sha1(buf), meta: { mime: m[1] } });
    }
  }
})(data);

// ---- Pretty-printed full card (data: URIs elided) for reference ----
const cardForRef = JSON.parse(JSON.stringify(data, (k, v) =>
  (typeof v === 'string' && /^data:[a-z]+\/[a-z0-9.+-]+;base64,/i.test(v)) ? `«base64 elided, ${v.length} bytes — see extracted/assets/»` : v));
fs.writeFileSync(path.join(OUT, 'card.json'), JSON.stringify(cardForRef, null, 2));

// ---- Machine-readable source map: lets tools/embed-bundle.mjs apply edits back ----
const sourceMap = {
  bundle: 'dist/index.html',
  bundleSha1: sha1(src),
  files: records
    .filter(r => r.locator && r.locator.kind)
    .map(r => ({ file: r.file, ...r.locator, prefix: r.prefix || '', suffix: r.suffix || '', hadFinalNewline: !!r.hadFinalNewline })),
};
fs.writeFileSync(path.join(OUT, 'sourcemap.json'), JSON.stringify(sourceMap, null, 2));

// ---- Module manifest: the FULL card structure with content fields replaced by
// {$file} references. tools/build-card.mjs composes the card back from this + the
// source files, so the card is declaratively defined (a feature = a file + a manifest
// entry) and can be verified to reproduce the live card exactly. ----
const manifest = JSON.parse(JSON.stringify(data));
for (const r of records) {
  const L = r.locator; if (!L || !L.kind) continue;
  const ref = { $file: r.file, prefix: r.prefix || '', suffix: r.suffix || '', finalNewline: !!r.hadFinalNewline };
  if (L.kind === 'entry') manifest.character_book.entries[L.index].content = ref;
  else if (L.kind === 'regex') manifest.extensions.regex_scripts[L.index].replaceString = ref;
  else if (L.kind === 'thscript') manifest.extensions.tavern_helper.scripts[L.index].content = ref;
  else if (L.kind === 'variables') manifest.extensions.tavern_helper.variables = { ...ref, json: true };
}
fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));

// ---- Validate runtime script syntax (best-effort; report only) ----
const jsInvalid = [];
for (const r of records) {
  if (r.group !== 'script') continue;
  try { execFileSync(process.execPath, ['--check', path.join(OUT, r.file)], { stdio: 'pipe' }); }
  catch { jsInvalid.push(r.file); }
}

// ---- Manifest ----
const byGroup = {};
for (const r of records) (byGroup[r.group] ||= []).push(r);
const order = ['gui', 'script', 'schema', 'lorebook', 'data', 'asset'];
let md = `# Extracted bundle source — MANIFEST\n\n`;
md += `Generated by \`tools/extract-bundle.mjs\` from \`dist/index.html\` (${src.length.toLocaleString()} bytes, sha1 \`${sha1(src)}\`).\n\n`;
md += `The whole MVU character card is embedded as one JSON object in a backtick template literal; `;
md += `this tool parses it and writes each piece below. **Extraction only** — \`dist/\` is untouched and the run is idempotent.\n\n`;
md += `\`extracted/card.json\` is the full parsed card (base64 images elided) for reference.\n\n`;
md += `**Total:** ${records.length} files`;
if (jsInvalid.length) md += `. Runtime scripts that did not pass \`node --check\`: ${jsInvalid.map(x => `\`${x}\``).join(', ')}`;
md += `\n\n`;

for (const g of order) {
  const list = byGroup[g]; if (!list) continue;
  const bytes = list.reduce((a, x) => a + x.bytes, 0);
  md += `## ${g} — ${list.length} file(s), ${bytes.toLocaleString()} bytes\n\n`;
  if (g === 'lorebook') {
    md += `| file | bytes | constant | position | order | keys |\n|---|--:|:--:|---|--:|---|\n`;
    for (const r of list) md += `| \`${r.file}\` | ${r.bytes.toLocaleString()} | ${r.meta.constant ? '✓' : ''} | ${r.meta.position ?? '—'} | ${r.meta.order ?? '—'} | ${(r.meta.keys || []).slice(0, 4).join(', ') || '—'} |\n`;
  } else if (g === 'gui') {
    md += `| file | bytes | scriptName | replaces (findRegex) |\n|---|--:|---|---|\n`;
    for (const r of list) md += `| \`${r.file}\` | ${r.bytes.toLocaleString()} | ${r.meta.scriptName || '—'} | \`${String(r.meta.findRegex || '—').replace(/\|/g, '\\|').replace(/\n/g, ' ').slice(0, 48)}\` |\n`;
  } else {
    md += `| file | bytes | version | sha1 |\n|---|--:|:--:|---|\n`;
    for (const r of list) md += `| \`${r.file}\` | ${r.bytes.toLocaleString()} | ${r.version || '—'} | \`${r.sha1}\` |\n`;
  }
  md += `\n`;
}
fs.writeFileSync(path.join(OUT, 'MANIFEST.md'), md);

console.log(`Parsed card "${data.name}" → extracted ${records.length} files into ${path.relative(ROOT, OUT)}/`);
for (const g of order) if (byGroup[g]) console.log(`  ${g.padEnd(10)} ${byGroup[g].length}`);
if (jsInvalid.length) console.log(`  note: ${jsInvalid.length} runtime script(s) failed --check`);
