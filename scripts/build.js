#!/usr/bin/env node
/* build.js — generates every HTML page for Velocity Systems from assets/js/data.js.
 *
 *   node scripts/build.js
 *
 * Why this exists: Discord, Slack, iMessage, X and search engines read a page's
 * <head> WITHOUT running JavaScript, so each page needs its own static title,
 * description and image tags to get a proper link embed. This script writes
 * those tags (plus a sitemap and robots.txt) so you never hand-edit 60+ files.
 *
 * It is optional at runtime — the site itself has no build step. Re-run it
 * after you add or rename something in data.js, then commit the result.
 *
 * Set your public address below (or pass SITE_URL=https://example.com/ when
 * running). Link embeds need an absolute URL for the preview image.
 */
'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');
var crypto = require('crypto');

var SITE_URL = (process.env.SITE_URL || 'https://tomcodes-sys.github.io/velocity-systems/').replace(/\/?$/, '/');
var SITE_NAME = 'Velocity Systems';
var THEME_COLOR = '#6b98e6'; // Discord uses this for the coloured stripe on the embed

var ROOT_DIR = path.join(__dirname, '..');
function read(p){ return fs.readFileSync(path.join(ROOT_DIR, p), 'utf8'); }
function write(p, text){
  var full = path.join(ROOT_DIR, p);
  fs.mkdirSync(path.dirname(full), {recursive: true});
  fs.writeFileSync(full, text);
}

/* ---------- load the catalogue ---------- */
var ctx = {};
vm.createContext(ctx);
vm.runInContext(read('assets/js/data.js') + '\n;this.items = items; this.collections = collections;', ctx);
var items = ctx.items;

/* ---------- cache-busting: ?v=<hash of the file> on every asset URL ---------- */
var hashCache = {};
function ver(rel){
  if(!hashCache[rel]){
    try { hashCache[rel] = crypto.createHash('md5').update(fs.readFileSync(path.join(ROOT_DIR, rel))).digest('hex').slice(0, 8); }
    catch(e){ hashCache[rel] = '0'; }
  }
  return hashCache[rel];
}

/* ---------- page copy ---------- */
var KIND = {
  games:    {label:'Games',    noun:'Browser game',    og:'assets/img/og/games.png',    desc:'Focused browser games that load quickly and respect your time. No accounts, no ads.'},
  tools:    {label:'Tools',    noun:'Free online tool', og:'assets/img/og/tools.png',    desc:'Private, practical utilities that run directly in your browser. Nothing is uploaded.'},
  library:  {label:'Library',  noun:'Software',         og:'assets/img/og/library.png',  desc:'A curated directory of dependable software, websites and open-source projects.'},
  articles: {label:'Articles', noun:'Article',          og:'assets/img/og/articles.png', desc:'Practical guides, informed recommendations and durable technical knowledge.'},
};
var DEFAULT_OG = 'assets/img/og/default.png';
var SITE_DESC = 'A curated catalogue of Windows software, browser tools, games and guides. No accounts, no tracking.';

function esc(s){ return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function clip(s, n){ s = String(s).replace(/\s+/g, ' ').trim(); return s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…'; }

/* ---------- one page ---------- */
function page(o){
  var root = o.root;                       // '' or '../'
  var url = SITE_URL + o.file;
  var image = SITE_URL + (o.image || DEFAULT_OG);
  var desc = clip(o.desc, 200);
  var ogType = o.ogType || 'website';
  var scripts = ['assets/js/data.js', 'assets/js/icons.js', 'assets/js/app.js'];
  if(o.play){ scripts.push('assets/js/play.js'); scripts.push(o.bundle); }
  var scriptTags = scripts.map(function(s){ return '<script src="' + root + s + '?v=' + ver(s) + '"></script>'; });
  var body = ['data-root="' + root + '"', 'data-page="' + o.page + '"', 'data-nav="' + o.nav + '"'];
  if(o.kind) body.push('data-kind="' + o.kind + '"');
  if(o.id) body.push('data-id="' + esc(o.id) + '"');

  var ld = o.jsonld ? '<script type="application/ld+json">' + JSON.stringify(o.jsonld).replace(/</g, '\\u003c') + '</script>\n' : '';
  return '<!DOCTYPE html>\n<html lang="en">\n<head>\n' +
'<meta charset="UTF-8">\n' +
'<meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
'<title>' + esc(o.title) + '</title>\n' +
'<meta name="description" content="' + esc(desc) + '">\n' +
'<link rel="canonical" href="' + url + '">\n' +
'<meta name="theme-color" content="' + THEME_COLOR + '">\n' +
'<meta name="color-scheme" content="dark light">\n' +
(o.noindex ? '<meta name="robots" content="noindex">\n' : '') +
'<!-- Link embeds (Discord, Slack, iMessage, X, search) read these tags without running JavaScript -->\n' +
'<meta property="og:site_name" content="' + SITE_NAME + '">\n' +
'<meta property="og:type" content="' + ogType + '">\n' +
'<meta property="og:title" content="' + esc(o.ogTitle || o.title) + '">\n' +
'<meta property="og:description" content="' + esc(desc) + '">\n' +
'<meta property="og:url" content="' + url + '">\n' +
'<meta property="og:image" content="' + image + '">\n' +
'<meta property="og:image:type" content="image/png">\n' +
'<meta property="og:image:width" content="1200">\n' +
'<meta property="og:image:height" content="630">\n' +
'<meta property="og:image:alt" content="' + esc(o.imageAlt || (SITE_NAME + ' — ' + o.title)) + '">\n' +
'<meta property="og:locale" content="en_AU">\n' +
'<meta name="twitter:card" content="summary_large_image">\n' +
'<meta name="twitter:title" content="' + esc(o.ogTitle || o.title) + '">\n' +
'<meta name="twitter:description" content="' + esc(desc) + '">\n' +
'<meta name="twitter:image" content="' + image + '">\n' +
'<link rel="icon" type="image/svg+xml" href="' + root + 'assets/img/favicon.svg">\n' +
'<link rel="apple-touch-icon" href="' + root + 'assets/img/apple-touch-icon.png">\n' +
ld +
'<link rel="preconnect" href="https://fonts.googleapis.com">\n' +
'<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
'<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500;600&display=swap">\n' +
'<link rel="stylesheet" href="' + root + 'assets/css/styles.css?v=' + ver('assets/css/styles.css') + '">\n' +
'</head>\n<body ' + body.join(' ') + '>\n' +
'<noscript><div style="padding:32px;font-family:system-ui,sans-serif;max-width:640px"><h1>' + esc(o.heading || o.title) + '</h1><p>' + esc(desc) + '</p><p>This site needs JavaScript enabled to show its content.</p></div></noscript>\n' +
'<!-- Everything on the page is drawn by app.js. Scripts must stay at the end of <body>. -->\n' +
scriptTags.join('\n') + '\n</body>\n</html>\n';
}

var written = [], urls = [], warnings = [];
function emit(file, html, sitemap){
  write(file, html);
  written.push(file);
  if(sitemap !== false) urls.push(file === 'index.html' ? '' : file);
}

/* ---------- top-level pages ---------- */
emit('index.html', page({
  file: 'index.html', root: '', page: 'home', nav: 'home',
  title: SITE_NAME + ' — Software, tools & games', ogTitle: SITE_NAME,
  desc: SITE_DESC,
  jsonld: {'@context': 'https://schema.org', '@type': 'WebSite', name: SITE_NAME, url: SITE_URL, description: SITE_DESC,
    potentialAction: {'@type': 'SearchAction', target: SITE_URL + 'search.html?q={search_term_string}', 'query-input': 'required name=search_term_string'}},
}));

['games', 'tools'].forEach(function(k){
  emit(k + '.html', page({
    file: k + '.html', root: '', page: 'sectioned', nav: k, kind: k,
    title: KIND[k].label + ' · ' + SITE_NAME, desc: KIND[k].desc, image: KIND[k].og,
    heading: KIND[k].label,
  }));
});
['library', 'articles'].forEach(function(k){
  emit(k + '.html', page({
    file: k + '.html', root: '', page: 'catalog', nav: k, kind: k,
    title: KIND[k].label + ' · ' + SITE_NAME, desc: KIND[k].desc, image: KIND[k].og,
    heading: KIND[k].label,
  }));
});
emit('search.html', page({
  file: 'search.html', root: '', page: 'search', nav: 'search',
  title: 'Search · ' + SITE_NAME, desc: 'Search every game, tool, piece of software and guide on ' + SITE_NAME + '.', noindex: true,
}), false);
emit('settings.html', page({
  file: 'settings.html', root: '', page: 'settings', nav: 'settings',
  title: 'Settings · ' + SITE_NAME, desc: 'Themes, interface options and the data this site keeps in your browser.', noindex: true,
}), false);

/* ---------- one page per catalogue item ---------- */
var seenKinds = {};
items.forEach(function(item){
  var k = KIND[item.kind];
  if(!k){ warnings.push('Unknown kind "' + item.kind + '" on ' + item.id); return; }
  seenKinds[item.kind] = true;
  var file = item.kind + '/' + item.id + '.html';
  var play = !!item.playable;
  var bundleRel = 'assets/js/' + item.kind + '.js';
  if(play){
    var bundle = fs.existsSync(path.join(ROOT_DIR, bundleRel)) ? read(bundleRel) : '';
    if(bundle.indexOf("PLAYABLES['" + item.id + "']") < 0){
      warnings.push(file + ': marked playable but ' + bundleRel + " has no PLAYABLES['" + item.id + "'] entry");
      play = false;
    }
  }
  var desc = item.description;
  if(item.kind === 'tools') desc += ' Free, runs in your browser — nothing is uploaded.';
  if(item.kind === 'games') desc += ' Free to play in your browser.';

  var ld;
  if(item.kind === 'tools' || item.kind === 'games'){
    ld = {'@context': 'https://schema.org', '@type': 'WebApplication', name: item.title, description: item.description, url: SITE_URL + file,
      applicationCategory: item.kind === 'games' ? 'GameApplication' : 'UtilitiesApplication', operatingSystem: 'Any',
      browserRequirements: 'Requires JavaScript', offers: {'@type': 'Offer', price: '0', priceCurrency: 'USD'}};
  } else if(item.kind === 'library'){
    ld = {'@context': 'https://schema.org', '@type': 'SoftwareApplication', name: item.title, description: item.description,
      operatingSystem: item.platform, applicationCategory: item.category};
    if(item.website) ld.url = item.website;
    if(item.free) ld.offers = {'@type': 'Offer', price: '0', priceCurrency: 'USD'};
  } else {
    ld = {'@context': 'https://schema.org', '@type': 'Article', headline: item.title, description: item.description,
      mainEntityOfPage: SITE_URL + file, publisher: {'@type': 'Organization', name: SITE_NAME}};
  }

  emit(file, page({
    file: file, root: '../', page: 'detail', nav: item.kind, kind: item.kind, id: item.id,
    title: item.title + ' — ' + k.noun + ' · ' + SITE_NAME,
    ogTitle: item.title + ' · ' + SITE_NAME,
    desc: desc, image: k.og, ogType: item.kind === 'articles' ? 'article' : 'website',
    imageAlt: item.title + ' on ' + SITE_NAME,
    heading: item.title, jsonld: ld, play: play, bundle: bundleRel,
  }));
});

/* ---------- 404 (self-contained: it can be served from any URL depth) ---------- */
write('404.html', '<!DOCTYPE html>\n<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
'<title>Page not found · ' + SITE_NAME + '</title><meta name="robots" content="noindex"><meta name="theme-color" content="' + THEME_COLOR + '">\n' +
'<link rel="icon" type="image/svg+xml" href="' + SITE_URL + 'assets/img/favicon.svg">\n' +
'<style>:root{color-scheme:dark}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0b0c0f;color:#eef0f4;font-family:ui-sans-serif,system-ui,sans-serif}' +
'main{max-width:560px;padding:32px}.c{font:600 clamp(80px,22vw,160px)/.9 ui-monospace,Menlo,monospace;color:transparent;-webkit-text-stroke:1px #6b98e6;margin:0 0 18px;letter-spacing:-.06em}' +
'h1{font-size:28px;letter-spacing:-.03em;margin:0 0 10px}p{color:#8d93a0;line-height:1.6;margin:0 0 24px}' +
'a{display:inline-block;margin:0 8px 8px 0;padding:10px 14px;border:1px solid #232730;background:#111318;color:#eef0f4;text-decoration:none;font-size:13px;border-radius:3px}a.p{background:#6b98e6;border-color:#6b98e6;color:#0b0c0f;font-weight:600}</style></head>\n' +
'<body><main><p class="c" aria-hidden="true">404</p><h1>Nothing lives at this address</h1><p>The page may have been renamed or moved, or the link has a typo.</p>' +
'<a class="p" href="' + SITE_URL + '">Home</a><a href="' + SITE_URL + 'tools.html">Tools</a><a href="' + SITE_URL + 'games.html">Games</a><a href="' + SITE_URL + 'library.html">Library</a></main></body></html>\n');
written.push('404.html');

/* ---------- sitemap, robots, .nojekyll ---------- */
write('sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  urls.map(function(u){ return '  <url><loc>' + SITE_URL + u + '</loc></url>'; }).join('\n') + '\n</urlset>\n');
write('robots.txt', 'User-agent: *\nAllow: /\n\nSitemap: ' + SITE_URL + 'sitemap.xml\n');
write('.nojekyll', '');

/* ---------- report ---------- */
console.log('Built ' + written.length + ' pages for ' + SITE_URL);
if(warnings.length){ console.log('\nWarnings:'); warnings.forEach(function(w){ console.log('  - ' + w); }); }
