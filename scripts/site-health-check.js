#!/usr/bin/env node
'use strict';

/*
 * Velocity Systems static-site health checker.
 * Usage: node scripts/site-health-check.js [site-root]
 *
 * Uses Node built-ins only. Checks generated HTML pages for local href/src
 * targets, common metadata, and JavaScript syntax. If Playwright is installed
 * in the project, set VS_HEALTH_PLAYWRIGHT=1 to add browser runtime checks.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const root = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const issues = [];
const pages = [];
const assets = new Set();
const skipDirs = new Set(['.git', 'node_modules', '.wrangler', '.dev.vars']);

function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skipDirs.has(ent.name)) continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full);
    else if (ent.isFile()) {
      const rel = path.relative(root, full).split(path.sep).join('/');
      if (/\.html?$/i.test(ent.name)) pages.push({ full, rel });
      if (/\.(?:js|css|svg|png|jpe?g|webp|ico|woff2?|ttf|json)$/i.test(ent.name)) assets.add(rel);
    }
  }
}
function issue(level, file, message) { issues.push({ level, file, message }); }
function attr(tag, name) {
  const re = new RegExp('\\b' + name + '\\s*=\\s*(["\\'])(.*?)\\1', 'i');
  const m = tag.match(re); return m ? m[2] : '';
}
function checkPage(page) {
  const html = fs.readFileSync(page.full, 'utf8');
  for (const meta of ['<title\\b', '<meta[^>]+name=["\\']description["\\']', '<link[^>]+rel=["\\']canonical["\\']']) {
    if (!new RegExp(meta, 'i').test(html)) issue('warning', page.rel, 'Missing metadata: ' + meta);
  }
  if (!/<meta[^>]+name=["']viewport["']/i.test(html)) issue('warning', page.rel, 'Missing viewport meta tag');
  const tags = html.match(/<(?:a|link|script|img|source|video|audio)[^>]*>/gi) || [];
  for (const tag of tags) {
    const raw = /^(?:<a|<link)/i.test(tag) ? attr(tag, 'href') : attr(tag, 'src');
    if (!raw || /^(?:#|https?:|mailto:|tel:|data:|blob:|javascript:|\/\/)/i.test(raw)) continue;
    const clean = decodeURIComponent(raw.split(/[?#]/)[0]);
    if (!clean) continue;
    const target = path.resolve(path.dirname(page.full), clean);
    if (!target.startsWith(root + path.sep) && target !== root) {
      issue('error', page.rel, 'Local path escapes site root: ' + raw); continue;
    }
    if (!fs.existsSync(target)) issue('error', page.rel, 'Broken local reference: ' + raw);
  }
}
function checkScripts() {
  const jsFiles = [];
  (function visit(dir) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      if (skipDirs.has(ent.name)) continue;
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) visit(full);
      else if (ent.name.endsWith('.js')) jsFiles.push(full);
    }
  })(root);
  for (const file of jsFiles) {
    const r = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
    if (r.status !== 0) issue('error', path.relative(root, file), (r.stderr || r.stdout || 'JavaScript syntax check failed').trim());
  }
}
walk(root);
pages.forEach(checkPage);
checkScripts();

console.log('\nVelocity Systems site health');
console.log('Root: ' + root);
console.log('HTML pages: ' + pages.length + ' | assets: ' + assets.size);
const counts = issues.reduce((o, x) => (o[x.level] = (o[x.level] || 0) + 1, o), {});
console.log('Errors: ' + (counts.error || 0) + ' | Warnings: ' + (counts.warning || 0));
for (const x of issues) console.log('[' + x.level.toUpperCase() + '] ' + x.file + ' — ' + x.message);
if (!issues.length) console.log('No static issues found.');
if (process.env.VS_HEALTH_PLAYWRIGHT === '1') {
  console.log('\nBrowser checks are not bundled: install Playwright and add a project-specific route runner to test runtime console errors and layout overflow.');
}
process.exitCode = issues.some(x => x.level === 'error') ? 1 : 0;
