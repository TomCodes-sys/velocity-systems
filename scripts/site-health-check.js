#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const root = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const issues = [], pages = [];
const skipDirs = new Set(['.git', 'node_modules', '.wrangler']);
function issue(level, file, message) { issues.push({level, file, message}); }
function walk(dir) {
  for (const ent of fs.readdirSync(dir, {withFileTypes:true})) {
    if (skipDirs.has(ent.name)) continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full);
    else if (ent.isFile() && /\\.html?$/i.test(ent.name)) pages.push({full, rel:path.relative(root, full).split(path.sep).join('/')});
  }
}
function attr(tag, name) {
  const re = new RegExp("\\\\b" + name + "\\\\s*=\\\\s*(['\\\"])(.*?)\\\\1", 'i');
  const match = tag.match(re);
  return match ? match[2] : '';
}
function checkPage(page) {
  const html = fs.readFileSync(page.full, 'utf8');
  [[/<title\\b/i,'title'],[/<meta[^>]+name=['"]description['"]/i,'description'],[/<link[^>]+rel=['"]canonical['"]/i,'canonical URL'],[/<meta[^>]+name=['"]viewport['"]/i,'viewport']].forEach(function(check) {
    if (!check[0].test(html)) issue('warning', page.rel, 'Missing metadata: ' + check[1]);
  });
  const tags = html.match(/<(?:a|link|script|img|source|video|audio)[^>]*>/gi) || [];
  for (const tag of tags) {
    const raw = /^<(?:a|link)\\b/i.test(tag) ? attr(tag, 'href') : attr(tag, 'src');
    if (!raw || /^(?:#|https?:|mailto:|tel:|data:|blob:|javascript:|\\/\\/)/i.test(raw)) continue;
    let clean;
    try { clean = decodeURIComponent(raw.split(/[?#]/)[0]); } catch(e) { issue('error', page.rel, 'Invalid URL encoding: ' + raw); continue; }
    if (!clean) continue;
    const target = path.resolve(path.dirname(page.full), clean);
    if (target !== root && !target.startsWith(root + path.sep)) { issue('error', page.rel, 'Local path escapes site root: ' + raw); continue; }
    if (!fs.existsSync(target)) issue('error', page.rel, 'Broken local reference: ' + raw);
  }
}
function checkScripts() {
  const files = [];
  function visit(dir) {
    for (const ent of fs.readdirSync(dir, {withFileTypes:true})) {
      if (skipDirs.has(ent.name)) continue;
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) visit(full);
      else if (ent.isFile() && ent.name.endsWith('.js')) files.push(full);
    }
  }
  visit(root);
  files.forEach(function(file) {
    const result = spawnSync(process.execPath, ['--check', file], {encoding:'utf8'});
    if (result.status !== 0) issue('error', path.relative(root, file), (result.stderr || result.stdout || 'JavaScript syntax check failed').trim());
  });
}
walk(root);
pages.forEach(checkPage);
checkScripts();
const errors = issues.filter(x => x.level === 'error').length;
const warnings = issues.filter(x => x.level === 'warning').length;
console.log('Velocity Systems health check: ' + pages.length + ' HTML pages; ' + errors + ' errors; ' + warnings + ' warnings.');
issues.forEach(x => console.log('[' + x.level.toUpperCase() + '] ' + x.file + ' — ' + x.message));
if (!issues.length) console.log('No static issues found.');
process.exitCode = errors ? 1 : 0;
