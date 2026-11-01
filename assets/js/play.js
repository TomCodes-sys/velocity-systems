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
    fsBtn.textContent = isFullscreen(block) ? '⛶ Exit fullscreen' : '⛶ Fullscreen';
    window.dispatchEvent(new Event('resize'));   // canvases that size themselves to the space re-measure
  }
  block._syncFs = syncFsLabel;
  document.addEventListener('fullscreenchange', syncFsLabel);
  document.addEventListener('webkitfullscreenchange', syncFsLabel);
  var body = container.querySelector('.embed-body');
  bodyBuilder(body);
  enhanceNumberInputs(body);
  enhanceFileInputs(body);

  // Tools remember what you typed. Games manage their own settings and scores.
  var id = document.body.getAttribute('data-id');
  if(document.body.getAttribute('data-kind') === 'tools' && opts.persist !== false && id){
    setTimeout(function(){ persistFields(body, id); }, 0);
  }
}
/* Fullscreen. Uses the real Fullscreen API where there is one (desktop, iPad); on iPhone, where
   an element can't go fullscreen, the block is pinned over the whole page instead. */
function isFullscreen(el){
  return document.fullscreenElement === el || document.webkitFullscreenElement === el || el.classList.contains('pseudo-full');
}
function pseudoFullscreen(el, on){
  el.classList.toggle('pseudo-full', on);
  document.body.classList.toggle('fs-lock', on);
  if(el._syncFs) el._syncFs();
}
function toggleFullscreen(el){
  if(el.classList.contains('pseudo-full')){ pseudoFullscreen(el, false); return; }
  var current = document.fullscreenElement || document.webkitFullscreenElement;
  if(current){
    if(document.exitFullscreen) document.exitFullscreen(); else if(document.webkitExitFullscreen) document.webkitExitFullscreen();
    return;
  }
  var req = el.requestFullscreen || el.webkitRequestFullscreen;
  if(!req){ pseudoFullscreen(el, true); return; }
  try {
    var r = req.call(el);
    if(r && r.catch) r.catch(function(){ pseudoFullscreen(el, true); });
  } catch(e){ pseudoFullscreen(el, true); }
}
document.addEventListener('keydown', function(e){
  if(e.key !== 'Escape') return;
  var p = document.querySelector('.embed-block.pseudo-full');
  if(p) pseudoFullscreen(p, false);
});

/* Consistent accessible number steppers across embedded tools. */
function enhanceNumberInputs(root){
  qsa2(root,'input[type="number"]').forEach(function(input){
    if(input.closest('.number-control')||input.hasAttribute('data-native-stepper')) return;
    var wrap=document.createElement('div');wrap.className='number-control';
    input.parentNode.insertBefore(wrap,input);wrap.appendChild(input);
    var down=document.createElement('button'),up=document.createElement('button');
    down.type=up.type='button';down.className=up.className='number-step';down.textContent='−';up.textContent='+';
    down.setAttribute('aria-label','Decrease '+(input.getAttribute('aria-label')||input.id||'value'));
    up.setAttribute('aria-label','Increase '+(input.getAttribute('aria-label')||input.id||'value'));
    wrap.appendChild(down);wrap.appendChild(up);
    function stepBy(direction){
      if(input.disabled||input.readOnly)return;
      var step=input.step==='any'?1:(Number(input.step)||1),min=input.min===''?-Infinity:Number(input.min),max=input.max===''?Infinity:Number(input.max);
      var current=input.value===''?(direction>0?Math.max(0,min):Math.min(0,max)):Number(input.value);
      var next=Math.min(max,Math.max(min,current+step*direction));
      var decimals=(String(step).split('.')[1]||'').length;
      input.value=Number(next.toFixed(Math.min(8,decimals))).toString();
      input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));
    }
    down.addEventListener('click',function(){stepBy(-1);});up.addEventListener('click',function(){stepBy(1);});
  });
}
/* Replaces the browser's plain "Choose file" control with a styled button that also accepts drag and drop. */
function enhanceFileInputs(root){
  qsa2(root, 'input[type=file]').forEach(function(inp){
    if(inp.hidden || !inp.id || inp.closest('.file-pick') || inp.hasAttribute('data-plain')) return;
    var wrap = document.createElement('div'); wrap.className = 'file-pick';
    inp.parentNode.insertBefore(wrap, inp); wrap.appendChild(inp); inp.classList.remove('tool-row');
    var isFolder=inp.hasAttribute('webkitdirectory'),noun=isFolder?'folder':(inp.multiple?'files':'file'),dropNoun=isFolder?'a folder':(inp.multiple?'files':'a file');
    wrap.insertAdjacentHTML('beforeend', '<label class="file-btn" for="'+inp.id+'">'+(typeof icon === 'function' ? icon('upload', {size:15}) : '')+' Choose '+noun+'</label><span class="file-name">or drop '+dropNoun+' here</span>');
    var nm = wrap.querySelector('.file-name');
    function update(){
      var n = inp.files ? inp.files.length : 0;
      if(!n){nm.textContent='or drop '+dropNoun+' here';return;}
      if(isFolder){var root=(inp.files[0].webkitRelativePath||inp.files[0].name).split('/')[0];nm.textContent=root+' · '+n+' files selected';}
      else nm.textContent=n===1?inp.files[0].name:n+' files selected';
    }
    inp.addEventListener('change', update);
    ['dragenter','dragover'].forEach(function(t){ wrap.addEventListener(t, function(e){ e.preventDefault(); wrap.classList.add('over'); }); });
    ['dragleave','drop'].forEach(function(t){ wrap.addEventListener(t, function(e){ e.preventDefault(); wrap.classList.remove('over'); }); });
    wrap.addEventListener('drop', function(e){
      if(!e.dataTransfer || !e.dataTransfer.files.length) return;
      try {
        var dt = new DataTransfer();
        Array.prototype.forEach.call(e.dataTransfer.files, function(f, i){ if(inp.multiple || i === 0) dt.items.add(f); });
        inp.files = dt.files; inp.dispatchEvent(new Event('change', {bubbles:true}));
      } catch(err){}
    });
  });
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

/* ---------- consistent tool errors ---------- */
function toolError(target, title, detail, recovery){
  if(!target) return;
  function safe(v){return String(v||'').replace(/[&<>]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;'}[c];});}
  target.innerHTML='<div class="tool-error" role="alert"><strong>'+safe(title||'This tool could not complete the request')+'</strong><p>'+safe(detail||'The browser or service blocked the operation.')+'</p>'+(recovery?'<p class="tool-error-recovery"><b>What to try:</b> '+safe(recovery)+'</p>':'')+'</div>';
}

/* Surface uncaught failures inside a tool instead of leaving a silent broken panel. */
window.addEventListener('unhandledrejection',function(event){
  var panel=document.querySelector('.embed-body');
  if(!panel)return;
  var reason=event.reason,detail=reason&&reason.message?reason.message:String(reason||'An asynchronous operation failed.');
  toolError(panel,'Unexpected tool error',detail,'Retry the action. If it continues, check browser permissions, network access and whether this browser supports the required API.');
});
window.addEventListener('error',function(event){
  var panel=document.querySelector('.embed-body');
  if(!panel||!event.message)return;
  toolError(panel,'Tool script error',event.message,'Refresh the page. If the problem persists, try another browser or report the page and error message.');
});
