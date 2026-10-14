// play.js — helpers shared by every game and tool page.
// Loaded after app.js and before the page's own script (games/<id>.js or tools/<id>.js).
// Everything here is plain globals so the per-page scripts stay short.

/* ---------- localStorage helpers (JSON in, JSON out, never throw) ---------- */
function lsGet(key, fallback){
  try { var v = JSON.parse(localStorage.getItem(key)); return v===null||v===undefined ? fallback : v; }
  catch(e){ return fallback; }
}
function lsSet(key, val){
  try { localStorage.setItem(key, JSON.stringify(val)); return true; }
  catch(e){ return false; }
}
function qsa2(root, sel){ return Array.prototype.slice.call(root.querySelectorAll(sel)); }
function notify(msg, type, opts){ if(typeof toast === 'function') toast(msg, type, opts); }

/* Runs `cleanup` when the page is left. (Every game/tool is now its own page,
   so this is just pagehide — the marker argument is kept for the old call sites.) */
function onUnmount(marker, cleanup){
  window.addEventListener('pagehide', function once(){
    window.removeEventListener('pagehide', once);
    try { cleanup(); } catch(e){}
  });
}

/* ---------- embed frame (the bordered box every game/tool lives in) ---------- */
function mountEmbed(container, label, bodyBuilder, opts){
  opts = opts || {};
  container.innerHTML =
    '<div class="embed-block">'+
      '<div class="embed-head"><span>'+label+'</span><button class="fs-btn" type="button">⛶ Fullscreen</button></div>'+
      '<div class="embed-body"></div>'+
    '</div>';
  var block = container.querySelector('.embed-block');
  var fsBtn = container.querySelector('.fs-btn');
  fsBtn.addEventListener('click', function(){ toggleFullscreen(block); });
  function syncFsLabel(){
    var isFs = document.fullscreenElement === block || document.webkitFullscreenElement === block;
    fsBtn.textContent = isFs ? '⛶ Exit fullscreen' : '⛶ Fullscreen';
  }
  document.addEventListener('fullscreenchange', syncFsLabel);
  document.addEventListener('webkitfullscreenchange', syncFsLabel);
  var body = container.querySelector('.embed-body');
  bodyBuilder(body);

  // Tools remember what you typed. Games manage their own settings and scores.
  var id = document.body.getAttribute('data-id');
  if(document.body.getAttribute('data-kind') === 'tools' && opts.persist !== false && id){
    setTimeout(function(){ persistFields(body, id); }, 0);
  }
}
function toggleFullscreen(el){
  var current = document.fullscreenElement || document.webkitFullscreenElement;
  if(current){
    if(document.exitFullscreen) document.exitFullscreen();
    else if(document.webkitExitFullscreen) document.webkitExitFullscreen();
  } else {
    if(el.requestFullscreen) el.requestFullscreen();
    else if(el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  }
}

/* ---------- per-game persisted settings (difficulty, sizes, toggles…) ---------- */
function gameSettings(gameId, defaults){
  var saved = lsGet('vs-cfg-'+gameId, {});
  var cfg = Object.assign({}, defaults, saved);
  cfg._save = function(){
    var out = {};
    Object.keys(defaults).forEach(function(k){ out[k] = cfg[k]; });
    lsSet('vs-cfg-'+gameId, out);
  };
  return cfg;
}

/* ---------- remember form fields across visits ----------
   Every tool page calls this automatically (see mountEmbed). Any input,
   textarea or select with an id is saved to localStorage as you use it and put
   back next time. Opt a field out with data-nopersist. Passwords, files and
   read-only fields are never saved. */
function persistFields(root, toolId){
  var KEY = 'vs-state-'+toolId;
  var saved = lsGet(KEY, {}) || {};

  function eligible(el){
    if(el.readOnly || el.disabled) return false;
    if(el.hasAttribute('data-nopersist') || el.closest('[data-nopersist]')) return false;
    if(el.tagName === 'INPUT' && /^(file|password|button|submit|reset|hidden|image)$/.test(el.type)) return false;
    return !!(el.id || (el.type === 'radio' && el.name));
  }
  function keyOf(el){ return el.type === 'radio' ? el.name+'='+el.value : el.id; }
  function fields(){ return qsa2(root, 'input, textarea, select').filter(eligible); }
  function fire(el, type){ el.dispatchEvent(new Event(type, {bubbles:true})); }

  fields().forEach(function(el){
    var k = keyOf(el);
    if(!(k in saved)) return;
    var v = saved[k];
    if(el.type === 'checkbox' || el.type === 'radio'){
      if(el.checked !== !!v){ el.checked = !!v; fire(el, 'change'); }
    } else if(el.tagName === 'SELECT'){
      var has = Array.prototype.some.call(el.options, function(o){ return o.value === String(v); });
      if(has && el.value !== String(v)){ el.value = String(v); fire(el, 'change'); }
    } else if(el.value !== String(v)){
      el.value = v; fire(el, 'input');
    }
  });

  var timer = null;
  function save(){
    var out = {};
    fields().forEach(function(el){
      var v = (el.type === 'checkbox' || el.type === 'radio') ? el.checked : el.value;
      if(typeof v === 'string' && v.length > 200000) return; // keep within the storage quota
      out[keyOf(el)] = v;
    });
    lsSet(KEY, out);
  }
  function queue(){ clearTimeout(timer); timer = setTimeout(save, 300); }
  root.addEventListener('input', queue);
  root.addEventListener('change', queue);
  window.addEventListener('pagehide', save);
}

/* ---------- saved history for a tool ----------
   var hist = toolHistory('fraction-calculator');
   hist.mount(container, { title:'HISTORY', format:function(e){ return {main:e.expr, sub:e.result}; }, onPick:function(e){…} });
   hist.add({expr:'1/2 + 1/3', result:'5/6'});          // newest first, capped, saved to localStorage */
function toolHistory(toolId, opts){
  opts = opts || {};
  var KEY = 'vs-hist-'+toolId, MAX = opts.max || 40;
  var view = null;   // set by mount()
  var api = {
    list: function(){ return lsGet(KEY, []); },
    add: function(entry){
      var list = api.list();
      entry.t = entry.t || Date.now();
      if(opts.same && list[0] && opts.same(list[0], entry)) list[0] = entry; else list.unshift(entry);
      lsSet(KEY, list.slice(0, MAX));
      draw();
    },
    clear: function(){ lsSet(KEY, []); draw(); },
    mount: function(container, cfg){
      view = Object.assign({title:'History', format:function(e){ return {main:String(e.text||'')}; }}, cfg||{});
      view.root = document.createElement('div');
      view.root.className = 'hist-panel';
      container.appendChild(view.root);
      draw();
      return api;
    }
  };
  function ago(t){
    var s = Math.max(0, Math.round((Date.now()-t)/1000));
    if(s < 45) return 'just now';
    if(s < 3600) return Math.round(s/60)+'m ago';
    if(s < 86400) return Math.round(s/3600)+'h ago';
    if(s < 604800) return Math.round(s/86400)+'d ago';
    return new Date(t).toLocaleDateString();
  }
  function draw(){
    if(!view) return;
    var list = api.list();
    var html = '<div class="hist-head"><span>'+esc(view.title)+' <i>'+list.length+'</i></span>'+
      (list.length ? '<button type="button" class="hist-clear">Clear</button>' : '')+'</div>';
    if(!list.length){
      html += '<div class="hist-empty">Nothing saved yet. Results appear here and stay in this browser.</div>';
    } else {
      html += '<ol class="hist-list">'+list.map(function(e,i){
        var f = view.format(e);
        var inner = '<span class="hist-main">'+esc(f.main)+'</span>'+(f.sub ? '<span class="hist-sub">'+esc(f.sub)+'</span>' : '');
        return '<li>'+(view.onPick ? '<button type="button" class="hist-item" data-i="'+i+'">'+inner+'</button>' : '<div class="hist-item">'+inner+'</div>')+
          '<time>'+ago(e.t)+'</time></li>';
      }).join('')+'</ol>';
    }
    view.root.innerHTML = html;
    var clr = view.root.querySelector('.hist-clear');
    if(clr) clr.addEventListener('click', function(){ api.clear(); notify('History cleared', 'ok'); });
    if(view.onPick) qsa2(view.root, '.hist-item[data-i]').forEach(function(b){
      b.addEventListener('click', function(){ view.onPick(list[+b.getAttribute('data-i')]); });
    });
  }
  return api;
}

/* ---------- small shared utilities for tools ---------- */
function copyText(text, label){
  function done(){ notify((label || 'Text')+' copied', 'ok'); }
  function fallback(){
    var ta = document.createElement('textarea');
    ta.value = text; ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); done(); } catch(e){ notify('Could not copy — select the text and copy it manually', 'err'); }
    ta.remove();
  }
  if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback);
  else fallback();
}
function downloadText(filename, text, mime){
  var blob = new Blob([text], {type: mime || 'text/plain'});
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function(){ URL.revokeObjectURL(a.href); }, 1000);
}
