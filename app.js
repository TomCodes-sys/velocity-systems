// app.js — hash router + all page rendering for Velocity Systems.
// Plain vanilla JS, no build step, works from file:// and any static host.

/* ---------- persisted state ---------- */
var DEFAULT_SETTINGS = {theme:'light',accent:'blue',font:'sans',density:'compact',radius:'sharp',animations:true,effects:true,notifications:true,pinnedNav:null,customAccent:'#3b82f6',customSurface:'#0a0a0c'};

/* ---------- storage: localStorage with an automatic cookie fallback ----------
   Some browsers (Safari private mode, embedded webviews, iPad "Prevent
   Cross-Site Tracking" edge cases) throw on localStorage. We fall back to
   cookies so preferences and bookmarks still survive a reload there. */
function cookieSet(key, val){
  try {
    document.cookie = encodeURIComponent(key)+'='+encodeURIComponent(val)+';path=/;max-age=31536000;SameSite=Lax';
  } catch(e){}
}
function cookieGet(key){
  try {
    var match = document.cookie.match(new RegExp('(?:^|; )'+encodeURIComponent(key).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : null;
  } catch(e){ return null; }
}
function storeGet(key){
  try {
    var v = localStorage.getItem(key);
    if(v !== null) return v;
  } catch(e){}
  return cookieGet(key);
}
function storeSet(key, val){
  var ok = false;
  try { localStorage.setItem(key, val); ok = true; } catch(e){}
  // Mirror small values into a cookie so they survive if localStorage is blocked.
  if(val.length < 3500) cookieSet(key, val);
  return ok;
}
function readLS(key, fallback){
  try { var raw = storeGet(key); if(raw===null||raw===undefined) return fallback; var v = JSON.parse(raw); return v===null||v===undefined ? fallback : v; }
  catch(e){ return fallback; }
}

/* ---------- Toast notifications ---------- */
function toast(msg, type, opts){
  opts = opts || {};
  if(settings.notifications === false && !opts.force) return;
  var root = document.getElementById('toast-root');
  if(!root){ root = document.createElement('div'); root.id = 'toast-root'; document.body.appendChild(root); }
  var iconName = type==='ok' ? 'check' : type==='err' ? 'alert' : type==='warn' ? 'alert' : 'info';
  var el = document.createElement('div');
  el.className = 'toast'+(type?' '+type:'');
  el.innerHTML = '<span class="t-icon">'+icon(iconName,{size:15})+'</span><span>'+esc(msg)+'</span>';
  root.appendChild(el);
  var life = opts.duration || 2600;
  setTimeout(function(){
    el.classList.add('leaving');
    setTimeout(function(){ if(el.parentNode) el.remove(); }, 260);
  }, life);
}
var settings = readLS('system-settings', DEFAULT_SETTINGS);
var favorites = readLS('system-favorites', []);
var recent = readLS('system-recent', []);

function saveSettings(){ storeSet('system-settings', JSON.stringify(settings)); applyTheme(); }
function saveFavorites(){ storeSet('system-favorites', JSON.stringify(favorites)); }
function saveRecent(){ storeSet('system-recent', JSON.stringify(recent)); }
function toggleFavorite(id){
  var i = favorites.indexOf(id);
  var added;
  if(i>-1){ favorites.splice(i,1); added = false; } else { favorites.push(id); added = true; }
  saveFavorites();
  var item = getItem(id);
  var name = item ? item.title : 'Item';
  toast(added ? 'Saved "'+name+'" to bookmarks' : 'Removed "'+name+'" from bookmarks', added?'ok':null);
  return added;
}
function recordView(id){
  recent = [id].concat(recent.filter(function(x){return x!==id;})).slice(0,12);
  saveRecent();
}
function applyTheme(){
  var d = document.documentElement.dataset;
  d.theme = settings.theme; d.accent = settings.accent; d.font = settings.font;
  d.density = settings.density; d.radius = settings.radius;
  d.motion = settings.animations ? 'on' : 'off';
  d.effects = settings.effects ? 'on' : 'off';
  var root = document.documentElement.style;
  if(settings.theme === 'custom'){
    var acc = settings.customAccent || '#3b82f6';
    var bg = settings.customSurface || '#0a0a0c';
    root.setProperty('--accent', acc);
    root.setProperty('--accent-rgb', hexToRgbTriplet(acc));
    root.setProperty('--surface', bg);
    root.setProperty('--surface-1', shadeHex(bg, 6));
    root.setProperty('--surface-2', shadeHex(bg, 12));
    root.setProperty('--line', shadeHex(bg, 22));
    root.setProperty('--text', isDark(bg) ? '#f2f2f7' : '#171717');
    root.setProperty('--muted', isDark(bg) ? '#9a9aa2' : '#70706b');
  } else {
    ['--accent','--accent-rgb','--surface','--surface-1','--surface-2','--line','--text','--muted'].forEach(function(v){ root.removeProperty(v); });
  }
}
function hexToRgbTriplet(hex){
  var r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
  return r+' '+g+' '+b;
}
function isDark(hex){
  var r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
  return (0.299*r+0.587*g+0.114*b) < 140;
}
function shadeHex(hex, amount){
  var r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
  var dark = isDark(hex);
  function adj(c){ return Math.max(0, Math.min(255, dark ? c+amount : c-amount)); }
  return '#'+[adj(r),adj(g),adj(b)].map(function(x){ return Math.round(x).toString(16).padStart(2,'0'); }).join('');
}
applyTheme();

/* ---------- small utils ---------- */
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
function pad2(n){ return String(n).padStart(2,'0'); }
function qs(sel, root){ return (root||document).querySelector(sel); }
function qsa(sel, root){ return Array.prototype.slice.call((root||document).querySelectorAll(sel)); }

/* ---------- search matching ----------
   Supports plain text, multiple space-separated terms (all must match), and
   explicit field filters like `tag:open source`, `type:software`,
   `platform:windows`, `category:media`. Bare terms also match tags, so
   searching "open source" finds everything tagged Open Source. */
function matchesQuery(item, q){
  if(!q) return true;
  var haystack = [item.title, item.description, item.category, item.type, item.platform]
    .concat(item.tags)
    .concat(item.free ? ['free'] : ['paid'])
    .concat(item.openSource ? ['open source','opensource'] : [])
    .join(' ').toLowerCase();

  // Pull out field:value filters first (value may contain spaces up to the next field:)
  var text = q.toLowerCase();
  var fieldRe = /\b(tag|type|platform|category|status)\s*:\s*([^:]*?)(?=\s+\w+\s*:|$)/g;
  var m, ok = true, consumed = '';
  while((m = fieldRe.exec(text)) !== null){
    consumed += m[0]+' ';
    var field = m[1], val = m[2].trim();
    if(!val) continue;
    var against;
    if(field==='tag') against = item.tags.join(' ').toLowerCase();
    else if(field==='type') against = String(item.type).toLowerCase();
    else if(field==='platform') against = String(item.platform).toLowerCase();
    else if(field==='category') against = String(item.category).toLowerCase();
    else against = String(item.status||'').toLowerCase();
    if(against.indexOf(val) === -1) ok = false;
  }
  if(!ok) return false;

  var rest = text;
  consumed.trim().split(/\s+(?=\w+\s*:)/).forEach(function(c){ if(c) rest = rest.replace(c, ' '); });
  rest = rest.replace(fieldRe,' ').trim();
  if(!rest) return true;
  // Whole phrase match wins; otherwise every term must appear somewhere.
  if(haystack.indexOf(rest) > -1) return true;
  return rest.split(/\s+/).every(function(term){ return haystack.indexOf(term) > -1; });
}

/* ---------- markdown (minimal: ##, [text](url), - lists, paragraphs) ---------- */
function renderMarkdown(md){
  var lines = md.split('\n');
  var html = ''; var i = 0;
  function inline(text){
    return esc(text).replace(/\[([^\]]+)\]\(([^)]+)\)/g, function(_,label,url){
      var safeUrl = esc(url);
      if(url.indexOf('/') === 0){
        return '<a href="#'+safeUrl+'">'+label+'</a>';
      }
      return '<a href="'+safeUrl+'" target="_blank" rel="noreferrer">'+label+'</a>';
    });
  }
  while(i < lines.length){
    var line = lines[i];
    if(/^\s*$/.test(line)){ i++; continue; }
    if(/^##\s+/.test(line)){ html += '<h2>'+inline(line.replace(/^##\s+/,''))+'</h2>'; i++; continue; }
    if(/^-\s+/.test(line)){
      var items = [];
      while(i<lines.length && /^-\s+/.test(lines[i])){ items.push(inline(lines[i].replace(/^-\s+/,''))); i++; }
      html += '<ul>'+items.map(function(x){return '<li>'+x+'</li>';}).join('')+'</ul>';
      continue;
    }
    var para = [];
    while(i<lines.length && !/^\s*$/.test(lines[i]) && !/^##\s+/.test(lines[i]) && !/^-\s+/.test(lines[i])){ para.push(lines[i]); i++; }
    html += '<p>'+inline(para.join(' '))+'</p>';
  }
  return html;
}

/* ---------- shared UI: card / image / favorite ---------- */
function entryImageHtml(item){
  if(item.image) return '<img class="entry-image" src="'+esc(item.image)+'" alt="'+esc(item.title)+'" loading="lazy" data-fallback-kind="'+item.kind+'" data-fallback-type="'+esc(item.type)+'" onerror="handleImageFallback(this)">';
  return placeholderImageHtml(item);
}
function placeholderImageHtml(item){
  return '<div class="placeholder-image"><span class="ph-brand">VELOCITY SYSTEMS</span>'+
    icon(kindMeta[item.kind].icon, {size:26, cls:'ph-icon'})+
    '<b class="ph-type">'+esc(item.type)+'</b></div>';
}
// If a remote image URL 404s or fails to load, swap in the same placeholder
// used for items with no image at all, rather than leaving a broken icon.
function handleImageFallback(img){
  var kind = img.getAttribute('data-fallback-kind');
  var type = img.getAttribute('data-fallback-type');
  var div = document.createElement('div');
  div.className = 'placeholder-image';
  div.innerHTML = '<span class="ph-brand">VELOCITY SYSTEMS</span>'+icon(kindMeta[kind].icon,{size:26,cls:'ph-icon'})+'<b class="ph-type">'+esc(type)+'</b>';
  img.replaceWith(div);
}
function favoriteButtonHtml(item, size){
  var active = favorites.indexOf(item.id) > -1;
  return '<button class="icon-action'+(active?' saved':'')+'" data-fav-toggle="'+esc(item.id)+'" aria-pressed="'+active+'" aria-label="'+(active?'Remove from favourites':'Save '+esc(item.title))+'">'+
    icon('bookmark', {size:size||18, fill: active ? 'currentColor' : 'none'})+
  '</button>';
}
// Compact list/grid card — text only, no thumbnail. The image itself only
// ever appears on the item's own detail page (see pageDetail's hero-img).
function contentCardHtml(item){
  var tags = item.tags.slice(0,3).map(function(t){ return '<a href="#/search?tag='+encodeURIComponent(t)+'" class="card-tag-link">#'+esc(t)+'</a>'; }).join('');
  var foot = item.openSource ? '<span class="badge ok">Open Source</span>' : '';
  foot += item.free ? '<span class="badge">Free</span>' : (!item.openSource ? '<span class="badge">'+esc(item.status)+'</span>' : '');
  // The whole card is clickable via a full-card overlay link (so users don't
  // have to aim for the title). The favorite button and tag links sit in
  // their own stacking context above it so they still work independently.
  return '<article class="data-card">'+
    '<a href="#/'+item.kind+'/'+item.id+'" class="card-stretched-link" aria-label="Open '+esc(item.title)+'"></a>'+
    '<div class="card-body">'+
      '<div class="card-top">'+
        '<span class="card-kind-icon">'+icon(kindMeta[item.kind].icon,{size:15})+'</span>'+
        favoriteButtonHtml(item)+
      '</div>'+
      '<div class="type-code" style="margin:8px 0 4px">['+esc(item.type.toUpperCase())+']</div>'+
      '<h3>'+esc(item.title)+'</h3><span class="card-cat">'+esc(item.category)+'</span>'+
      '<p>'+esc(item.description)+'</p>'+
      '<div class="tag-row">'+tags+'</div>'+
      '<div class="card-foot">'+foot+'</div>'+
    '</div></article>';
}
function cardGrid(list, extraClass){ return '<div class="card-grid'+(extraClass?' '+extraClass:'')+'">'+list.map(contentCardHtml).join('')+'</div>'; }

/* delegated click handling for favorite buttons (works across every re-render) */
document.addEventListener('click', function(e){
  var btn = e.target.closest && e.target.closest('[data-fav-toggle]');
  if(!btn) return;
  e.preventDefault(); e.stopPropagation();
  var id = btn.getAttribute('data-fav-toggle');
  var added = toggleFavorite(id);
  patchFavoriteButtons(id, added ? btn : null);
});

// Patch every instance of this item's favorite button in the DOM in place —
// no full page re-render, so scroll position, open filters, and typed search
// text are never disturbed just from bookmarking something.
function patchFavoriteButtons(id, animateBtn){
  var active = favorites.indexOf(id) > -1;
  qsa('[data-fav-toggle="'+id+'"]').forEach(function(btn){
    btn.classList.toggle('saved', active);
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    btn.innerHTML = icon('bookmark', {fill: active ? 'currentColor' : 'none'});
  });
  if(animateBtn){
    animateBtn.classList.remove('just-saved');
    void animateBtn.offsetWidth; // restart the animation
    animateBtn.classList.add('just-saved');
  }
  // Keep the sidebar's bookmarks list and the top-right shortcuts in sync too.
  renderSidebarBookmarks();
  renderNavPins();
}

/* ---------- shell (sidebar / command bar / footer) ---------- */
var NAV_LINKS = [
  ['#/', 'Home', 'home'],
  ['#/games', 'Games', 'gamepad'],
  ['#/tools', 'Tools', 'wrench'],
  ['#/library', 'Library', 'package'],
  ['#/articles', 'Articles', 'newspaper'],
  ['#/search', 'Search', 'search'],
  ['#/settings', 'Settings', 'settings'],
];
function renderShellOnce(){
  document.body.innerHTML =
    '<div class="site-shell">'+
      '<aside class="sidebar" id="sidebar">'+
        '<a href="#/" class="brand"><span class="brand-mark">V</span><span>VELOCITY<br><b>SYSTEMS</b></span></a>'+
        '<nav id="nav" aria-label="Primary navigation">'+
          NAV_LINKS.map(function(l){ return '<a href="'+l[0]+'" class="nav-link" data-route="'+l[0]+'">'+icon(l[2])+'<span>'+l[1]+'</span></a>'; }).join('')+
        '</nav>'+
        '<div class="sidebar-bookmarks" id="sidebar-bookmarks"></div>'+
        '<div class="rail-meta"><span>VELOCITY / 01</span><span>LOCAL MODE</span></div>'+
      '</aside>'+
      '<button class="scrim" id="scrim" aria-label="Close navigation" style="display:none"></button>'+
      '<div class="workspace">'+
        '<header class="command-bar">'+
          '<button class="menu-button" id="menu-btn" aria-label="Open navigation">'+icon('menu',{size:19})+'</button>'+
          '<form class="global-search" id="cmd-search"><span>'+icon('search')+'</span><input placeholder="Search games, tools, software, tags…" aria-label="Search all content"><span class="key">'+icon('command',{size:11})+' K</span></form>'+
          '<div class="nav-pins" id="nav-pins"></div>'+
        '</header>'+
        '<main id="app"></main>'+
        '<footer><span>System Monolith</span><span>Static archive · Local preferences</span></footer>'+
      '</div>'+
    '</div>';

  var sidebar = qs('#sidebar'), scrim = qs('#scrim'), menuBtn = qs('#menu-btn');
  menuBtn.addEventListener('click', function(){ sidebar.classList.add('is-open'); scrim.style.display='block'; });
  scrim.addEventListener('click', function(){ sidebar.classList.remove('is-open'); scrim.style.display='none'; });
  qsa('.nav-link', sidebar).forEach(function(a){ a.addEventListener('click', function(){ sidebar.classList.remove('is-open'); scrim.style.display='none'; }); });

  qs('#cmd-search').addEventListener('submit', function(e){
    e.preventDefault();
    var v = this.querySelector('input').value.trim();
    if(v) location.hash = '#/search?q='+encodeURIComponent(v);
  });

  renderNavPins();
  window.addEventListener('resize', layoutNavPins);
}

/* ---------- top-right pinned shortcuts (nav pinning) ----------
   Which of the main routes show as quick-access pills in the command bar,
   configurable from Settings. Anything that doesn't fit collapses into a
   "more" dropdown rather than wrapping or overflowing the bar. */
function renderNavPins(){
  var container = qs('#nav-pins');
  if(!container) return;
  var favItems = favorites.map(getItem).filter(Boolean);
  if(!favItems.length){ container.innerHTML=''; return; }
  container.innerHTML = favItems.map(function(item){
    return '<a href="#/'+item.kind+'/'+item.id+'" class="nav-pin-link" title="'+esc(item.title)+'">'+icon(kindMeta[item.kind].icon,{size:13})+'<span>'+esc(item.title)+'</span></a>';
  }).join('') +
  '<div class="nav-pin-more" id="nav-pin-more" style="display:none">'+
    '<button class="nav-pin-more-btn" id="nav-pin-more-btn" aria-label="More bookmarks">'+icon('menu',{size:14})+'</button>'+
    '<div class="nav-pin-dropdown" id="nav-pin-dropdown"></div>'+
  '</div>';
  qs('#nav-pin-more-btn').addEventListener('click', function(e){
    e.stopPropagation();
    qs('#nav-pin-dropdown').classList.toggle('open');
  });
  document.addEventListener('click', function closeDropdown(e){
    var dd = qs('#nav-pin-dropdown');
    if(dd && !e.target.closest('#nav-pin-more')) dd.classList.remove('open');
  });
  requestAnimationFrame(layoutNavPins);
}
function layoutNavPins(){
  var container = qs('#nav-pins');
  if(!container) return;
  var links = qsa('.nav-pin-link', container);
  var moreWrap = qs('#nav-pin-more');
  if(!moreWrap) return;
  moreWrap.style.display = 'none';
  links.forEach(function(l){ l.style.display = ''; });
  if(!links.length) return;
  var avail = container.clientWidth - 40;
  var used = 0, overflow = [];
  links.forEach(function(l){
    var w = l.offsetWidth + 6;
    if(used + w <= avail){ used += w; } else { l.style.display = 'none'; overflow.push(l); }
  });
  if(overflow.length){
    moreWrap.style.display = '';
    qs('#nav-pin-dropdown').innerHTML = overflow.map(function(l){
      return '<a href="'+l.getAttribute('href')+'">'+esc(l.getAttribute('title'))+'</a>';
    }).join('');
  }
}
function renderSidebarBookmarks(){
  var container = qs('#sidebar-bookmarks');
  if(!container) return;
  var favItems = favorites.map(getItem).filter(Boolean);
  if(!favItems.length){
    container.innerHTML = '<div class="sb-head">BOOKMARKS</div><div class="sb-empty">Nothing saved yet</div>';
    return;
  }
  var groups = {};
  favItems.forEach(function(item){ (groups[item.kind] = groups[item.kind] || []).push(item); });
  var order = ['games','tools','library','articles'];
  var html = '<div class="sb-head">BOOKMARKS ('+favItems.length+')</div>';
  order.forEach(function(kind){
    if(!groups[kind]) return;
    html += '<div class="sb-group"><div class="sb-group-label">'+kindLabels[kind]+' · '+groups[kind].length+'</div>'+
      groups[kind].map(function(item){
        return '<a href="#/'+item.kind+'/'+item.id+'" class="sb-item" title="'+esc(item.title)+'">'+esc(item.title)+'</a>';
      }).join('')+
    '</div>';
  });
  container.innerHTML = html;
}
function updateNavActive(){
  var current = location.hash || '#/';
  var path = current.split('?')[0];
  qsa('.nav-link').forEach(function(a){
    var route = a.getAttribute('data-route');
    var isActive = route === '#/' ? (path === '#/' || path === '') : path.indexOf(route) === 0;
    a.classList.toggle('active', isActive);
  });
}

/* ---------- home page ---------- */
function pageHome(){
  var featured = ['powertoys','json-formatter','windows-toolkit','snake'].map(getItem).filter(Boolean);
  var tools = items.filter(function(x){return x.kind==='tools';}).slice(0,4);
  var software = items.filter(function(x){return x.kind==='library';}).slice(0,4);
  var articles = items.filter(function(x){return x.kind==='articles';}).slice(0,4);
  var saved = favorites.map(getItem).filter(Boolean);
  var viewed = recent.map(getItem).filter(Boolean);

  var html = '';
  html += '<section class="intro">'+
    '<span class="section-code">VELOCITY SYSTEMS / INDEX</span>'+
    '<h1 class="intro-title">Velocity Systems</h1>'+
    '<p class="tagline">Useful software, tools, games and guides — all in one place.</p>'+
    '<form class="intro-search" id="intro-search">'+icon('search',{size:18})+'<input placeholder="Search games, tools, software, guides…" aria-label="Search the archive"><button type="submit">Search</button></form>'+
    '<div class="intro-quick">'+
      '<a href="#/games">Games</a><a href="#/tools">Tools</a><a href="#/library">Library</a><a href="#/articles">Articles</a>'+
      '<a href="#/search?collection=essential-windows">Collections</a>'+
    '</div></section>';

  function section(title, eyebrow, list, link){
    return '<section class="home-section"><div class="hs-head"><div><span>'+eyebrow+'</span><h2>'+title+'</h2></div>'+
      (link ? '<a href="'+link.to+'">'+link.label+' →</a>' : '')+'</div>'+cardGrid(list,'home-grid')+'</section>';
  }
  var gameCount = items.filter(function(x){return x.kind==='games';}).length;
  var toolCount = items.filter(function(x){return x.kind==='tools';}).length;
  var libCount = items.filter(function(x){return x.kind==='library';}).length;
  html += '<section class="about-block">'+
    '<span class="section-code">ABOUT / VELOCITY SYSTEMS</span>'+
    '<p class="about-lead">Velocity Systems is a curated catalogue of software worth knowing about — plus a set of games and utilities that run entirely in your browser. No accounts, no tracking, no uploads: everything you do here stays on your device.</p>'+
    '<div class="about-grid">'+
      '<div class="about-item"><h3>'+icon('package',{size:16})+'A curated library</h3><p>Hand-picked Windows software, open-source projects and useful websites, each with the links, platforms and licensing details you actually need before installing something.</p></div>'+
      '<div class="about-item"><h3>'+icon('zap',{size:16})+'Tools that just run</h3><p>Converters, generators, formatters and image utilities that work instantly in the browser. Nothing to install, and your files never leave the page.</p></div>'+
      '<div class="about-item"><h3>'+icon('gamepad',{size:16})+'Games for a spare minute</h3><p>Browser classics with proper difficulty settings and saved high scores — quick to load, easy to close, no ads in the middle.</p></div>'+
      '<div class="about-item"><h3>'+icon('shield',{size:16})+'Private by default</h3><p>Bookmarks, scores and preferences are stored locally in your own browser. There is no backend and nothing is ever sent anywhere.</p></div>'+
    '</div>'+
    '<div class="about-stats">'+
      '<div><b>'+gameCount+'</b><span>Games</span></div>'+
      '<div><b>'+toolCount+'</b><span>Tools</span></div>'+
      '<div><b>'+libCount+'</b><span>Library entries</span></div>'+
      '<div><b>'+collections.length+'</b><span>Collections</span></div>'+
    '</div>'+
  '</section>';
  html += section('Featured', 'EDITORS / PICKS', featured);
  html += section('Popular Tools', 'BUILD / UTILITIES', tools, {to:'#/tools', label:'All tools'});
  html += section('Featured Software', 'DISCOVER / PROJECTS', software, {to:'#/library', label:'Browse library'});
  html += section('Latest Articles', 'READ / GUIDES', articles, {to:'#/articles', label:'All articles'});

  if(saved.length || viewed.length){
    html += '<section class="section-block personal"><div class="section-title"><span>LOCAL / YOUR ARCHIVE</span><h2>Saved & recent</h2><p>Stored privately in this browser.</p></div>';
    if(saved.length) html += '<div class="personal-group"><h3>Favourites</h3>'+cardGrid(saved.slice(0,3))+'</div>';
    if(viewed.length) html += '<div class="personal-group"><h3>Recently viewed</h3>'+cardGrid(viewed.slice(0,3))+'</div>';
    html += '</section>';
  }

  html += '<section class="home-section"><div class="hs-head"><div><span>CURATED / COLLECTIONS</span><h2>Collections</h2></div></div><div class="collections-list">'+
    collections.map(function(c,i){
      return '<a class="collection-card" href="#/search?collection='+c.id+'"><span>'+pad2(i+1)+'</span><div><h3>'+esc(c.title)+'</h3><p>'+esc(c.description)+'</p><small>'+c.items.length+' ITEMS · '+c.tags.join(' / ')+'</small></div>'+icon('arrowRight',{size:18})+'</a>';
    }).join('')+
  '</div></section>';

  qs('#app').innerHTML = html;
  qs('#intro-search').addEventListener('submit', function(e){
    e.preventDefault();
    var v = this.querySelector('input').value.trim();
    if(v) location.hash = '#/search?q='+encodeURIComponent(v);
  });
}

/* ---------- catalog view (games/tools/library/articles) ---------- */
function pageCatalog(kind, title, eyebrow, description){
  var all = items.filter(function(x){ return x.kind===kind; });
  var state = { query:'', category:'All', platform:'All', tag:'All', price:'All', openSource:'All', sort:'recommended' };

  function categories(){ return ['All'].concat(Array.from(new Set(all.map(function(x){return x.category;})))); }
  function platforms(){ return ['All'].concat(Array.from(new Set(all.map(function(x){return x.platform;})))); }
  function allTags(){ var s=new Set(); all.forEach(function(x){ x.tags.forEach(function(t){s.add(t);}); }); return ['All'].concat(Array.from(s)); }
  function passesFilters(x){
    var q = state.query.toLowerCase();
    var match = matchesQuery(x, q);
    if(!match) return false;
    if(state.category!=='All' && x.category!==state.category) return false;
    if(state.platform!=='All' && x.platform!==state.platform) return false;
    if(state.tag!=='All' && x.tags.indexOf(state.tag)===-1) return false;
    if(state.price==='Free' && !x.free) return false;
    if(state.price==='Paid' && x.free) return false;
    if(state.openSource==='Yes' && !x.openSource) return false;
    if(state.openSource==='No' && x.openSource) return false;
    return true;
  }
  function filtered(){
    var list = all.filter(passesFilters);
    if(state.sort==='alphabetical') list = list.slice().sort(function(a,b){ return a.title.localeCompare(b.title); });
    else if(state.sort==='recent') list = list.slice().reverse();
    return list;
  }

  qs('#app').innerHTML =
    '<section class="page-heading"><span>'+eyebrow+'</span><h1>'+title+'</h1><p>'+description+'</p>'+
      '<div class="catalog-search">'+icon('search',{size:16})+'<input id="cat-search" placeholder="Search '+title.toLowerCase()+'…" aria-label="Search '+title+'"></div>'+
      '<b id="cat-count"></b>'+
    '</section>'+
    '<div class="split-view">'+
      '<aside class="filters" id="cat-filters" aria-label="Filters"></aside>'+
      '<section class="card-grid" id="cat-results" aria-label="'+title+' results"></section>'+
    '</div>';

  function renderResultsAndFilters(){
    var shown = filtered();
    qs('#cat-count').textContent = pad2(shown.length)+' ENTRIES';

    var sortHtml = '<label>Sort</label><select id="cat-sort" class="cat-sort-select">'+
      ['recommended','recent','alphabetical'].map(function(s){
        var lbl = s==='recommended'?'Recommended':s==='recent'?'Recently added':'Alphabetical';
        return '<option value="'+s+'"'+(state.sort===s?' selected':'')+'>'+lbl+'</option>';
      }).join('')+'</select>';

    var priceHtml = '<label>Price</label>'+['All','Free','Paid'].map(function(p){
      return '<button class="'+(state.price===p?'selected':'')+'" data-price="'+p+'">'+p+'</button>';
    }).join('');

    var osHtml = '<label>Open Source</label>'+['All','Yes','No'].map(function(o){
      return '<button class="'+(state.openSource===o?'selected':'')+'" data-os="'+o+'">'+o+'</button>';
    }).join('');

    var tagHtml = '<label>Tags</label><div class="tag-filter-wrap">'+allTags().map(function(t){
      return '<button class="'+(state.tag===t?'selected':'')+'" data-tag="'+esc(t)+'">'+esc(t)+'</button>';
    }).join('')+'</div>';

    var catHtml = '<label>Category</label>'+categories().map(function(c){
      var count = all.filter(function(y){return c==='All'||y.category===c;}).length;
      return '<button class="'+(state.category===c?'selected':'')+'" data-cat="'+esc(c)+'">'+esc(c)+'<i>'+count+'</i></button>';
    }).join('');
    var platHtml = '<label>Platform</label>'+platforms().map(function(p){
      return '<button class="'+(state.platform===p?'selected':'')+'" data-plat="'+esc(p)+'">'+esc(p)+'</button>';
    }).join('');

    qs('#cat-filters').innerHTML = sortHtml + priceHtml + osHtml + tagHtml + catHtml + platHtml;
    qs('#cat-results').innerHTML = shown.length ? shown.map(contentCardHtml).join('') : '<div class="empty-state">No entries match these filters.</div>';

    qs('#cat-sort').addEventListener('change', function(){ state.sort = this.value; renderResultsAndFilters(); });
    qsa('[data-price]', qs('#cat-filters')).forEach(function(b){ b.addEventListener('click', function(){ state.price = b.getAttribute('data-price'); renderResultsAndFilters(); }); });
    qsa('[data-os]', qs('#cat-filters')).forEach(function(b){ b.addEventListener('click', function(){ state.openSource = b.getAttribute('data-os'); renderResultsAndFilters(); }); });
    qsa('[data-tag]', qs('#cat-filters')).forEach(function(b){ b.addEventListener('click', function(){ state.tag = b.getAttribute('data-tag'); renderResultsAndFilters(); }); });
    qsa('[data-cat]', qs('#cat-filters')).forEach(function(b){
      b.addEventListener('click', function(){ state.category = b.getAttribute('data-cat'); renderResultsAndFilters(); });
    });
    qsa('[data-plat]', qs('#cat-filters')).forEach(function(b){
      b.addEventListener('click', function(){ state.platform = b.getAttribute('data-plat'); renderResultsAndFilters(); });
    });
  }
  qs('#cat-search').addEventListener('input', function(){ state.query = this.value; renderResultsAndFilters(); });
  renderResultsAndFilters();
}

/* ---------- detail page ---------- */
function pageDetail(kind, id){
  var item = getItem(id);
  if(!item || item.kind !== kind){
    qs('#app').innerHTML = '<div class="empty-state">Entry not found.</div>';
    return;
  }
  recordView(item.id);
  var related = (item.links||[]).map(getItem).filter(Boolean);
  var meta = kindMeta[item.kind];

  var tagsHtml = item.tags.map(function(t){ return '<a href="#/search?tag='+encodeURIComponent(t)+'">#'+esc(t)+'</a>'; }).join('');
  var actions = '';
  if(item.website) actions += '<a href="'+esc(item.website)+'" target="_blank" rel="noreferrer">Official website '+icon('external',{size:15})+'</a>';
  if(item.github) actions += '<a href="'+esc(item.github)+'" target="_blank" rel="noreferrer">'+icon('github',{size:15})+' GitHub</a>';
  actions += favoriteButtonHtml(item, 20).replace('icon-action','icon-action detail-fav');

  var html = '<div class="detail">'+
    '<nav class="breadcrumb" aria-label="Breadcrumb"><a href="#/">Home</a><span>/</span><a href="#/'+item.kind+'">'+esc(meta.label)+'</a><span>/</span><span>'+esc(item.category)+'</span><span>/</span><span>'+esc(item.title)+'</span></nav>'+
    '<div class="detail-hero">'+
      '<div><span class="type-code">['+esc(item.type.toUpperCase())+'] · '+esc(item.status)+'</span><h1>'+esc(item.title)+'</h1><p>'+esc(item.description)+'</p>'+
      '<div class="tag-row">'+tagsHtml+'</div><div class="detail-actions">'+actions+'</div></div>'+
      '<div class="hero-img">'+entryImageHtml(item)+'</div>'+
    '</div>'+
    '<div class="detail-meta">'+
      '<div><span>Category</span><b>'+esc(item.category)+'</b></div>'+
      '<div><span>Platform</span><b>'+esc(item.platform)+'</b></div>'+
      '<div><span>Access</span><b>'+(item.free?'Free':'Paid')+'</b></div>'+
      '<div><span>Source</span><b>'+(item.openSource?'Open source':'Proprietary')+'</b></div>'+
    '</div>';

  if(item.playable) html += '<div id="embed-slot"></div>';

  if(item.features) html += '<div class="detail-features"><h2>Features</h2><ul>'+item.features.map(function(f){return '<li>'+esc(f)+'</li>';}).join('')+'</ul></div>';
  if(item.body) html += '<div class="article-body">'+renderMarkdown(item.body)+'</div>';
  if(related.length) html += '<section class="section-block"><div class="section-title"><span>CONNECTED / REFERENCES</span><h2>Related entries</h2></div>'+cardGrid(related)+'</section>';
  html += '</div>';

  qs('#app').innerHTML = html;
  if(item.playable && PLAYABLES[item.playable]){
    PLAYABLES[item.playable](qs('#embed-slot'));
  }
}

/* ---------- search page ---------- */
function pageSearch(params){
  var collection = collections.find(function(c){ return c.id === params.collection; });
  var query = params.q || params.tag || '';

  qs('#app').innerHTML =
    '<section class="page-heading"><span>COMMAND / GLOBAL INDEX</span><h1 id="search-title"></h1><p id="search-sub"></p></section>'+
    '<div class="search-page">'+
      '<div class="search-large">'+icon('search')+'<input id="search-input" placeholder="Search all indexed content…"></div>'+
      '<div id="search-results"></div>'+
    '</div>';

  var input = qs('#search-input');
  input.value = query;
  if(!collection) setTimeout(function(){ input.focus(); }, 0);

  function run(){
    var q = input.value.toLowerCase();
    var results;
    if(collection){
      qs('#search-title').textContent = collection.title;
      qs('#search-sub').textContent = collection.description;
      results = items.filter(function(x){ return collection.items.indexOf(x.id) > -1; });
    } else {
      qs('#search-title').textContent = 'Search';
      qs('#search-sub').textContent = 'Find games, tools, software, projects, guides, tags, and collections.';
      results = items.filter(function(x){
        return matchesQuery(x, q);
      });
    }
    var out = '';
    Object.keys(kindLabels).forEach(function(kind){
      var group = results.filter(function(x){ return x.kind===kind; });
      if(!group.length) return;
      out += '<section class="result-group"><div><h2>'+kindLabels[kind]+'</h2><span>'+group.length+' RESULTS</span></div>'+cardGrid(group)+'</section>';
    });
    if(!results.length) out = '<div class="empty-state">No indexed content matches "'+esc(input.value)+'".</div>';
    qs('#search-results').innerHTML = out;
  }
  input.addEventListener('input', function(){
    if(!collection){
      // Keep the URL shareable, but replace the history entry directly rather
      // than assigning location.hash — that would fire hashchange, re-render
      // the page, and yank focus out of the box mid-keystroke.
      var newHash = '#/search?q='+encodeURIComponent(input.value);
      _lastRenderedPath = '/search';
      try { history.replaceState(null, '', newHash); }
      catch(e){ /* file:// in some browsers blocks replaceState — URL just won't update */ }
    }
    run();
  });
  run();
}

/* ---------- settings page ---------- */
var THEME_LIST = [
  ['light','Light'],['system','Follow system'],['paper','Paper'],['nordlight','Nord Light'],['windows','Windows'],
  ['minimal','Minimal Dark'],['amoled','AMOLED'],['midnight','Midnight'],['slate','Slate'],
  ['nord','Nord'],['dracula','Dracula'],['gruvbox','Gruvbox'],
  ['cyber','Cyberpunk'],['retro','Retro'],['terminal','Terminal'],['glass','Glass'],['future','Futuristic'],
  ['custom','Custom'],['ocean','Ocean'],['forest','Forest'],['rose','Rose'],['solar','Solar'],['grape','Grape'],
];
var CHOICE_GROUPS = {accent:['blue','purple','red','green'], font:['sans','mono','serif'], density:['compact','comfortable','spacious'], radius:['sharp','soft','round']};
function pageSettings(){
  function themeButtons(){
    return THEME_LIST.map(function(t){
      var id=t[0], label=t[1];
      return '<button data-theme-choice="'+id+'" class="'+(settings.theme===id?'selected':'')+'"><i></i><span>'+label+'</span><span class="theme-check">'+(settings.theme===id?icon('check',{size:15}):'')+'</span></button>';
    }).join('');
  }
  function choiceRows(){
    return Object.keys(CHOICE_GROUPS).map(function(key){
      return '<div class="setting-row"><label>'+key+'</label><div>'+CHOICE_GROUPS[key].map(function(v){
        return '<button data-choice-key="'+key+'" data-choice-val="'+v+'" class="'+(settings[key]===v?'selected':'')+'">'+v+'</button>';
      }).join('')+'</div></div>';
    }).join('');
  }
  function toggleRows(){
    return [['animations','Animations'],['effects','Visual effects'],['notifications','Notifications']].map(function(t){
      var key=t[0], label=t[1];
      return '<div class="setting-row"><label>'+label+'</label><button class="switch '+(settings[key]?'on':'')+'" data-toggle-key="'+key+'" aria-pressed="'+!!settings[key]+'"><i></i></button></div>';
    }).join('');
  }
  function shortcutRow(){
    return '<div class="setting-row" style="align-items:flex-start;flex-direction:column;gap:6px"><label>Top-right shortcuts</label>'+
      '<p style="color:var(--muted);font-size:13px;margin:0">Bookmark anything and it automatically appears as a quick-access link in the top-right of the command bar — no separate setup needed.</p>'+
      '</div>';
  }
  function customThemeBuilder(){
    return '<div class="custom-theme-panel">'+
      '<h2>Custom theme</h2><p style="color:var(--muted);font-size:13px;margin:4px 0 0">Pick your own accent and background colour, then select "Custom" above to use it.</p>'+
      '<div class="custom-theme-row" style="margin-top:16px">'+
        '<div class="custom-theme-field"><label>Accent</label><input type="color" id="custom-accent" value="'+(settings.customAccent||'#3b82f6')+'"></div>'+
        '<div class="custom-theme-field"><label>Background</label><input type="color" id="custom-bg" value="'+(settings.customSurface||'#0a0a0c')+'"></div>'+
        '<div class="custom-theme-preview" id="custom-theme-preview">Preview</div>'+
        '<button class="game-btn" id="custom-theme-apply">Use this theme</button>'+
      '</div>'+
    '</div>';
  }
  qs('#app').innerHTML =
    '<section class="page-heading"><span>CONTROL / VISUAL LAYER</span><h1>Settings</h1><p>Transform the interface without changing how the archive works. Choices are saved in your browser.</p></section>'+
    '<div class="settings-grid">'+
      '<section><h2>Appearance</h2><p>Choose a complete visual system. Light is the default; "Follow system" tracks your OS light/dark setting.</p><div class="theme-grid" id="theme-grid">'+themeButtons()+'</div>'+customThemeBuilder()+'</section>'+
      '<section id="interface-section"><h2>Interface</h2>'+choiceRows()+toggleRows()+shortcutRow()+
        '<div class="setting-row"><label>Reset</label><div><button class="game-btn secondary" id="reset-prefs">Reset preferences</button></div></div>'+
      '</section>'+
    '</div>';

  // Settings are patched in place rather than re-rendered — a full re-render
  // combined with smooth-scrolling made the page jump around on every click.
  function selectTheme(id){
    settings.theme = id; saveSettings();
    qsa('[data-theme-choice]').forEach(function(b){
      var on = b.getAttribute('data-theme-choice')===id;
      b.classList.toggle('selected', on);
      b.querySelector('.theme-check').innerHTML = on ? icon('check',{size:15}) : '';
    });
    toast('Theme set to '+(THEME_LIST.filter(function(t){return t[0]===id;})[0]||[,id])[1], 'ok');
  }
  qsa('[data-theme-choice]').forEach(function(b){
    b.addEventListener('click', function(){ selectTheme(b.getAttribute('data-theme-choice')); });
  });
  qsa('[data-choice-key]').forEach(function(b){
    b.addEventListener('click', function(){
      var key=b.getAttribute('data-choice-key'), val=b.getAttribute('data-choice-val');
      settings[key]=val; saveSettings();
      qsa('[data-choice-key="'+key+'"]').forEach(function(x){
        x.classList.toggle('selected', x.getAttribute('data-choice-val')===val);
      });
    });
  });
  qsa('[data-toggle-key]').forEach(function(b){
    b.addEventListener('click', function(){
      var k=b.getAttribute('data-toggle-key');
      settings[k]=!settings[k]; saveSettings();
      b.classList.toggle('on', !!settings[k]);
      b.setAttribute('aria-pressed', !!settings[k]);
      if(k==='notifications' && settings[k]) toast('Notifications enabled','ok',{force:true});
    });
  });
  function updateThemePreview(){
    var acc = qs('#custom-accent').value, bg = qs('#custom-bg').value;
    var prev = qs('#custom-theme-preview');
    prev.style.background = bg;
    prev.style.color = isDark(bg) ? '#f2f2f7' : '#171717';
    prev.style.border = '1px solid '+acc;
    prev.innerHTML = '<span style="color:'+acc+'">Accent</span>&nbsp;on background';
  }
  if(qs('#custom-accent')){
    updateThemePreview();
    qs('#custom-accent').addEventListener('input', updateThemePreview);
    qs('#custom-bg').addEventListener('input', updateThemePreview);
    qs('#custom-theme-apply').addEventListener('click', function(){
      settings.customAccent = qs('#custom-accent').value;
      settings.customSurface = qs('#custom-bg').value;
      selectTheme('custom');
    });
  }
  qs('#reset-prefs').addEventListener('click', function(){
    settings = Object.assign({}, DEFAULT_SETTINGS);
    saveSettings();
    pageSettings();
    toast('Preferences reset to defaults','ok',{force:true});
  });
}

/* ---------- 404 ---------- */
function page404(path){
  qs('#app').innerHTML =
    '<div class="empty-state" style="padding-top:110px">'+
      '<div style="font-size:90px;font-weight:200;opacity:.5">404</div>'+
      '<hr style="border:none;border-top:1px solid var(--line);max-width:200px;margin:20px auto">'+
      '<h2 style="margin:0 0 10px">Page Not Found</h2>'+
      '<p style="margin:0 0 22px">No route matches "'+esc(path)+'".</p>'+
      '<a class="primary-action" href="#/">← Go Home</a>'+
    '</div>';
}

/* ---------- router ---------- */
function parseHash(){
  var raw = (location.hash || '#/').slice(1); // strip leading '#'
  var qIndex = raw.indexOf('?');
  var path = qIndex>-1 ? raw.slice(0,qIndex) : raw;
  var queryStr = qIndex>-1 ? raw.slice(qIndex+1) : '';
  var params = {};
  queryStr.split('&').forEach(function(pair){
    if(!pair) return;
    var eq = pair.indexOf('=');
    var k = decodeURIComponent(eq>-1?pair.slice(0,eq):pair);
    var v = eq>-1 ? decodeURIComponent(pair.slice(eq+1)) : '';
    params[k] = v;
  });
  var segs = path.split('/').filter(Boolean);
  return {path:path||'/', segs:segs, params:params};
}
var CATALOG_ROUTES = {
  games:   ['Games','PLAY / BROWSER SANDBOX','Focused browser games that load quickly and respect your time.'],
  tools:   ['Tools','BUILD / BROWSER UTILITIES','Private, practical utilities designed to run directly in your browser.'],
  library: ['Library','DISCOVER / EXTERNAL PROJECTS','A curated directory of dependable software, websites, and open-source projects.'],
  articles:['Articles','LEARN / TECHNICAL NOTES','Practical guides, informed recommendations, and durable technical knowledge.'],
};
var _lastRenderedPath = null;
var _searchTypingScroll = null;
function render(){
  var r = parseHash();
  var segs = r.segs;
  var samePath = (_lastRenderedPath === r.path);

  // Typing in the search box rewrites the ?q= param, which fires hashchange.
  // That's a live filter, not a navigation, so remember where the user was.
  var keepScroll = samePath ? window.scrollY : 0;

  if(segs.length===0){ pageHome(); }
  else if(segs.length===1 && CATALOG_ROUTES[segs[0]]){
    var c = CATALOG_ROUTES[segs[0]]; pageCatalog(segs[0], c[0], c[1], c[2]);
  }
  else if(segs.length===1 && segs[0]==='search'){ pageSearch(r.params); }
  else if(segs.length===1 && segs[0]==='settings'){ pageSettings(); }
  else if(segs.length===2 && CATALOG_ROUTES[segs[0]]){ pageDetail(segs[0], segs[1]); }
  else { page404('/'+segs.join('/')); }

  updateNavActive();
  _lastRenderedPath = r.path;
  window.scrollTo(0, keepScroll);
}

/* ---------- boot ---------- */
document.addEventListener('DOMContentLoaded', function(){
  renderShellOnce();
  renderSidebarBookmarks();
  render();
  window.addEventListener('hashchange', render);
});
