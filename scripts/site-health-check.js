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
    else if (ent.isFile() && /\.html?$/i.test(ent.name)) pages.push({full, rel:path.relative(root, full).split(path.sep).join('/')});
  }
}
function attr(tag, name) {
  const re = /([a-z:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
  let m;
  while ((m = re.exec(tag))) if (m[1].toLowerCase() === name.toLowerCase()) return m[2] !== undefined ? m[2] : m[3];
  return '';
}
function checkPage(page) {
  const html = fs.readFileSync(page.full, 'utf8');
  [[/<title\b/i,'title'],[/<meta[^>]+name=["']description["']/i,'description'],[/<link[^>]+rel=["']canonical["']/i,'canonical URL'],[/<meta[^>]+name=["']viewport["']/i,'viewport']].forEach(function(check) {
    if (!check[0].test(html)) issue('warning', page.rel, 'Missing metadata: ' + check[1]);
  });
  const tags = html.match(/<(?:a|link|script|img|source|video|audio)[^>]*>/gi) || [];
  for (const tag of tags) {
    const raw = /^<(?:a|link)\b/i.test(tag) ? attr(tag, 'href') : attr(tag, 'src');
    if (!raw || /^(?:#|https?:|mailto:|tel:|data:|blob:|javascript:|\/\/)/i.test(raw)) continue;
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
async function checkBrowser() {
  let chromium;
  try { chromium = require('playwright').chromium; }
  catch(e) { issue('warning', 'browser checks', 'Playwright is not installed; runtime and layout checks were skipped.'); return; }
  const http = require('http');
  const mime = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.ico':'image/x-icon','.woff2':'font/woff2'};
  const server = http.createServer(function(req,res) {
    let pathname;
    try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); } catch(e) { res.writeHead(400).end(); return; }
    const file = path.resolve(root, '.' + pathname);
    if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    let target = file;
    try { if (fs.statSync(target).isDirectory()) target = path.join(target, 'index.html'); } catch(e) {}
    fs.readFile(target, function(err, data) {
      if (err) { res.writeHead(404).end('Not found'); return; }
      res.writeHead(200, {'Content-Type':mime[path.extname(target).toLowerCase()] || 'application/octet-stream'});
      res.end(data);
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({headless:true});
    const base = 'http://127.0.0.1:' + server.address().port + '/';
    for (const item of pages) {
      const page = await browser.newPage({viewport:{width:1365,height:900}});
      page.on('pageerror', error => issue('error', item.rel, 'JavaScript runtime error: ' + error.message));
      page.on('console', msg => { const source = msg.location().url || ''; if (msg.type() === 'error' && source.startsWith(base)) issue('error', item.rel, 'Browser console: ' + msg.text().slice(0,240)); });
      page.on('requestfailed', request => { if (request.url().startsWith(base)) issue('error', item.rel, 'Local resource failed: ' + request.url()); });
      try {
        await page.goto(base + item.rel.split(path.sep).join('/'), {waitUntil:'domcontentloaded',timeout:20000});
        await page.waitForTimeout(250);
        const desktop = await page.evaluate(() => ({width:document.documentElement.scrollWidth, viewport:window.innerWidth}));
        if (desktop.width > desktop.viewport + 2) issue('warning', item.rel, 'Horizontal overflow at desktop viewport (' + desktop.width + 'px > ' + desktop.viewport + 'px).');
        await page.setViewportSize({width:390,height:844});
        await page.waitForTimeout(100);
        const mobile = await page.evaluate(() => ({width:document.documentElement.scrollWidth, viewport:window.innerWidth}));
        if (mobile.width > mobile.viewport + 2) issue('warning', item.rel, 'Horizontal overflow at mobile viewport (' + mobile.width + 'px > ' + mobile.viewport + 'px).');
      } catch(e) { issue('error', item.rel, 'Browser test failed: ' + e.message); }
      finally { await page.close(); }
    }
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}
async function main() {
  walk(root);
  pages.forEach(checkPage);
  checkScripts();
  if (process.env.VS_HEALTH_BROWSER === '1') await checkBrowser();
  const errors = issues.filter(x => x.level === 'error').length;
  const warnings = issues.filter(x => x.level === 'warning').length;
  console.log('Velocity Systems health check: ' + pages.length + ' HTML pages; ' + errors + ' errors; ' + warnings + ' warnings.');
  issues.forEach(x => console.log('[' + x.level.toUpperCase() + '] ' + x.file + ' — ' + x.message));
  if (!issues.length) console.log('No issues found.');
  process.exitCode = errors ? 1 : 0;
}
main().catch(function(error) { console.error(error); process.exitCode = 1; });
