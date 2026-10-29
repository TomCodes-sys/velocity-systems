// app.js — hash router + all page rendering for Velocity Systems.
// Plain vanilla JS, no build step, works from file:// and any static host.

/* ---------- persisted state ---------- */
var DEFAULT_SETTINGS = {theme:'light',accent:'blue',font:'sans',density:'compact',radius:'sharp',animations:true,effects:true,icons:'lucide',notifications:true,pinnedNav:null,customAccent:'#3b82f6',customSurface:'#0a0a0c'};

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

/* ---------- Toast notifications ----------
   Bottom-right stack. Each toast has a type label, a close button, an optional
   action, a thin countdown line, pauses while hovered/focused, and repeats of
   the same message collapse into one toast with a counter. */
var TOAST_LABELS = {ok:'Done', err:'Error', warn:'Warning', info:'Info'};
var TOAST_LIFE = {ok:3200, info:3600, warn:5200, err:7000};
var TOAST_MAX = 4;
var _toasts = [];
var _toastRaf = null;
function toast(msg, type, opts){
  opts = opts || {};
  if(settings.notifications === false && !opts.force) return null;
  type = (type==='ok' || type==='err' || type==='warn') ? type : 'info';
  var root = document.getElementById('toast-root');
  if(!root){
    root = document.createElement('div');
    root.id = 'toast-root';
    document.body.appendChild(root);
  }
  for(var i=0;i<_toasts.length;i++){
    var t = _toasts[i];
    if(!t.leaving && t.msg===msg && t.type===type){
      t.count++; t.remaining = t.life;
      t.el.querySelector('.t-count').textContent = '×'+t.count;
      t.el.classList.add('has-count');
      return t.el;
    }
  }
  var iconName = type==='ok' ? 'check' : (type==='err' || type==='warn') ? 'alert' : 'info';
  var el = document.createElement('div');
  el.className = 'toast '+type;
  el.setAttribute('role', type==='err' ? 'alert' : 'status');
  el.innerHTML =
    '<span class="t-icon">'+icon(iconName,{size:15})+'</span>'+
    '<div class="t-body"><span class="t-label">'+TOAST_LABELS[type]+'</span><span class="t-msg">'+esc(msg)+'</span></div>'+
    '<span class="t-count"></span>'+
    (opts.action ? '<button type="button" class="t-action">'+esc(opts.action.label)+'</button>' : '')+
    '<button type="button" class="t-close" aria-label="Dismiss notification">'+icon('x',{size:13})+'</button>'+
    '<span class="t-timer"></span>';
  var life = opts.duration || TOAST_LIFE[type];
  var rec = {el:el, msg:msg, type:type, count:1, life:life, remaining:life, paused:false, leaving:false,
             sticky:!!opts.sticky, last:performance.now(), timer:el.querySelector('.t-timer')};
  if(rec.sticky) rec.timer.style.display = 'none';
  el.addEventListener('mouseenter', function(){ rec.paused = true; });
  el.addEventListener('mouseleave', function(){ rec.paused = false; });
  el.addEventListener('focusin', function(){ rec.paused = true; });
  el.addEventListener('focusout', function(){ rec.paused = false; });
  el.querySelector('.t-close').addEventListener('click', function(){ dismissToast(rec); });
  if(opts.action){
    el.querySelector('.t-action').addEventListener('click', function(){
      try { opts.action.run(); } finally { dismissToast(rec); }
    });
  }
  root.appendChild(el);
  _toasts.push(rec);
  var live = _toasts.filter(function(x){ return !x.leaving; });
  while(live.length > TOAST_MAX){ dismissToast(live.shift()); }
  if(!_toastRaf) _toastRaf = requestAnimationFrame(toastTick);
  return el;
}
function dismissToast(rec){
  if(rec.leaving) return;
  rec.leaving = true;
  if(rec.el.parentNode) rec.el.remove();
  var i = _toasts.indexOf(rec); if(i > -1) _toasts.splice(i, 1);
}
function toastTick(now){
  var running = false;
  _toasts.slice().forEach(function(t){
    if(t.leaving) return;
    var dt = Math.min(100, now - t.last); t.last = now;
    if(t.sticky) return;
    running = true;
    if(!t.paused) t.remaining -= dt;
    t.timer.style.transform = 'scaleX('+Math.max(0, t.remaining / t.life)+')';
    if(t.remaining <= 0) dismissToast(t);
  });
  _toastRaf = running ? requestAnimationFrame(toastTick) : null;
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
  d.icons = settings.icons || 'lucide';
  ICON_SET = settings.icons || 'lucide';
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


/* ---------- URLs ----------
   Every page is its own HTML file. <body data-root> says how far up the site
   root is ('' on top-level pages, '../' inside games/ tools/ library/ articles/). */
var ROOT = document.body.getAttribute('data-root') || '';
function itemUrl(item){ return ROOT + item.kind + '/' + item.id + '.html'; }
function kindUrl(kind){ return ROOT + kind + '.html'; }
function pageUrl(name){ return ROOT + (name === 'home' ? 'index' : name) + '.html'; }
function searchUrl(params){
  var q = Object.keys(params||{}).filter(function(k){ return params[k]; })
    .map(function(k){ return encodeURIComponent(k)+'='+encodeURIComponent(params[k]); }).join('&');
  return ROOT + 'search.html' + (q ? '?'+q : '');
}
function queryParams(){
  var out = {};
  try { new URLSearchParams(location.search).forEach(function(v,k){ out[k] = v; }); } catch(e){}
  return out;
}
function slugify(s){ return String(s).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''); }

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
        var path = url.replace(/^\//,'').replace(/\/$/,'');
        return '<a href="'+ROOT+(path.indexOf('/')>-1 ? path+'.html' : path+'.html')+'">'+label+'</a>';
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
  var tags = item.tags.slice(0,3).map(function(t){ return '<a href="'+searchUrl({tag:t})+'" class="card-tag-link">#'+esc(t)+'</a>'; }).join('');
  var foot = item.openSource ? '<span class="badge ok">Open Source</span>' : '';
  foot += item.free ? '<span class="badge">Free</span>' : (!item.openSource ? '<span class="badge">'+esc(item.status)+'</span>' : '');
  // The whole card is clickable via a full-card overlay link (so users don't
  // have to aim for the title). The favorite button and tag links sit in
  // their own stacking context above it so they still work independently.
  return '<article class="data-card">'+
    '<a href="'+itemUrl(item)+'" class="card-stretched-link" aria-label="Open '+esc(item.title)+'"></a>'+
    '<div class="card-body">'+
      '<div class="card-top">'+
        (item.emoji ? '<span class="card-emoji" aria-hidden="true">'+item.emoji+'</span>' : '<span class="card-kind-icon">'+icon(kindMeta[item.kind].icon,{size:15})+'</span>')+
        favoriteButtonHtml(item)+
      '</div>'+
      '<div class="type-code" style="margin:8px 0 4px">'+esc(item.type)+'</div>'+
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
  ['home', 'Home', 'home'],
  ['games', 'Games', 'gamepad'],
  ['tools', 'Tools', 'wrench'],
  ['library', 'Library', 'package'],
  ['articles', 'Articles', 'newspaper'],
  ['search', 'Search', 'search'],
  ['settings', 'Settings', 'settings'],
];
function renderShellOnce(){
  var shell =
    '<a class="skip-link" href="#app" id="skip-link">Skip to content</a>'+
    '<div class="site-shell">'+
      '<aside class="sidebar" id="sidebar">'+
        '<a href="'+pageUrl('home')+'" class="brand"><img class="brand-mark brand-logo-img" src="'+ROOT+'assets/img/velocity-mark.png" alt="" width="32" height="32"><span>VELOCITY<br><b>SYSTEMS</b></span></a>'+
        '<nav id="nav" aria-label="Primary navigation">'+
          NAV_LINKS.map(function(l){ return '<a href="'+pageUrl(l[0])+'" class="nav-link" data-route="'+l[0]+'" title="'+l[1]+'">'+icon(l[2])+'<span>'+l[1]+'</span></a>'; }).join('')+
        '</nav>'+
        '<div class="sidebar-bookmarks" id="sidebar-bookmarks"></div>'+
        '<button type="button" class="rail-toggle" id="rail-toggle" aria-controls="sidebar"><span class="rail-arrow">'+icon('chevronDown',{size:16})+'</span><span class="rail-label">Collapse</span></button>'+
        '<div class="rail-meta"><span>VELOCITY / 01</span><span>LOCAL MODE</span></div>'+
      '</aside>'+
      '<button class="scrim" id="scrim" aria-label="Close navigation" style="display:none"></button>'+
      '<div class="workspace">'+
        '<header class="command-bar">'+
          '<button class="menu-button" id="menu-btn" aria-label="Open navigation">'+icon('menu',{size:19})+'</button>'+
          '<form class="global-search" id="cmd-search" action="'+pageUrl('search')+'" method="get"><span>'+icon('search')+'</span><input name="q" placeholder="Search games, tools, software, tags…" aria-label="Search all content" autocomplete="off"><span class="key" aria-hidden="true">/</span></form>'+
          '<div class="nav-pins" id="nav-pins"></div>'+
        '</header>'+
        '<main id="app" tabindex="-1"></main>'+
        '<footer><span>Velocity Systems</span><span>Static archive · Local preferences</span></footer>'+
      '</div>'+
    '</div>';
  document.body.insertAdjacentHTML('afterbegin', shell);

  var sidebar = qs('#sidebar'), scrim = qs('#scrim'), menuBtn = qs('#menu-btn');
  menuBtn.addEventListener('click', function(){ sidebar.classList.add('is-open'); scrim.style.display='block'; });
  scrim.addEventListener('click', function(){ sidebar.classList.remove('is-open'); scrim.style.display='none'; });
  qsa('.nav-link', sidebar).forEach(function(a){ a.addEventListener('click', function(){ sidebar.classList.remove('is-open'); scrim.style.display='none'; }); });
  qs('#skip-link').addEventListener('click', function(e){ e.preventDefault(); qs('#app').focus(); });

  // Sidebar: full (icons + text) or slim (icons only). Remembered; "[" toggles it from the keyboard.
  var railBtn = qs('#rail-toggle'), root = document.documentElement;
  function paintRail(){
    var slim = root.dataset.rail === 'collapsed';
    railBtn.setAttribute('aria-expanded', String(!slim));
    railBtn.setAttribute('aria-label', slim ? 'Expand sidebar' : 'Collapse sidebar');
    railBtn.title = slim ? 'Expand sidebar  [' : 'Collapse sidebar  [';
    qs('.rail-label', railBtn).textContent = slim ? 'Expand' : 'Collapse';
  }
  function toggleRail(){
    root.dataset.rail = root.dataset.rail === 'collapsed' ? 'open' : 'collapsed';
    storeSet('vs-rail', root.dataset.rail === 'collapsed' ? 'collapsed' : 'open'); paintRail();
  }
  if(!root.dataset.rail) root.dataset.rail = 'open';
  paintRail(); railBtn.addEventListener('click', toggleRail);
  document.addEventListener('keydown', function(e){
    if(e.key !== '[' || e.ctrlKey || e.metaKey || e.altKey) return;
    var t = e.target, tag = t && t.tagName;
    if(tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)) return;
    toggleRail();
  });

  // The command-bar search is a real GET form, so it works without any routing.
  // Remember what was searched on the way past.
  qs('#cmd-search').addEventListener('submit', function(){
    var v = this.querySelector('input').value.trim();
    if(v) rememberSearch(v);
  });
  // "/" focuses the search box from anywhere that isn't a text field.
  document.addEventListener('keydown', function(e){
    if(e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
    var t = e.target, tag = t && t.tagName;
    if(tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)) return;
    e.preventDefault();
    var box = qs('#cmd-search input'); if(box) box.focus();
  });

  renderNavPins();
  window.addEventListener('resize', layoutNavPins);
}

/* ---------- recent searches (kept in this browser) ---------- */
var searchHistory = readLS('vs-search-history', []);
function rememberSearch(q){
  q = String(q||'').trim();
  if(!q) return;
  searchHistory = [q].concat(searchHistory.filter(function(x){ return x.toLowerCase() !== q.toLowerCase(); })).slice(0, 8);
  storeSet('vs-search-history', JSON.stringify(searchHistory));
}

/* ---------- top-right pinned shortcuts (nav pinning) ----------
   Which of the main routes show as quick-access pills in the command bar,
   configurable from Settings. Anything that doesn't fit collapses into a
   "more" dropdown rather than wrapping or overflowing the bar. */
var navPinDocumentClickBound = false, activePinDragId = null;
function reorderPinnedItem(target){
  if(!activePinDragId || !target || target===activePinDragId) return;
  var from=favorites.indexOf(activePinDragId), to=favorites.indexOf(target);
  if(from<0 || to<0) return;
  var moved=favorites.splice(from,1)[0]; favorites.splice(to,0,moved); activePinDragId=null; saveFavorites(); renderSidebarBookmarks(); renderNavPins();
}
function renderNavPins(){
  var container = qs('#nav-pins');
  if(!container) return;
  var favItems = favorites.map(getItem).filter(Boolean);
  if(!favItems.length){ container.innerHTML=''; return; }
  container.innerHTML = favItems.map(function(item){
    return '<a href="'+itemUrl(item)+'" class="nav-pin-link" data-pin-id="'+esc(item.id)+'" draggable="true" title="Drag to reorder · '+esc(item.title)+'">'+icon(kindMeta[item.kind].icon,{size:13})+'<span>'+esc(item.title)+'</span></a>';
  }).join('') +
  '<div class="nav-pin-more" id="nav-pin-more" style="display:none">'+
    '<button class="nav-pin-more-btn" id="nav-pin-more-btn" aria-label="More bookmarks">'+icon('menu',{size:14})+'</button>'+
    '<div class="nav-pin-dropdown" id="nav-pin-dropdown"></div>'+
  '</div>';
  qs('#nav-pin-more-btn').addEventListener('click', function(e){
    e.stopPropagation();
    qs('#nav-pin-dropdown').classList.toggle('open');
  });
  if(!navPinDocumentClickBound){
    document.addEventListener('click', function closeDropdown(e){
      var dd = qs('#nav-pin-dropdown');
      if(dd && !e.target.closest('#nav-pin-more')) dd.classList.remove('open');
    });
    navPinDocumentClickBound = true;
  }
  var links = qsa('.nav-pin-link', container);
  links.forEach(function(link){
    link.addEventListener('dragstart', function(e){ activePinDragId=link.getAttribute('data-pin-id'); link.classList.add('dragging'); if(e.dataTransfer){e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',activePinDragId);} });
    link.addEventListener('dragend', function(){activePinDragId=null; links.forEach(function(x){x.classList.remove('dragging','drag-over');});});
    link.addEventListener('dragover', function(e){ if(activePinDragId && activePinDragId!==link.getAttribute('data-pin-id')){e.preventDefault();link.classList.add('drag-over');} });
    link.addEventListener('dragleave', function(){link.classList.remove('drag-over');});
    link.addEventListener('drop', function(e){if(!activePinDragId)return;e.preventDefault();reorderPinnedItem(link.getAttribute('data-pin-id'));});
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
  var widths = links.map(function(l){return l.offsetWidth + 6;});
  var total = widths.reduce(function(a,b){return a+b;},0);
  var avail = Math.max(0,container.clientWidth);
  /* Only reserve the overflow button when there really is overflow. This avoids
     needlessly hiding the last pin behind the menu while a little space remains. */
  if(total <= avail) return;
  moreWrap.style.display = '';
  var reserve = moreWrap.offsetWidth + 6;
  avail = Math.max(0,avail-reserve);
  var used = 0, overflow = [];
  links.forEach(function(l,i){
    if(used + widths[i] <= avail){ used += widths[i]; }
    else { l.style.display = 'none'; overflow.push(l); }
  });
  if(!overflow.length) moreWrap.style.display = 'none';
  qs('#nav-pin-dropdown').innerHTML = overflow.map(function(l){
    return '<a href="'+l.getAttribute('href')+'" data-pin-id="'+esc(l.getAttribute('data-pin-id'))+'" draggable="true">'+esc(l.getAttribute('title').replace(/^Drag to reorder · /,''))+'</a>';
  }).join('');
  qsa('#nav-pin-dropdown a',container).forEach(function(link){
    link.addEventListener('dragstart',function(e){activePinDragId=link.getAttribute('data-pin-id');if(e.dataTransfer){e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',activePinDragId);}});
    link.addEventListener('dragover',function(e){if(activePinDragId && activePinDragId!==link.getAttribute('data-pin-id'))e.preventDefault();});
    link.addEventListener('drop',function(e){if(!activePinDragId)return;e.preventDefault();reorderPinnedItem(link.getAttribute('data-pin-id'));});
    link.addEventListener('dragend',function(){activePinDragId=null;});
  });
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
        return '<a href="'+itemUrl(item)+'" class="sb-item" title="'+esc(item.title)+'">'+esc(item.title)+'</a>';
      }).join('')+
    '</div>';
  });
  container.innerHTML = html;
}
function updateNavActive(){
  var d = document.body.dataset;
  var current = d.nav || (d.page==='home' ? 'home' : d.kind) || '';
  qsa('.nav-link').forEach(function(a){
    var on = a.getAttribute('data-route') === current;
    a.classList.toggle('active', on);
    if(on) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current');
  });
}

/* ---------- home page ---------- */
function pageHome(){
  var featured = ['game-deals','powertoys','json-formatter','windows-toolkit','snake'].map(getItem).filter(Boolean);
  var tools = ['fraction-calculator','json-formatter','password-generator','markdown-preview'].map(getItem).filter(Boolean);
  var software = items.filter(function(x){return x.kind==='library';}).slice(0,4);
  var articles = items.filter(function(x){return x.kind==='articles';}).slice(0,4);
  var saved = favorites.map(getItem).filter(Boolean);
  var viewed = recent.map(getItem).filter(Boolean);

  var html = '';
  html += '<section class="intro">'+
    '<span class="section-code">VELOCITY SYSTEMS / INDEX</span>'+
    '<h1 class="intro-title">Velocity Systems</h1>'+
    '<p class="tagline">Free software, open-source alternatives, practical browser tools, games and guides — including alternatives to expensive creative and office suites.</p>'+
    '<form class="intro-search" id="intro-search" action="'+pageUrl('search')+'" method="get">'+icon('search',{size:18})+'<input name="q" placeholder="Search games, tools, software, guides…" aria-label="Search the archive" autocomplete="off"><button type="submit">Search</button></form>'+
    '<div class="intro-quick">'+
      '<a href="'+kindUrl('games')+'">Games</a><a href="'+kindUrl('tools')+'">Tools</a><a href="'+kindUrl('library')+'">Library</a><a href="'+kindUrl('articles')+'">Articles</a>'+
      '<a href="'+searchUrl({collection:'essential-windows'})+'">Collections</a>'+
    '</div></section>';
  html += '<section class="home-convert" aria-labelledby="home-convert-title"><div class="hs-head"><div><span>QUICK / CONVERSION</span><h2 id="home-convert-title">Quick converter</h2></div><a href="'+kindUrl('tools')+'">All tools →</a></div>'+
    '<div class="hc-controls"><label class="field"><span class="field-label">Convert</span><select id="hc-mode"><option value="unit">Units</option><option value="currency">Currency</option></select></label>'+
    '<label class="field" id="hc-family-wrap"><span class="field-label">Unit type</span><select id="hc-family"><option>Length</option><option>Mass</option><option>Data</option><option>Temperature</option></select></label>'+
    '<label class="field"><span class="field-label">Amount</span><input type="number" id="hc-amount" value="1" step="any"></label>'+
    '<label class="field"><span class="field-label">From</span><select id="hc-from"></select></label>'+
    '<label class="field"><span class="field-label">To</span><select id="hc-to"></select></label>'+
    '<div class="hc-result"><span>RESULT</span><b id="hc-result">—</b><small id="hc-note">Choose units to convert</small></div></div></section>';

  function section(title, eyebrow, list, link){
    return '<section class="home-section"><div class="hs-head"><div><span>'+eyebrow+'</span><h2>'+title+'</h2></div>'+
      (link ? '<a href="'+link.to+'">'+link.label+' →</a>' : '')+'</div>'+cardGrid(list,'home-grid')+'</section>';
  }
  var gameCount = items.filter(function(x){return x.kind==='games';}).length;
  var toolCount = items.filter(function(x){return x.kind==='tools';}).length;
  var libCount = items.filter(function(x){return x.kind==='library';}).length;
  html += '<section class="about-block">'+
    '<span class="section-code">ABOUT / VELOCITY SYSTEMS</span>'+
    '<p class="about-lead">Velocity Systems is a curated directory of useful software, free and open-source alternatives, browser-based tools, games and practical guides. Find capable alternatives to parts of the Adobe Creative Cloud and Microsoft Office ecosystems — from image editing, media and design tools to document, spreadsheet and productivity software — without assuming every app is a one-to-one replacement. Each listing includes useful details and official links so you can compare options before installing. Our browser tools run locally where possible; favourites and preferences are stored in your browser, and the site does not require an account.</p>'+
    '<div class="about-grid">'+
      '<div class="about-item"><h3>'+icon('package',{size:16})+'A curated library</h3><p>Hand-picked Windows software, open-source projects and useful websites, each with the links, platforms and licensing details you actually need before installing something.</p></div>'+
      '<div class="about-item"><h3>'+icon('zap',{size:16})+'Tools that just run</h3><p>Converters, generators, formatters and image utilities that work instantly in the browser. Nothing to install, and your files never leave the page.</p></div>'+
      '<div class="about-item"><h3>'+icon('gamepad',{size:16})+'Games for a spare minute</h3><p>Browser classics with proper difficulty settings and saved high scores — quick to load, easy to close, no ads in the middle.</p></div>'+
      '<div class="about-item"><h3>'+icon('lock',{size:16})+'Private by default</h3><p>Bookmarks, scores and preferences are stored locally in your own browser. There is no backend and nothing is ever sent anywhere.</p></div>'+
    '</div>'+
    '<div class="about-stats">'+
      '<div><b>'+gameCount+'</b><span>Games</span></div>'+
      '<div><b>'+toolCount+'</b><span>Tools</span></div>'+
      '<div><b>'+libCount+'</b><span>Library entries</span></div>'+
      '<div><b>'+collections.length+'</b><span>Collections</span></div>'+
    '</div>'+
  '</section>';
  html += section('Featured', 'EDITORS / PICKS', featured);
  html += section('Popular Tools', 'BUILD / UTILITIES', tools, {to:kindUrl('tools'), label:'All tools'});
  html += section('Featured Software', 'DISCOVER / PROJECTS', software, {to:kindUrl('library'), label:'Browse library'});
  html += section('Latest Articles', 'READ / GUIDES', articles, {to:kindUrl('articles'), label:'All articles'});

  if(saved.length || viewed.length){
    html += '<section class="section-block personal"><div class="section-title"><span>LOCAL / YOUR ARCHIVE</span><h2>Saved & recent</h2><p>Stored privately in this browser.</p></div>';
    if(saved.length) html += '<div class="personal-group"><h3>Favourites</h3>'+cardGrid(saved.slice(0,3))+'</div>';
    if(viewed.length) html += '<div class="personal-group"><h3>Recently viewed</h3>'+cardGrid(viewed.slice(0,3))+'</div>';
    html += '</section>';
  }

  html += '<section class="home-section"><div class="hs-head"><div><span>CURATED / COLLECTIONS</span><h2>Collections</h2></div></div><div class="collections-list">'+
    collections.map(function(c,i){
      return '<a class="collection-card" href="'+searchUrl({collection:c.id})+'"><span>'+pad2(i+1)+'</span><div><h3>'+esc(c.title)+'</h3><p>'+esc(c.description)+'</p><small>'+c.items.length+' ITEMS · '+c.tags.join(' / ')+'</small></div>'+icon('arrowRight',{size:18})+'</a>';
    }).join('')+
  '</div></section>';

  qs('#app').innerHTML = html;
  qs('#intro-search').addEventListener('submit', function(){
    var v = this.querySelector('input').value.trim();
    if(v) rememberSearch(v);
  });
  (function initHomeConverter(){
    var mode=qs('#hc-mode'), family=qs('#hc-family'), amount=qs('#hc-amount'), from=qs('#hc-from'), to=qs('#hc-to'), result=qs('#hc-result'), note=qs('#hc-note');
    var units={
      Length:[['m','Metres',1],['km','Kilometres',1000],['cm','Centimetres',.01],['mm','Millimetres',.001],['mi','Miles',1609.344],['ft','Feet',.3048],['in','Inches',.0254]],
      Mass:[['kg','Kilograms',1],['g','Grams',.001],['lb','Pounds',.45359237],['oz','Ounces',.028349523125]],
      Data:[['MB','Megabytes',1],['GB','Gigabytes',1000],['KB','Kilobytes',.001],['MiB','Mebibytes',1.048576],['GiB','Gibibytes',1073.741824]],
      Temperature:[['C','Celsius'],['F','Fahrenheit'],['K','Kelvin']]
    };
    var rates=null;
    function fill(){
      var list=mode.value==='currency'?[['USD','US dollar'],['AUD','Australian dollar'],['EUR','Euro'],['GBP','British pound'],['NZD','New Zealand dollar'],['CAD','Canadian dollar'],['JPY','Japanese yen'],['CNY','Chinese yuan'],['INR','Indian rupee']]:units[family.value];
      from.innerHTML=to.innerHTML=list.map(function(x){return '<option value="'+x[0]+'">'+x[1]+' ('+x[0]+')</option>';}).join('');
      if(mode.value==='currency'){from.value='USD';to.value='AUD';}
      else if(family.value==='Length'){from.value='m';to.value='ft';}
      else if(family.value==='Mass'){from.value='kg';to.value='lb';}
      else if(family.value==='Data'){from.value='GB';to.value='MB';}
      else{from.value='C';to.value='F';}
      qs('#hc-family-wrap').hidden=mode.value==='currency'; calculate();
    }
    function temp(v,a,b){var c=a==='F'?(v-32)*5/9:a==='K'?v-273.15:v;return b==='F'?c*9/5+32:b==='K'?c+273.15:c;}
    function calculate(){
      var v=parseFloat(amount.value);if(!isFinite(v)){result.textContent='—';return;}
      if(mode.value==='currency'){
        if(!rates){result.textContent='…';note.textContent='Loading exchange rates';return;}
        var cv=v*rates[to.value]/rates[from.value];result.textContent=new Intl.NumberFormat(undefined,{style:'currency',currency:to.value,maximumFractionDigits:4}).format(cv);note.textContent='Reference rate from USD · live when connected';
      }else if(family.value==='Temperature'){result.textContent=temp(v,from.value,to.value).toLocaleString(undefined,{maximumFractionDigits:6})+' '+to.value;note.textContent='Temperature conversion';}
      else{var list=units[family.value],a=list.find(function(x){return x[0]===from.value;}),b=list.find(function(x){return x[0]===to.value;});result.textContent=(v*a[2]/b[2]).toLocaleString(undefined,{maximumFractionDigits:8})+' '+to.value;note.textContent=family.value+' conversion';}
    }
    mode.addEventListener('change',fill);family.addEventListener('change',fill);
    [amount,from,to].forEach(function(el){el.addEventListener('input',calculate);el.addEventListener('change',calculate);});
    fill();
    fetch('https://open.er-api.com/v6/latest/USD').then(function(r){if(!r.ok)throw new Error();return r.json();}).then(function(d){if(d&&d.result==='success'){rates=d.rates;calculate();}}).catch(function(){note.textContent='Currency rates unavailable offline';});
  })();
}

/* ---------- catalog view (games/tools/library/articles) ---------- */
function pageCatalog(kind, title, eyebrow, description){
  var all = items.filter(function(x){ return x.kind===kind; });
  var stateKey = 'vs-catalog-'+kind;
  var state = Object.assign({ query:'', category:'All', platform:'All', tag:'All', price:'All', openSource:'All', sort:'recommended' }, readLS(stateKey, {}), { query:'' });
  function persistState(){ var s = Object.assign({}, state); delete s.query; storeSet(stateKey, JSON.stringify(s)); }

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
    persistState();
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

/* ---------- sectioned catalog (Games and Tools) ----------
   Items are grouped into labelled sections by category, with a sticky row of
   jump links, live search, and collapsible sections that remember their state. */
function pageSectioned(kind){
  var meta = CATALOG_ROUTES[kind];
  var all = items.filter(function(x){ return x.kind===kind; });
  var defs = (sectionMeta[kind] || []).slice();
  var known = defs.map(function(d){ return d.category; });
  all.forEach(function(x){
    if(known.indexOf(x.category) === -1){ known.push(x.category); defs.push({category:x.category, title:x.category, blurb:''}); }
  });
  var collapsedKey = 'vs-collapsed-'+kind;
  var collapsed = readLS(collapsedKey, []);
  var query = '';

  qs('#app').innerHTML =
    '<section class="page-heading"><span>'+meta[1]+'</span><h1>'+meta[0]+'</h1><p>'+meta[2]+'</p>'+
      '<div class="catalog-search">'+icon('search',{size:16})+'<input id="cat-search" placeholder="Search '+meta[0].toLowerCase()+'…" aria-label="Search '+meta[0]+'" autocomplete="off"><button type="button" id="cat-clear" class="catalog-clear" hidden aria-label="Clear search">Clear</button></div>'+
      '<b id="cat-count"></b>'+
    '</section>'+
    (kind==='tools' ? '<section class="tool-discovery" id="tool-popular"><div class="tool-discovery-head"><span>Popular tools</span><small>QUICK ACCESS</small></div><div class="tool-shortcuts">'+[
      ['calculator','Calculator'],['unit-converter','Unit converter'],['password-generator','Password generator'],['json-formatter','JSON formatter'],['diff-checker','Text diff'],['qr-generator','QR generator']
    ].map(function(x){var it=getItem(x[0]);return it?'<a class="tool-shortcut" href="'+itemUrl(it)+'">'+(it.emoji||'•')+' '+esc(x[1])+'</a>':'';}).join('')+'</div></section>' : '')+
    '<nav class="section-nav" id="sec-nav" aria-label="Jump to a section"></nav>'+
    '<div id="sec-recent"></div>'+
    '<div id="sec-list"></div>';

  function render(){
    var q = query.trim().toLowerCase();
    var matched = all.filter(function(x){ return matchesQuery(x, q); });
    qs('#cat-count').textContent = pad2(matched.length)+' '+(matched.length===1?'ENTRY':'ENTRIES');

    var groups = defs.map(function(d){
      return {def:d, list: matched.filter(function(x){ return x.category===d.category; })};
    }).filter(function(g){ return g.list.length; });

    qs('#sec-nav').innerHTML = groups.map(function(g){
      return '<a href="#sec-'+slugify(g.def.category)+'" class="sec-chip" data-sec="'+slugify(g.def.category)+'">'+(g.def.icon ? icon(g.def.icon,{size:14}) : '')+esc(g.def.title)+'<i>'+g.list.length+'</i></a>';
    }).join('');

    // Recently opened items of this kind, only when not searching.
    var rec = q ? [] : recent.map(getItem).filter(function(x){ return x && x.kind===kind; }).slice(0,4);
    qs('#sec-recent').innerHTML = rec.length
      ? '<section class="cat-section cat-recent"><header class="cat-head static"><span class="cat-title">Recently used</span><span class="cat-count">'+pad2(rec.length)+'</span></header>'+cardGrid(rec)+'</section>'
      : '';

    qs('#sec-list').innerHTML = groups.length ? groups.map(function(g){
      var id = slugify(g.def.category);
      var isCollapsed = !q && collapsed.indexOf(id) > -1;
      return '<section class="cat-section'+(isCollapsed?' is-collapsed':'')+'" id="sec-'+id+'">'+
        '<header class="cat-head"><button type="button" class="cat-toggle" data-toggle="'+id+'" aria-expanded="'+(!isCollapsed)+'" aria-controls="grid-'+id+'">'+
          (g.def.icon ? '<span class="cat-icon">'+icon(g.def.icon,{size:18})+'</span>' : '')+'<span class="cat-title">'+esc(g.def.title)+'</span><span class="cat-count">'+pad2(g.list.length)+'</span>'+
          (g.def.blurb ? '<span class="cat-blurb">'+esc(g.def.blurb)+'</span>' : '')+
          '<span class="cat-chevron">'+icon('chevronDown',{size:16})+'</span>'+
        '</button></header>'+
        '<div class="card-grid" id="grid-'+id+'"'+(isCollapsed?' hidden':'')+'>'+g.list.map(contentCardHtml).join('')+'</div>'+
      '</section>';
    }).join('') : '<div class="empty-state">No '+meta[0].toLowerCase()+' match “'+esc(query)+'”.</div>';
  }

  function setCollapsed(id, on){
    var i = collapsed.indexOf(id);
    if(on && i === -1) collapsed.push(id);
    if(!on && i > -1) collapsed.splice(i, 1);
    storeSet(collapsedKey, JSON.stringify(collapsed));
  }
  qs('#sec-list').addEventListener('click', function(e){
    var btn = e.target.closest('[data-toggle]');
    if(!btn) return;
    var id = btn.getAttribute('data-toggle');
    var sec = btn.closest('.cat-section');
    var nowCollapsed = !sec.classList.contains('is-collapsed');
    sec.classList.toggle('is-collapsed', nowCollapsed);
    btn.setAttribute('aria-expanded', String(!nowCollapsed));
    qs('#grid-'+id).hidden = nowCollapsed;
    setCollapsed(id, nowCollapsed);
  });
  // Jumping to a section opens it if it was collapsed.
  qs('#sec-nav').addEventListener('click', function(e){
    var chip = e.target.closest('[data-sec]');
    if(!chip) return;
    e.preventDefault();
    var id = chip.getAttribute('data-sec');
    var sec = qs('#sec-'+id);
    if(!sec) return;
    if(sec.classList.contains('is-collapsed')){
      sec.classList.remove('is-collapsed'); qs('#grid-'+id).hidden = false;
      qs('[data-toggle="'+id+'"]', sec).setAttribute('aria-expanded','true');
      setCollapsed(id, false);
    }
    sec.scrollIntoView({behavior: settings.animations ? 'smooth' : 'auto', block:'start'});
    try { history.replaceState(null,'','#sec-'+id); } catch(err){}
  });
  qs('#cat-search').addEventListener('input', function(){ query = this.value; qs('#cat-clear').hidden = !query; var pop=qs('#tool-popular'); if(pop) pop.hidden=!!query.trim(); render(); });
  qs('#cat-clear').addEventListener('click', function(){ query=''; qs('#cat-search').value=''; qs('#cat-clear').hidden=true; var pop=qs('#tool-popular'); if(pop) pop.hidden=false; render(); qs('#cat-search').focus(); });
  render();
  if(location.hash.indexOf('#sec-') === 0){
    var target = qs(location.hash);
    if(target) setTimeout(function(){ target.scrollIntoView(); }, 0);
  }
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
  var relatedTitle = 'Related entries', relatedEyebrow = 'CONNECTED / REFERENCES';
  if(!related.length && (kind==='tools' || kind==='games')){
    related = items.filter(function(x){ return x.kind===kind && x.category===item.category && x.id!==item.id; }).slice(0,3);
    relatedTitle = 'More in '+item.category; relatedEyebrow = 'SAME SECTION';
  }
  var meta = kindMeta[item.kind];

  var tagsHtml = item.tags.map(function(t){ return '<a href="'+searchUrl({tag:t})+'">#'+esc(t)+'</a>'; }).join('');
  var actions = '';
  if(item.website) actions += '<a href="'+esc(item.website)+'" target="_blank" rel="noreferrer">Official website '+icon('external',{size:15})+'</a>';
  if(item.id === 'fxsound') actions += '<a class="primary-action" href="'+(kind==='library'?'../assets/downloads/MusicBoosted.fac':'assets/downloads/MusicBoosted.fac')+'" download="MusicBoosted.fac">Download MusicBoosted preset '+icon('download',{size:15})+'</a>';
  if(item.github) actions += '<a href="'+esc(item.github)+'" target="_blank" rel="noreferrer">'+icon('github',{size:15})+' GitHub</a>';
  actions += favoriteButtonHtml(item, 20).replace('icon-action','icon-action detail-fav');

  var playable = !!item.playable;
  var metaHtml = '<div class="detail-meta">'+
      '<div><span>Category</span><b>'+esc(item.category)+'</b></div>'+
      '<div><span>Platform</span><b>'+esc(item.platform)+'</b></div>'+
      '<div><span>Access</span><b>'+(item.free?'Free':'Paid')+'</b></div>'+
      '<div><span>Source</span><b>'+(item.openSource?'Open source':'Proprietary')+'</b></div>'+
    '</div>';
  // Games and tools get a compact header with the thing itself right underneath;
  // the big placeholder artwork is only for library entries and articles.
  var html = '<div class="detail'+(playable?' wide':'')+'">'+
    '<nav class="breadcrumb" aria-label="Breadcrumb"><a href="'+pageUrl('home')+'">Home</a><span>/</span><a href="'+kindUrl(item.kind)+'">'+esc(meta.label)+'</a><span>/</span><span>'+esc(item.category)+'</span><span>/</span><span>'+esc(item.title)+'</span></nav>'+
    '<div class="detail-hero'+(playable?' compact':'')+'">'+
      '<div><span class="type-code">'+esc(item.type)+' · '+esc(item.status)+'</span><h1>'+(item.emoji ? '<span class="title-emoji" aria-hidden="true">'+item.emoji+'</span> ' : '')+esc(item.title)+'</h1><p>'+esc(item.description)+'</p>'+
      '<div class="tag-row">'+tagsHtml+'</div><div class="detail-actions">'+actions+'</div></div>'+
      (playable ? '' : '<div class="hero-img">'+entryImageHtml(item)+'</div>')+
    '</div>';

  // The game/tool itself is mounted by assets/js/games.js or tools.js into this slot.
  if(playable) html += '<div id="embed-slot"></div>';
  if(!playable) html += metaHtml;   // the facts strip is only useful on library entries and articles

  if(item.id === 'fxsound') html += '<section class="detail-features"><h2>MusicBoosted custom preset</h2><p>Download the MusicBoosted.fac preset and import it in FxSound. This is a custom music-focused 10-band EQ preset; sound preferences and results vary by headphones, speakers and listening volume.</p><p><a class="primary-action" href="../assets/downloads/MusicBoosted.fac" download="MusicBoosted.fac">Download MusicBoosted.fac '+icon('download',{size:15})+'</a></p></section>';
  if(item.features) html += '<div class="detail-features"><h2>Features</h2><ul>'+item.features.map(function(f){return '<li>'+esc(f)+'</li>';}).join('')+'</ul></div>';
  if(item.body) html += '<div class="article-body">'+renderMarkdown(item.body)+'</div>';
  if(related.length) html += '<section class="section-block"><div class="section-title"><span>'+relatedEyebrow+'</span><h2>'+esc(relatedTitle)+'</h2></div>'+cardGrid(related)+'</section>';
  html += '</div>';
  qs('#app').innerHTML = html;
}

/* ---------- search page ---------- */
function pageSearch(params){
  var collection = collections.find(function(c){ return c.id === params.collection; });
  var query = params.q || params.tag || '';
  if(params.tag && !params.q) query = 'tag:'+params.tag;

  qs('#app').innerHTML =
    '<section class="page-heading"><span>COMMAND / GLOBAL INDEX</span><h1 id="search-title"></h1><p id="search-sub"></p></section>'+
    '<div class="search-page">'+
      '<div class="search-large">'+icon('search')+'<input id="search-input" aria-label="Search all content" placeholder="Search all indexed content…" autocomplete="off"></div>'+
      '<div class="recent-searches" id="recent-searches"></div>'+
      '<div id="search-results"></div>'+
    '</div>';

  var input = qs('#search-input');
  input.value = query;
  if(!collection) setTimeout(function(){ input.focus(); input.setSelectionRange(input.value.length, input.value.length); }, 0);

  function drawRecent(){
    var box = qs('#recent-searches');
    if(collection || !searchHistory.length){ box.innerHTML = ''; return; }
    box.innerHTML = '<span>RECENT</span>'+searchHistory.map(function(q){
      return '<button type="button" class="recent-chip" data-q="'+esc(q)+'">'+esc(q)+'</button>';
    }).join('')+'<button type="button" class="recent-clear" id="recent-clear">Clear</button>';
    qsa('.recent-chip', box).forEach(function(b){
      b.addEventListener('click', function(){ input.value = b.getAttribute('data-q'); input.focus(); run(); syncUrl(); });
    });
    qs('#recent-clear').addEventListener('click', function(){
      searchHistory = []; storeSet('vs-search-history', '[]'); drawRecent(); toast('Search history cleared','ok');
    });
  }
  function syncUrl(){
    // Keep the address shareable without adding a history entry per keystroke.
    var q = input.value.trim();
    try { history.replaceState(null, '', location.pathname + (q ? '?q='+encodeURIComponent(q) : '')); } catch(e){}
  }
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
      results = items.filter(function(x){ return matchesQuery(x, q); });
    }
    var out = '';
    Object.keys(kindLabels).forEach(function(kind){
      var group = results.filter(function(x){ return x.kind===kind; });
      if(!group.length) return;
      out += '<section class="result-group"><div><h2>'+kindLabels[kind]+'</h2><span>'+group.length+' RESULTS</span></div>'+cardGrid(group)+'</section>';
    });
    if(!results.length) out = '<div class="empty-state">No indexed content matches “'+esc(input.value)+'”.</div>';
    qs('#search-results').innerHTML = out;
  }
  var rememberTimer = null;
  input.addEventListener('input', function(){
    if(!collection) syncUrl();
    run();
    // Only remember a search once typing settles, so history isn't full of half-words.
    clearTimeout(rememberTimer);
    rememberTimer = setTimeout(function(){ if(input.value.trim().length > 1){ rememberSearch(input.value); drawRecent(); } }, 1200);
  });
  input.addEventListener('keydown', function(e){
    if(e.key === 'Enter' && input.value.trim()){ rememberSearch(input.value); drawRecent(); }
  });
  // Clicking a result counts as having searched for it.
  qs('#search-results').addEventListener('click', function(e){
    if(e.target.closest('a') && !collection && input.value.trim()) rememberSearch(input.value);
  });
  if(params.q && !collection) rememberSearch(params.q);
  drawRecent();
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
var CHOICE_GROUPS = {accent:['blue','purple','red','green'], font:['sans','mono','serif'], density:['compact','comfortable','spacious'], radius:['sharp','soft','round'], icons:['lucide','solar','remix','emoji']};
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
      return '<div class="setting-row"><label>'+label+'</label><button class="switch '+(settings[key]?'on':'')+'" data-toggle-key="'+key+'" aria-label="'+label+'" aria-pressed="'+!!settings[key]+'"><i></i></button></div>';
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
    '</div>'+
    '<div class="settings-data">'+dataPanelHtml()+'</div>';

  wireDataPanel();

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
      if(key==='icons'){ location.reload(); return; }   // icons are baked into the page, so redraw it
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


/* ---------- saved data (everything this site keeps in your browser) ---------- */
var STORE_PREFIXES = ['system-', 'vs-'];
function ownKeys(){
  var keys = [];
  try {
    for(var i=0;i<localStorage.length;i++){
      var k = localStorage.key(i);
      if(STORE_PREFIXES.some(function(p){ return k.indexOf(p)===0; })) keys.push(k);
    }
  } catch(e){}
  return keys.sort();
}
function storeGroup(key){
  if(key==='system-settings') return 'Preferences';
  if(key==='system-favorites') return 'Bookmarks';
  if(key==='system-recent' || key==='vs-search-history' || key.indexOf('vs-catalog-')===0 || key.indexOf('vs-collapsed-')===0) return 'Browsing';
  if(key.indexOf('vs-hist-')===0) return 'Tool history';
  if(key.indexOf('vs-http-')===0 || key==='vs-fx') return 'Cached data';
  if(key.indexOf('vs-state-')===0) return 'Tool inputs';
  return 'Games & other';
}
function storageSummary(){
  var groups = {}, total = 0;
  ownKeys().forEach(function(k){
    var size = (k.length + (localStorage.getItem(k)||'').length) * 2;
    total += size;
    var g = storeGroup(k);
    (groups[g] = groups[g] || {keys:0, bytes:0});
    groups[g].keys++; groups[g].bytes += size;
  });
  return {groups:groups, total:total};
}
function fmtBytes(n){ return n < 1024 ? n+' B' : n < 1048576 ? (n/1024).toFixed(1)+' KB' : (n/1048576).toFixed(2)+' MB'; }
function cookieDel(key){ try { document.cookie = encodeURIComponent(key)+'=;path=/;max-age=0;SameSite=Lax'; } catch(e){} }
function removeKeys(pred){
  ownKeys().filter(pred).forEach(function(k){ try { localStorage.removeItem(k); } catch(e){} cookieDel(k); });
}
function dataPanelHtml(){
  var s = storageSummary();
  var order = ['Preferences','Bookmarks','Browsing','Tool history','Tool inputs','Cached data','Games & other'];
  var rows = order.filter(function(g){ return s.groups[g]; }).map(function(g){
    return '<div class="data-row"><span>'+g+'</span><span>'+s.groups[g].keys+' item'+(s.groups[g].keys===1?'':'s')+'</span><b>'+fmtBytes(s.groups[g].bytes)+'</b></div>';
  }).join('') || '<div class="data-row"><span>Nothing saved yet</span></div>';
  return '<div class="data-panel">'+
    '<h2>Saved data</h2><p style="color:var(--muted);font-size:13px;margin:4px 0 14px">Your bookmarks, history, tool inputs and game scores live in this browser only — never on a server. Total: <b>'+fmtBytes(s.total)+'</b>.</p>'+
    '<div class="data-rows">'+rows+'</div>'+
    '<div class="data-actions">'+
      '<button class="game-btn secondary" id="data-export">'+icon('download',{size:13})+' Export backup</button>'+
      '<label class="game-btn secondary" for="data-import" id="data-import-label">'+icon('upload',{size:13})+' Import backup</label>'+
      '<input type="file" id="data-import" accept="application/json,.json" hidden>'+
      '<button class="game-btn secondary" id="data-clear-history">Clear history</button>'+
      '<button class="game-btn danger" id="data-clear-all">Clear everything</button>'+
    '</div></div>';
}
function wireDataPanel(){
  function refresh(){
    var panel = qs('.data-panel');
    if(!panel) return;
    panel.outerHTML = dataPanelHtml();
    wireDataPanel();
  }
  var confirmTimer = null;
  function twoStep(btn, label, run){
    var armed = btn.getAttribute('data-armed') === '1';
    if(!armed){
      btn.setAttribute('data-armed','1'); var old = btn.textContent; btn.textContent = label;
      clearTimeout(confirmTimer);
      confirmTimer = setTimeout(function(){ btn.removeAttribute('data-armed'); btn.textContent = old; }, 3500);
      return;
    }
    clearTimeout(confirmTimer); run();
  }
  qs('#data-export').addEventListener('click', function(){
    var dump = {app:'velocity-systems', exported:new Date().toISOString(), data:{}};
    ownKeys().forEach(function(k){ dump.data[k] = localStorage.getItem(k); });
    downloadBlob('velocity-systems-backup-'+new Date().toISOString().slice(0,10)+'.json', JSON.stringify(dump, null, 2));
    toast('Backup downloaded','ok');
  });
  qs('#data-import').addEventListener('change', function(){
    var f = this.files && this.files[0];
    if(!f) return;
    var r = new FileReader();
    r.onload = function(){
      try {
        var dump = JSON.parse(r.result), n = 0;
        if(!dump || dump.app !== 'velocity-systems' || typeof dump.data !== 'object') throw new Error('bad file');
        Object.keys(dump.data).forEach(function(k){
          if(STORE_PREFIXES.some(function(p){ return k.indexOf(p)===0; }) && typeof dump.data[k] === 'string'){ localStorage.setItem(k, dump.data[k]); n++; }
        });
        toast('Restored '+n+' saved items — reloading…','ok',{force:true});
        setTimeout(function(){ location.reload(); }, 700);
      } catch(e){ toast('That file isn’t a Velocity Systems backup','err'); }
    };
    r.readAsText(f);
  });
  qs('#data-clear-history').addEventListener('click', function(){
    twoStep(this, 'Click again to confirm', function(){
      removeKeys(function(k){ return storeGroup(k)==='Browsing' || storeGroup(k)==='Tool history' || storeGroup(k)==='Cached data'; });
      recent = []; searchHistory = [];
      toast('History cleared','ok'); refresh(); renderSidebarBookmarks();
    });
  });
  qs('#data-clear-all').addEventListener('click', function(){
    twoStep(this, 'Click again to erase all', function(){
      removeKeys(function(){ return true; });
      settings = Object.assign({}, DEFAULT_SETTINGS); favorites = []; recent = []; searchHistory = [];
      applyTheme(); toast('All saved data erased','ok',{force:true}); refresh(); renderSidebarBookmarks(); renderNavPins();
    });
  });
}
function downloadBlob(name, text){
  var a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], {type:'application/json'})); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function(){ URL.revokeObjectURL(a.href); }, 1000);
}

/* ---------- boot ----------
   app.js is loaded at the end of <body>, so the page's own markup already
   exists. The shell and the page's main content are drawn straight away, which
   means a game/tool script loaded after this file can find #embed-slot. */
var CATALOG_ROUTES = {
  games:   ['Games','PLAY / BROWSER SANDBOX','Focused browser games that load quickly and respect your time.'],
  tools:   ['Tools','BUILD / BROWSER UTILITIES','Private, practical utilities designed to run directly in your browser.'],
  library: ['Library','DISCOVER / EXTERNAL PROJECTS','A curated directory of dependable software, websites, and open-source projects.'],
  articles:['Articles','LEARN / TECHNICAL NOTES','Practical guides, informed recommendations, and durable technical knowledge.'],
};
// Old links looked like index.html#/tools/snake. Send them to the real pages.
function legacyRedirect(){
  var h = location.hash;
  if(h.indexOf('#/') !== 0) return false;
  var raw = h.slice(1), qi = raw.indexOf('?');
  var segs = (qi > -1 ? raw.slice(0, qi) : raw).split('/').filter(Boolean);
  var qstr = qi > -1 ? raw.slice(qi) : '';
  var to = null;
  if(segs.length === 1 && (CATALOG_ROUTES[segs[0]] || segs[0]==='settings')) to = segs[0]+'.html';
  else if(segs.length === 1 && segs[0]==='search') to = 'search.html'+qstr;
  else if(segs.length === 2 && CATALOG_ROUTES[segs[0]]) to = segs[0]+'/'+segs[1]+'.html';
  if(!to) return false;
  location.replace(ROOT + to);
  return true;
}
function boot(){
  var d = document.body.dataset;
  if(d.page === 'home' && legacyRedirect()) return;
  renderShellOnce();
  renderSidebarBookmarks();
  if(d.page === 'home') pageHome();
  else if(d.page === 'sectioned') pageSectioned(d.kind);
  else if(d.page === 'catalog'){ var c = CATALOG_ROUTES[d.kind]; pageCatalog(d.kind, c[0], c[1], c[2]); }
  else if(d.page === 'detail') pageDetail(d.kind, d.id);
  else if(d.page === 'search') pageSearch(queryParams());
  else if(d.page === 'settings') pageSettings();
  updateNavActive();
}
/* Give every unlabelled form control an accessible name. Tools render their own markup,
   so derive the name from the nearest visible caption (.tool-msg / label / preceding text),
   then placeholder, then the id. Runs after each render, debounced. */
function labelControls(){
  var sel = 'input:not([type=hidden]):not([aria-label]):not([aria-labelledby]), select:not([aria-label]):not([aria-labelledby]), textarea:not([aria-label]):not([aria-labelledby])';
  var nodes = document.querySelectorAll(sel);
  for(var i = 0; i < nodes.length; i++){
    var el = nodes[i];
    if(el.title || el.closest('label') || (el.id && document.querySelector('label[for="'+el.id+'"]'))) continue;
    var name = '', prev = el.previousElementSibling;
    if(prev && !/^(INPUT|SELECT|TEXTAREA|BUTTON)$/.test(prev.tagName)) name = (prev.textContent || '').trim();
    if(!name && el.parentElement){
      var cap = el.parentElement.querySelector(':scope > .tool-msg, :scope > label, :scope > .label');
      if(cap) name = (cap.textContent || '').trim();
    }
    if(!name) name = el.getAttribute('placeholder') || '';
    if(!name) name = (el.id || el.name || el.type || 'Field').replace(/[-_]+/g, ' ');
    el.setAttribute('aria-label', name.replace(/\s+/g, ' ').slice(0, 80));
  }
}
(function(){
  var t = 0;
  function queue(){ clearTimeout(t); t = setTimeout(labelControls, 120); }
  var main = document.getElementById('app');
  if(main && window.MutationObserver) new MutationObserver(queue).observe(main, {childList: true, subtree: true});
  queue();
})();
boot();
