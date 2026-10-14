// tools.js — additional utility tools ported from the old VOID.TOOLS site,
// restyled for Velocity Systems. Loaded after games.js; extends PLAYABLES.
// All fully client-side — nothing leaves the browser except where noted
// (public IP lookup in Device Info, QR library fetch — both degrade gracefully offline).

Object.assign(PLAYABLES, {
  'text-encoder': mountBase64,
  'calculator': mountCalculator,
  'password-generator': mountPasswordGenerator,
  'word-counter': mountWordCounter,
  'diff-checker': mountDiffChecker,
  'stopwatch': mountStopwatch,
  'pomodoro': mountPomodoro,
  'notepad': mountNotepad,
  'json-explorer': mountJsonExplorer,
  'device-info': mountDeviceInfo,
  'text-to-speech': mountTTS,
  'wheel-spinner': mountSpinner,
  'reaction-timer': mountReactionTimer,
  'gradient-generator': mountGradientGenerator,
  'palette-generator': mountPaletteGenerator,
  'color-picker': mountColorPicker,
  'qr-generator': mountQRGenerator,
  'image-resizer': mountImageResizer,
  'watermark-tool': mountWatermark,
  'image-converter': mountImageConverter,
  'screen-capture': mountScreenshot,
});
// Replace the basic unit converter with the full multi-category version.
PLAYABLES['unit-converter'] = mountAdvancedConverter;

/* ---------------- Base64 / Text Encoder ---------------- */
function mountBase64(container){
  mountEmbed(container, 'TOOL / TEXT ENCODER', function(body){
    var MODES = {
      base64: {encode:function(v){try{return btoa(unescape(encodeURIComponent(v)));}catch(e){return 'Error: invalid input';}}, decode:function(v){try{return decodeURIComponent(escape(atob(v)));}catch(e){return 'Error: invalid Base64';}}},
      url: {encode:function(v){return encodeURIComponent(v);}, decode:function(v){try{return decodeURIComponent(v);}catch(e){return 'Error: invalid URL encoding';}}},
      html: {encode:function(v){return v.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}, decode:function(v){return v.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"');}},
      hex: {encode:function(v){return Array.prototype.map.call(v,function(c){return c.charCodeAt(0).toString(16).padStart(2,'0');}).join(' ');}, decode:function(v){try{return v.split(/\s+/).filter(Boolean).map(function(h){return String.fromCharCode(parseInt(h,16));}).join('');}catch(e){return 'Error: invalid hex';}}},
      rot13: {encode:function(v){return v.replace(/[a-zA-Z]/g,function(c){var b=c<='Z'?65:97;return String.fromCharCode((c.charCodeAt(0)-b+13)%26+b);});}, decode:function(v){return MODES.rot13.encode(v);}},
    };
    body.innerHTML =
      '<div class="tool-row" id="b64-tabs"></div>'+
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'+
        '<div><div class="tool-msg">Input</div><textarea class="tool-textarea" id="b64-in"></textarea></div>'+
        '<div><div class="tool-msg">Output</div><textarea class="tool-textarea" id="b64-out"></textarea></div>'+
      '</div>'+
      '<div class="tool-row"><button class="game-btn" id="b64-swap">Swap</button><button class="game-btn secondary" id="b64-copy">Copy output</button></div>';
    var mode = 'base64';
    var tabs = body.querySelector('#b64-tabs'), input = body.querySelector('#b64-in'), output = body.querySelector('#b64-out');
    function renderTabs(){
      tabs.innerHTML = Object.keys(MODES).map(function(m){ return '<button class="game-btn'+(m===mode?'':' secondary')+'" data-mode="'+m+'">'+m.toUpperCase()+'</button>'; }).join('');
      Array.prototype.slice.call(tabs.querySelectorAll('[data-mode]')).forEach(function(b){ b.addEventListener('click', function(){ mode = b.getAttribute('data-mode'); renderTabs(); encodeNow(); }); });
    }
    function encodeNow(){ output.value = MODES[mode].encode(input.value); }
    input.addEventListener('input', encodeNow);
    output.addEventListener('input', function(){ input.value = MODES[mode].decode(output.value); });
    body.querySelector('#b64-swap').addEventListener('click', function(){ var t=input.value; input.value=output.value; output.value=t; encodeNow(); });
    body.querySelector('#b64-copy').addEventListener('click', function(){ navigator.clipboard.writeText(output.value); });
    renderTabs();
  });
}

/* ---------------- Calculator ---------------- */
function mountCalculator(container){
  mountEmbed(container, 'TOOL / CALCULATOR', function(body){
    body.innerHTML =
      '<div style="max-width:280px">'+
        '<div class="tool-output" id="calc-expr" style="min-height:16px;text-align:right;color:var(--muted)"></div>'+
        '<div class="tool-output" id="calc-val" style="text-align:right;font-size:22px;font-weight:bold">0</div>'+
        '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin-top:8px">'+
          ['AC','⌫','%','÷','7','8','9','×','4','5','6','−','1','2','3','+','0','.','='].map(function(k){
            var span = k==='0' ? 'grid-column:span 2' : '';
            return '<button class="game-btn'+(['÷','×','−','+','='].indexOf(k)>-1?'':' secondary')+'" data-key="'+k+'" style="'+span+'">'+k+'</button>';
          }).join('')+
        '</div>'+
      '</div>';
    var display='0', op=null, prevVal=null, justEq=false;
    var exprEl = body.querySelector('#calc-expr'), valEl = body.querySelector('#calc-val');
    function compute(a,b,o){ a=parseFloat(a); b=parseFloat(b); var r = o==='+'?a+b:o==='−'?a-b:o==='×'?a*b:(b!==0?a/b:NaN); return Math.round(r*1e10)/1e10; }
    function press(k){
      if(/[0-9]/.test(k)){
        if(justEq){ display='0'; justEq=false; }
        if(display==='0') display='';
        display += k;
      } else if(k==='.'){
        if(display.indexOf('.')===-1) display += '.';
      } else if(k==='AC'){ display='0'; op=null; prevVal=null; justEq=false; exprEl.textContent=''; }
      else if(k==='⌫'){ display = display.length>1 ? display.slice(0,-1) : '0'; }
      else if(k==='%'){ display = String(parseFloat(display)/100); }
      else if(['÷','×','−','+'].indexOf(k)>-1){
        if(op && !justEq){ display = String(compute(prevVal, display, op)); }
        prevVal = display; op = k; exprEl.textContent = display+' '+k; display='0'; justEq=false; return;
      } else if(k==='='){
        if(op && prevVal!==null){ var r = compute(prevVal, display, op); exprEl.textContent = prevVal+' '+op+' '+display+' ='; display = String(r); op=null; prevVal=null; justEq=true; }
      }
      valEl.textContent = display;
    }
    Array.prototype.slice.call(body.querySelectorAll('[data-key]')).forEach(function(b){ b.addEventListener('click', function(){ press(b.getAttribute('data-key')); }); });
  });
}

/* ---------------- Password Generator ---------------- */
function mountPasswordGenerator(container){
  mountEmbed(container, 'TOOL / PASSWORD GENERATOR', function(body){
    body.innerHTML =
      '<div class="tool-output" id="pw-out" style="cursor:pointer;font-size:15px;letter-spacing:1px">Click Generate</div>'+
      '<div class="tool-row">'+
        '<label style="font:11px monospace">Length <span id="pw-len-val">20</span> <input type="range" id="pw-len" min="6" max="64" value="20"></label>'+
      '</div>'+
      '<div class="tool-row">'+
        '<label style="font:11px monospace"><input type="checkbox" id="pw-upper" checked> Uppercase</label>'+
        '<label style="font:11px monospace"><input type="checkbox" id="pw-lower" checked> Lowercase</label>'+
        '<label style="font:11px monospace"><input type="checkbox" id="pw-num" checked> Numbers</label>'+
        '<label style="font:11px monospace"><input type="checkbox" id="pw-sym" checked> Symbols</label>'+
      '</div>'+
      '<div class="tool-row"><button class="game-btn" id="pw-gen">Generate</button><button class="game-btn secondary" id="pw-copy">Copy</button></div>'+
      '<div class="tool-msg" id="pw-strength"></div>';
    var UPPER='ABCDEFGHIJKLMNOPQRSTUVWXYZ', LOWER='abcdefghijklmnopqrstuvwxyz', NUMS='0123456789', SYMS='!@#$%^&*()-_=+[]{}|;:,.<>?';
    function generate(){
      var len = parseInt(body.querySelector('#pw-len').value,10);
      var pool = '';
      if(body.querySelector('#pw-upper').checked) pool += UPPER;
      if(body.querySelector('#pw-lower').checked) pool += LOWER;
      if(body.querySelector('#pw-num').checked) pool += NUMS;
      if(body.querySelector('#pw-sym').checked) pool += SYMS;
      if(!pool) pool = LOWER + NUMS;
      var pw = '';
      for(var i=0;i<len;i++) pw += pool[Math.floor(Math.random()*pool.length)];
      body.querySelector('#pw-out').textContent = pw;
      var score = 0;
      if(pw.length>=12) score++; if(pw.length>=16) score++; if(pw.length>=20) score++;
      if(/[A-Z]/.test(pw)) score++; if(/[a-z]/.test(pw)) score++; if(/[0-9]/.test(pw)) score++; if(/[^A-Za-z0-9]/.test(pw)) score++;
      var labels = ['Very weak','Weak','Fair','Strong','Very strong'];
      var idx = Math.min(4, Math.floor(score/7*5));
      body.querySelector('#pw-strength').textContent = labels[idx]+' — ~'+Math.round(pw.length*Math.log2(Math.max(pool.length,2)))+' bits entropy';
    }
    body.querySelector('#pw-len').addEventListener('input', function(){ body.querySelector('#pw-len-val').textContent=this.value; generate(); });
    ['pw-upper','pw-lower','pw-num','pw-sym'].forEach(function(id){ body.querySelector('#'+id).addEventListener('change', generate); });
    body.querySelector('#pw-gen').addEventListener('click', generate);
    body.querySelector('#pw-copy').addEventListener('click', function(){ navigator.clipboard.writeText(body.querySelector('#pw-out').textContent); });
    body.querySelector('#pw-out').addEventListener('click', function(){ navigator.clipboard.writeText(this.textContent); });
    generate();
  });
}

/* ---------------- Word Counter ---------------- */
function mountWordCounter(container){
  mountEmbed(container, 'TOOL / WORD COUNTER', function(body){
    body.innerHTML =
      '<textarea class="tool-textarea" id="wc-in" placeholder="Paste or type text..."></textarea>'+
      '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px;font:11px monospace">'+
        '<div>Words <b id="wc-words">0</b></div><div>Characters <b id="wc-chars">0</b></div><div>Sentences <b id="wc-sent">0</b></div>'+
        '<div>Paragraphs <b id="wc-para">0</b></div><div>Reading time <b id="wc-read">0s</b></div><div>Avg word length <b id="wc-avg">—</b></div>'+
      '</div>';
    var input = body.querySelector('#wc-in');
    function analyze(){
      var text = input.value;
      var words = text.trim() ? text.trim().split(/\s+/).filter(Boolean) : [];
      var sentences = text.split(/[.!?]+/).filter(function(s){return s.trim();}).length;
      var paras = text.split(/\n\s*\n/).filter(function(p){return p.trim();}).length;
      var avg = words.length ? (words.join('').length/words.length).toFixed(1) : '—';
      body.querySelector('#wc-words').textContent = words.length;
      body.querySelector('#wc-chars').textContent = text.length;
      body.querySelector('#wc-sent').textContent = sentences;
      body.querySelector('#wc-para').textContent = paras;
      body.querySelector('#wc-avg').textContent = avg;
      body.querySelector('#wc-read').textContent = Math.round(words.length/200*60)+'s';
    }
    input.addEventListener('input', analyze);
    analyze();
  });
}

/* ---------------- Diff Checker ---------------- */
function mountDiffChecker(container){
  mountEmbed(container, 'TOOL / DIFF CHECKER', function(body){
    body.innerHTML =
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'+
        '<div><div class="tool-msg">Original</div><textarea class="tool-textarea" id="diff-a"></textarea></div>'+
        '<div><div class="tool-msg">Modified</div><textarea class="tool-textarea" id="diff-b"></textarea></div>'+
      '</div>'+
      '<div class="tool-row"><button class="game-btn" id="diff-run">Compare</button></div>'+
      '<div class="tool-output" id="diff-out" style="font-family:monospace"></div>';
    function lcs(a,b){
      var m=a.length,n=b.length, dp=[];
      for(var i=0;i<=m;i++){ dp.push(new Array(n+1).fill(0)); }
      for(i=1;i<=m;i++) for(var j=1;j<=n;j++) dp[i][j] = a[i-1]===b[j-1] ? dp[i-1][j-1]+1 : Math.max(dp[i-1][j],dp[i][j-1]);
      return dp;
    }
    function backtrack(dp,a,b,i,j){
      if(i===0 && j===0) return [];
      if(i===0) return backtrack(dp,a,b,0,j-1).concat([{type:'add',line:b[j-1]}]);
      if(j===0) return backtrack(dp,a,b,i-1,0).concat([{type:'del',line:a[i-1]}]);
      if(a[i-1]===b[j-1]) return backtrack(dp,a,b,i-1,j-1).concat([{type:'ctx',line:a[i-1]}]);
      if(dp[i-1][j] >= dp[i][j-1]) return backtrack(dp,a,b,i-1,j).concat([{type:'del',line:a[i-1]}]);
      return backtrack(dp,a,b,i,j-1).concat([{type:'add',line:b[j-1]}]);
    }
    function run(){
      var a = body.querySelector('#diff-a').value.split('\n');
      var b = body.querySelector('#diff-b').value.split('\n');
      var dp = lcs(a,b);
      var ops = backtrack(dp,a,b,a.length,b.length);
      var adds=0, dels=0;
      var html = ops.map(function(o){
        if(o.type==='add') adds++;
        if(o.type==='del') dels++;
        var color = o.type==='add' ? '#36c979' : o.type==='del' ? '#ff535e' : 'var(--muted)';
        var prefix = o.type==='add' ? '+ ' : o.type==='del' ? '- ' : '  ';
        return '<div style="color:'+color+'">'+prefix+esc(o.line)+'</div>';
      }).join('');
      body.querySelector('#diff-out').innerHTML = '<div class="tool-msg">+'+adds+' added, -'+dels+' removed</div>'+html;
    }
    body.querySelector('#diff-run').addEventListener('click', run);
  });
}

/* ---------------- Stopwatch ---------------- */
function mountStopwatch(container){
  mountEmbed(container, 'TOOL / STOPWATCH', function(body){
    body.innerHTML =
      '<div class="tool-output" id="sw-time" style="text-align:center;font-size:32px;font-weight:bold">00:00.000</div>'+
      '<div class="tool-row"><button class="game-btn" id="sw-toggle">Start</button><button class="game-btn secondary" id="sw-lap" disabled>Lap</button><button class="game-btn secondary" id="sw-reset">Reset</button></div>'+
      '<div id="sw-laps" style="font:11px monospace"></div>';
    var running=false, startTime=0, offset=0, laps=[], raf;
    var timeEl = body.querySelector('#sw-time');
    function fmt(ms){
      var m=Math.floor(ms/60000), s=Math.floor((ms%60000)/1000), cs=Math.floor(ms%1000);
      return String(m).padStart(2,'0')+':'+String(s).padStart(2,'0')+'.'+String(cs).padStart(3,'0');
    }
    function tick(){
      if(!running) return;
      timeEl.textContent = fmt(offset + (Date.now()-startTime));
      raf = requestAnimationFrame(tick);
    }
    body.querySelector('#sw-toggle').addEventListener('click', function(){
      if(running){ running=false; offset += Date.now()-startTime; cancelAnimationFrame(raf); this.textContent='Resume'; body.querySelector('#sw-lap').disabled=true; }
      else { running=true; startTime=Date.now(); this.textContent='Stop'; body.querySelector('#sw-lap').disabled=false; tick(); }
    });
    body.querySelector('#sw-lap').addEventListener('click', function(){
      if(!running) return;
      var total = offset + (Date.now()-startTime);
      laps.push(total);
      body.querySelector('#sw-laps').innerHTML = laps.slice().reverse().map(function(l,i){ return '<div>Lap '+(laps.length-i)+' — '+fmt(l)+'</div>'; }).join('');
    });
    body.querySelector('#sw-reset').addEventListener('click', function(){
      running=false; cancelAnimationFrame(raf); offset=0; laps=[];
      timeEl.textContent='00:00.000';
      body.querySelector('#sw-toggle').textContent='Start';
      body.querySelector('#sw-lap').disabled=true;
      body.querySelector('#sw-laps').innerHTML='';
    });
  });
}

/* ---------------- Pomodoro ---------------- */
function mountPomodoro(container){
  mountEmbed(container, 'TOOL / POMODORO', function(body){
    body.innerHTML =
      '<div class="tool-output" id="pom-display" style="text-align:center;font-size:36px;font-weight:bold">25:00</div>'+
      '<div class="tool-msg" id="pom-phase" style="text-align:center">Focus</div>'+
      '<div class="tool-row" style="justify-content:center"><button class="game-btn" id="pom-toggle">Start</button><button class="game-btn secondary" id="pom-reset">Reset</button></div>'+
      '<div class="tool-row"><label style="font:11px monospace">Focus min <input type="number" id="pom-focus" value="25" min="1" max="90" style="width:50px"></label>'+
      '<label style="font:11px monospace">Break min <input type="number" id="pom-break" value="5" min="1" max="30" style="width:50px"></label></div>';
    var seconds=25*60, timer=null, running=false, phase='focus';
    function update(){
      var m=Math.floor(seconds/60), s=seconds%60;
      body.querySelector('#pom-display').textContent = m+':'+String(s).padStart(2,'0');
    }
    function tick(){
      seconds--;
      if(seconds<=0){
        phase = phase==='focus' ? 'break' : 'focus';
        var mins = phase==='focus' ? parseInt(body.querySelector('#pom-focus').value,10) : parseInt(body.querySelector('#pom-break').value,10);
        seconds = mins*60;
        body.querySelector('#pom-phase').textContent = phase==='focus' ? 'Focus' : 'Break';
      }
      update();
    }
    body.querySelector('#pom-toggle').addEventListener('click', function(){
      if(running){ running=false; clearInterval(timer); this.textContent='Resume'; }
      else { running=true; this.textContent='Pause'; timer=setInterval(tick,1000); }
    });
    body.querySelector('#pom-reset').addEventListener('click', function(){
      running=false; clearInterval(timer); phase='focus';
      seconds = (parseInt(body.querySelector('#pom-focus').value,10)||25)*60;
      body.querySelector('#pom-phase').textContent='Focus';
      body.querySelector('#pom-toggle').textContent='Start';
      update();
    });
    update();
  });
}

/* ---------------- Notepad ---------------- */
function mountNotepad(container){
  mountEmbed(container, 'TOOL / NOTEPAD', function(body){
    body.innerHTML =
      '<div style="display:grid;grid-template-columns:180px 1fr;gap:12px">'+
        '<div><div class="tool-row"><button class="game-btn secondary" id="np-new" style="width:100%">+ New note</button></div><div id="np-list" style="font:11px monospace"></div></div>'+
        '<div><input class="tool-textarea" id="np-title" style="min-height:auto;padding:8px;margin-bottom:8px" placeholder="Title">'+
        '<textarea class="tool-textarea" id="np-body" placeholder="Start writing..."></textarea></div>'+
      '</div>';
    var notes = {};
    try { notes = JSON.parse(localStorage.getItem('vs-notes')||'{}'); } catch(e){ notes = {}; }
    var currentId = null;
    function save(){ localStorage.setItem('vs-notes', JSON.stringify(notes)); }
    function genId(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,6); }
    function renderList(){
      var items = Object.entries(notes).sort(function(a,b){ return b[1].modified-a[1].modified; });
      body.querySelector('#np-list').innerHTML = items.map(function(entry){
        var id=entry[0], n=entry[1];
        return '<div class="game-btn'+(id===currentId?'':' secondary')+'" style="margin-bottom:4px;cursor:pointer;text-align:left" data-note="'+id+'">'+esc(n.title||'Untitled')+'</div>';
      }).join('') || '<div class="tool-msg">No notes yet</div>';
      Array.prototype.slice.call(body.querySelectorAll('[data-note]')).forEach(function(b){ b.addEventListener('click', function(){ open(b.getAttribute('data-note')); }); });
    }
    function open(id){
      currentId = id;
      var n = notes[id];
      body.querySelector('#np-title').value = n.title;
      body.querySelector('#np-body').value = n.body;
      renderList();
    }
    function newNote(){
      var id = genId();
      notes[id] = {title:'Untitled', body:'', modified:Date.now()};
      save(); renderList(); open(id);
    }
    function saveCurrent(){
      if(!currentId) return;
      notes[currentId].title = body.querySelector('#np-title').value || 'Untitled';
      notes[currentId].body = body.querySelector('#np-body').value;
      notes[currentId].modified = Date.now();
      save(); renderList();
    }
    body.querySelector('#np-new').addEventListener('click', newNote);
    body.querySelector('#np-title').addEventListener('input', saveCurrent);
    body.querySelector('#np-body').addEventListener('input', saveCurrent);
    renderList();
    var firstId = Object.keys(notes)[0];
    if(firstId) open(firstId); else newNote();
  });
}

/* ---------------- Advanced Unit Converter (replaces basic one) ---------------- */
function mountAdvancedConverter(container){
  mountEmbed(container, 'TOOL / UNIT CONVERTER', function(body){
    var CATS = {
      Length: {units:['mm','cm','m','km','in','ft','yd','mi'], toBase:[0.001,0.01,1,1000,0.0254,0.3048,0.9144,1609.344]},
      Weight: {units:['mg','g','kg','t','oz','lb'], toBase:[0.000001,0.001,1,1000,0.0283495,0.453592]},
      Storage: {units:['b','B','KB','MB','GB','TB'], toBase:[1/8,1,1024,1048576,1073741824,1099511627776]},
      Temperature: {units:['°C','°F','K'], special:true},
      Speed: {units:['m/s','km/h','mph','knot'], toBase:[1,0.277778,0.44704,0.514444]},
      Time: {units:['ms','s','min','hr','day'], toBase:[0.001,1,60,3600,86400]},
    };
    body.innerHTML =
      '<div class="tool-row" id="conv-tabs"></div>'+
      '<div id="conv-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px"></div>';
    var currentCat = 'Length';
    var tabs = body.querySelector('#conv-tabs'), grid = body.querySelector('#conv-grid');
    var lock = false;
    function renderTabs(){
      tabs.innerHTML = Object.keys(CATS).map(function(c){ return '<button class="game-btn'+(c===currentCat?'':' secondary')+'" data-cat="'+c+'">'+c+'</button>'; }).join('');
      Array.prototype.slice.call(tabs.querySelectorAll('[data-cat]')).forEach(function(b){ b.addEventListener('click', function(){ currentCat = b.getAttribute('data-cat'); renderTabs(); buildGrid(); }); });
    }
    function buildGrid(){
      var cat = CATS[currentCat];
      grid.innerHTML = cat.units.map(function(u,i){
        return '<div><div class="tool-msg">'+u+'</div><input type="number" class="tool-textarea" style="min-height:auto;padding:8px" data-idx="'+i+'" placeholder="0"></div>';
      }).join('');
      Array.prototype.slice.call(grid.querySelectorAll('[data-idx]')).forEach(function(inp){
        inp.addEventListener('input', function(){ convertFrom(parseInt(this.getAttribute('data-idx'),10), this.value); });
      });
    }
    function convertFrom(fromIdx, val){
      if(lock) return;
      lock = true;
      var cat = CATS[currentCat];
      var v = parseFloat(val);
      if(isNaN(v)){ lock=false; return; }
      var base;
      if(cat.special){
        base = fromIdx===0 ? v : fromIdx===1 ? (v-32)*5/9 : v-273.15;
      } else { base = v * cat.toBase[fromIdx]; }
      Array.prototype.slice.call(grid.querySelectorAll('[data-idx]')).forEach(function(inp,i){
        if(i===fromIdx) return;
        var result;
        if(cat.special){ result = i===0?base : i===1?base*9/5+32 : base+273.15; }
        else { result = base / cat.toBase[i]; }
        inp.value = isFinite(result) ? parseFloat(result.toPrecision(8)) : '';
      });
      lock = false;
    }
    renderTabs(); buildGrid();
  });
}

/* ---------------- JSON Explorer (tree view) ---------------- */
function mountJsonExplorer(container){
  mountEmbed(container, 'TOOL / JSON EXPLORER', function(body){
    body.innerHTML =
      '<textarea class="tool-textarea" id="jx-in">{"name":"Velocity Systems","tools":["Snake","Wordle","Tetris"],"stats":{"games":10,"tools":22}}</textarea>'+
      '<div class="tool-row"><button class="game-btn" id="jx-parse">Parse</button></div>'+
      '<div class="tool-output" id="jx-tree" style="font-family:monospace"></div>';
    function node(val, key, indent){
      var pad = '<span style="display:inline-block;width:'+(indent*16)+'px"></span>';
      if(val===null) return '<div>'+pad+'<b>'+key+'</b>: <span style="color:var(--muted)">null</span></div>';
      if(typeof val !== 'object') return '<div>'+pad+'<b>'+key+'</b>: <span style="color:#36c979">'+JSON.stringify(val)+'</span></div>';
      var isArr = Array.isArray(val);
      var entries = Object.entries(val);
      var header = '<div>'+pad+(key?'<b>'+key+'</b>: ':'')+(isArr?'[':'{')+entries.length+' items'+(isArr?']':'}')+'</div>';
      var children = entries.map(function(e){ return node(e[1], isArr?'['+e[0]+']':e[0], indent+1); }).join('');
      return header + children;
    }
    body.querySelector('#jx-parse').addEventListener('click', function(){
      try {
        var val = JSON.parse(body.querySelector('#jx-in').value);
        body.querySelector('#jx-tree').innerHTML = node(val, '', 0);
      } catch(e){
        body.querySelector('#jx-tree').innerHTML = '<span style="color:#ff535e">Invalid JSON — '+esc(e.message)+'</span>';
      }
    });
    body.querySelector('#jx-parse').click();
  });
}

/* ---------------- Device Info ---------------- */
function mountDeviceInfo(container){
  mountEmbed(container, 'TOOL / DEVICE INFO', function(body){
    body.innerHTML = '<div class="tool-output">Scanning…</div>';
    var nav = navigator, ua = nav.userAgent;
    var browser = ua.indexOf('Edg/')>-1?'Edge':ua.indexOf('Chrome/')>-1?'Chrome':ua.indexOf('Firefox/')>-1?'Firefox':ua.indexOf('Safari/')>-1?'Safari':'Unknown';
    var os = /Win/.test(ua)?'Windows':/Mac/.test(ua)?'macOS':/Linux/.test(ua)?'Linux':/Android/.test(ua)?'Android':/iPhone|iPad/.test(ua)?'iOS':'Unknown';
    var rows = [
      ['Browser', browser], ['OS', os], ['Platform', nav.platform||'—'],
      ['CPU cores', nav.hardwareConcurrency||'—'], ['Device RAM', nav.deviceMemory ? nav.deviceMemory+'GB' : '—'],
      ['Screen', screen.width+'×'+screen.height], ['Viewport', window.innerWidth+'×'+window.innerHeight],
      ['Pixel ratio', (window.devicePixelRatio||1)+'x'], ['Language', nav.language],
      ['Online', nav.onLine ? 'Yes' : 'No'], ['Cookies enabled', nav.cookieEnabled ? 'Yes' : 'No'],
      ['Touch support', nav.maxTouchPoints>0 ? 'Yes ('+nav.maxTouchPoints+' pts)' : 'No'],
    ];
    function render(publicIp){
      body.innerHTML = '<div style="font:11px monospace">'+
        (publicIp ? '<div style="margin-bottom:8px"><b>Public IP:</b> '+esc(publicIp)+'</div>' : '<div class="tool-msg">Public IP unavailable (offline or blocked)</div>')+
        rows.map(function(r){ return '<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--line)"><span style="color:var(--muted)">'+r[0]+'</span><b>'+esc(String(r[1]))+'</b></div>'; }).join('')+
      '</div>';
    }
    fetch('https://api.ipify.org?format=json').then(function(r){ return r.json(); }).then(function(d){ render(d.ip); }).catch(function(){ render(null); });
  });
}

/* ---------------- Text to Speech ---------------- */
function mountTTS(container){
  mountEmbed(container, 'TOOL / TEXT TO SPEECH', function(body){
    if(!window.speechSynthesis){ body.innerHTML = '<div class="tool-msg err">Your browser does not support the Web Speech API.</div>'; return; }
    body.innerHTML =
      '<textarea class="tool-textarea" id="tts-in">Welcome to Velocity Systems.</textarea>'+
      '<div class="tool-row"><select id="tts-voice"></select></div>'+
      '<div class="tool-row"><label style="font:11px monospace">Rate <input type="range" id="tts-rate" min="0.5" max="2" step="0.1" value="1"></label></div>'+
      '<div class="tool-row"><button class="game-btn" id="tts-speak">Speak</button><button class="game-btn secondary" id="tts-stop">Stop</button></div>';
    var synth = window.speechSynthesis;
    function loadVoices(){
      var voices = synth.getVoices();
      body.querySelector('#tts-voice').innerHTML = voices.map(function(v,i){ return '<option value="'+i+'">'+v.name+' ('+v.lang+')</option>'; }).join('');
    }
    loadVoices();
    synth.onvoiceschanged = loadVoices;
    body.querySelector('#tts-speak').addEventListener('click', function(){
      synth.cancel();
      var text = body.querySelector('#tts-in').value;
      if(!text.trim()) return;
      var u = new SpeechSynthesisUtterance(text);
      var voices = synth.getVoices();
      var idx = parseInt(body.querySelector('#tts-voice').value,10);
      if(voices[idx]) u.voice = voices[idx];
      u.rate = parseFloat(body.querySelector('#tts-rate').value);
      synth.speak(u);
    });
    body.querySelector('#tts-stop').addEventListener('click', function(){ synth.cancel(); });
  });
}

/* ---------------- Wheel Spinner ---------------- */
function mountSpinner(container){
  mountEmbed(container, 'TOOL / WHEEL SPINNER', function(body){
    body.innerHTML =
      '<div class="snake-wrap">'+
        '<canvas id="sp-canvas" width="280" height="280"></canvas>'+
        '<div class="tool-output" id="sp-result" style="text-align:center">—</div>'+
        '<button class="game-btn" id="sp-spin">Spin</button>'+
        '<textarea class="tool-textarea" id="sp-options" style="min-height:60px;width:100%">Option 1\nOption 2\nOption 3\nOption 4</textarea>'+
        '<button class="game-btn secondary" id="sp-update">Update options</button>'+
      '</div>';
    var canvas = body.querySelector('#sp-canvas'), ctx = canvas.getContext('2d');
    var colors = ['#3b82f6','#36c979','#ff535e','#fbbf24','#9b7bff','#22d3ee'];
    var segments = ['Option 1','Option 2','Option 3','Option 4'];
    var angle = 0, spinning=false;
    function draw(highlight){
      var cx=140,cy=140,r=120;
      ctx.clearRect(0,0,280,280);
      var n = segments.length, arc = (2*Math.PI)/n;
      segments.forEach(function(seg,i){
        var start = angle + i*arc - Math.PI/2, end = start+arc;
        ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,r,start,end); ctx.closePath();
        ctx.fillStyle = i===highlight ? '#fff' : colors[i%colors.length];
        ctx.fill();
        ctx.save(); ctx.translate(cx,cy); ctx.rotate(start+arc/2); ctx.textAlign='right'; ctx.fillStyle='#000'; ctx.font='bold 11px sans-serif';
        ctx.fillText(seg, r-10, 4); ctx.restore();
      });
    }
    function spin(){
      if(spinning) return;
      spinning = true;
      var velocity = 0.3 + Math.random()*0.2;
      function frame(){
        angle += velocity; velocity *= 0.98;
        draw(-1);
        if(velocity>0.002) requestAnimationFrame(frame);
        else {
          spinning = false;
          var n = segments.length, arc=(2*Math.PI)/n;
          var a = ((-angle)%(2*Math.PI)+2*Math.PI)%(2*Math.PI);
          var idx = Math.floor(a/arc)%n;
          draw(idx);
          body.querySelector('#sp-result').textContent = segments[idx];
        }
      }
      requestAnimationFrame(frame);
    }
    body.querySelector('#sp-spin').addEventListener('click', spin);
    body.querySelector('#sp-update').addEventListener('click', function(){
      segments = body.querySelector('#sp-options').value.split('\n').map(function(s){return s.trim();}).filter(Boolean);
      if(segments.length<2) segments=['Option 1','Option 2'];
      draw(-1);
    });
    draw(-1);
  });
}

/* ---------------- Reaction Timer (rebuilt) ---------------- */
function mountReactionTimer(container){
  mountEmbed(container, 'TOOL / REACTION TIMER', function(body){
    body.innerHTML =
      '<div class="snake-wrap">'+
        '<div class="snake-hud">'+
          '<span id="rt-last">LAST —</span><span id="rt-best">BEST —</span>'+
          '<span id="rt-avg">AVG —</span><span id="rt-count">ROUNDS 0</span>'+
        '</div>'+
        '<div id="rt-target" role="button" tabindex="0" style="width:100%;max-width:520px;height:200px;display:flex;flex-direction:column;gap:8px;align-items:center;justify-content:center;background:var(--surface-2);border:2px solid var(--line);border-radius:var(--rad);cursor:pointer;user-select:none;text-align:center;padding:16px">'+
          '<div id="rt-msg" style="font:700 18px ui-sans-serif,system-ui,sans-serif">Click to begin</div>'+
          '<div id="rt-sub" class="tool-msg">Wait for green, then click as fast as you can</div>'+
        '</div>'+
        '<div class="tool-row" style="justify-content:center">'+
          '<label>Min delay <input type="number" id="rt-min" value="1.5" step="0.5" min="0.5" max="10" style="width:64px">s</label>'+
          '<label>Max delay <input type="number" id="rt-max" value="4" step="0.5" min="1" max="15" style="width:64px">s</label>'+
          '<button class="game-btn secondary" id="rt-reset">Reset stats</button>'+
        '</div>'+
        '<div id="rt-hist" class="tool-output" style="width:100%;max-width:520px;display:none"></div>'+
      '</div>';

    var target = body.querySelector('#rt-target');
    var state='idle', timer=null, startAt=0, results=[], best=lsGet('vs-reaction-best', null);
    if(best!==null) body.querySelector('#rt-best').textContent='BEST '+best+'ms';

    function setState(s, msg, sub, bg, border){
      state=s;
      body.querySelector('#rt-msg').textContent=msg;
      body.querySelector('#rt-sub').textContent=sub||'';
      target.style.background=bg||'var(--surface-2)';
      target.style.borderColor=border||'var(--line)';
    }
    function refresh(){
      if(!results.length) return;
      var last=results[results.length-1];
      var avg=Math.round(results.reduce(function(a,b){return a+b;},0)/results.length);
      body.querySelector('#rt-last').textContent='LAST '+last+'ms';
      body.querySelector('#rt-avg').textContent='AVG '+avg+'ms';
      body.querySelector('#rt-count').textContent='ROUNDS '+results.length;
      if(best===null||last<best){ best=last; lsSet('vs-reaction-best',best); }
      body.querySelector('#rt-best').textContent='BEST '+best+'ms';
      var hist=body.querySelector('#rt-hist');
      hist.style.display='block';
      hist.innerHTML = results.slice(-12).reverse().map(function(ms,i){
        var label = ms<200?'Excellent':ms<260?'Good':ms<350?'Average':'Slow';
        return '<div style="display:flex;justify-content:space-between;padding:3px 0"><span>Round '+(results.length-i)+' · '+label+'</span><b>'+ms+'ms</b></div>';
      }).join('');
    }
    function arm(){
      var mn=parseFloat(body.querySelector('#rt-min').value)||1.5;
      var mx=parseFloat(body.querySelector('#rt-max').value)||4;
      if(mx<mn) mx=mn+1;
      setState('waiting','Wait…','Click the moment it turns green','rgba(255,83,94,.12)','rgba(255,83,94,.45)');
      timer=setTimeout(function(){
        startAt=Date.now();
        setState('go','CLICK NOW','','rgba(54,201,121,.18)','rgba(54,201,121,.55)');
      }, (mn + Math.random()*(mx-mn))*1000);
    }
    function handle(){
      if(state==='idle'||state==='result'){ arm(); return; }
      if(state==='waiting'){
        clearTimeout(timer);
        setState('early','Too soon!','You clicked before it turned green — click to retry','rgba(251,191,36,.14)','rgba(251,191,36,.5)');
        state='result';
        return;
      }
      if(state==='early'){ arm(); return; }
      if(state==='go'){
        var ms=Date.now()-startAt;
        results.push(ms); refresh();
        setState('result', ms+'ms', 'Click to go again','var(--surface-2)','var(--line)');
        return;
      }
    }
    target.addEventListener('click', handle);
    target.addEventListener('keydown', function(e){ if(e.key===' '||e.key==='Enter'){ e.preventDefault(); handle(); } });
    body.querySelector('#rt-reset').addEventListener('click', function(){
      clearTimeout(timer); results=[]; best=null; lsSet('vs-reaction-best',null);
      ['rt-last','rt-best','rt-avg'].forEach(function(id){ body.querySelector('#'+id).textContent=id.split('-')[1].toUpperCase()+' —'; });
      body.querySelector('#rt-count').textContent='ROUNDS 0';
      body.querySelector('#rt-hist').style.display='none';
      setState('idle','Click to begin','Wait for green, then click as fast as you can');
    });
    onUnmount(target, function(){ clearTimeout(timer); });
  });
}

/* ---------------- Gradient Generator ---------------- */
function mountGradientGenerator(container){
  mountEmbed(container, 'TOOL / CSS GRADIENT', function(body){
    body.innerHTML =
      '<div id="grad-preview" style="height:120px;border:1px solid var(--line);margin-bottom:12px"></div>'+
      '<div class="tool-row">'+
        '<input type="color" id="grad-c1" value="#3b82f6"><input type="color" id="grad-c2" value="#9b7bff">'+
        '<label style="font:11px monospace">Angle <input type="range" id="grad-angle" min="0" max="360" value="135"></label>'+
      '</div>'+
      '<div class="tool-output" id="grad-out" style="cursor:pointer"></div>';
    function update(){
      var c1=body.querySelector('#grad-c1').value, c2=body.querySelector('#grad-c2').value, ang=body.querySelector('#grad-angle').value;
      var css = 'linear-gradient('+ang+'deg, '+c1+', '+c2+')';
      body.querySelector('#grad-preview').style.background = css;
      body.querySelector('#grad-out').textContent = 'background: '+css+';';
    }
    ['grad-c1','grad-c2','grad-angle'].forEach(function(id){ body.querySelector('#'+id).addEventListener('input', update); });
    body.querySelector('#grad-out').addEventListener('click', function(){ navigator.clipboard.writeText(this.textContent); });
    update();
  });
}

/* ---------------- Palette Generator ---------------- */
function mountPaletteGenerator(container){
  mountEmbed(container, 'TOOL / COLOR PALETTE', function(body){
    body.innerHTML =
      '<div id="pal-swatches" style="display:grid;grid-template-columns:repeat(5,1fr);gap:4px;margin-bottom:12px"></div>'+
      '<div class="tool-row"><button class="game-btn" id="pal-gen">Generate</button></div>'+
      '<div class="tool-output" id="pal-out"></div>';
    var colors = [];
    function rand(min,max){ return min+Math.random()*(max-min); }
    function hslToHex(h,s,l){
      h/=360; s/=100; l/=100;
      function hue2rgb(p,q,t){ if(t<0)t+=1; if(t>1)t-=1; if(t<1/6)return p+(q-p)*6*t; if(t<1/2)return q; if(t<2/3)return p+(q-p)*(2/3-t)*6; return p; }
      var r,g,b;
      if(s===0){ r=g=b=l; } else { var q=l<0.5?l*(1+s):l+s-l*s, p=2*l-q; r=hue2rgb(p,q,h+1/3); g=hue2rgb(p,q,h); b=hue2rgb(p,q,h-1/3); }
      return '#'+[r,g,b].map(function(x){ return Math.round(x*255).toString(16).padStart(2,'0'); }).join('');
    }
    function generate(){
      colors = [];
      for(var i=0;i<5;i++) colors.push(hslToHex(rand(0,360), rand(40,80), rand(30,65)));
      body.querySelector('#pal-swatches').innerHTML = colors.map(function(c){ return '<div style="aspect-ratio:1;background:'+c+';cursor:pointer" data-c="'+c+'"></div>'; }).join('');
      Array.prototype.slice.call(body.querySelectorAll('[data-c]')).forEach(function(el){ el.addEventListener('click', function(){ navigator.clipboard.writeText(el.getAttribute('data-c')); }); });
      body.querySelector('#pal-out').textContent = colors.join('  ');
    }
    body.querySelector('#pal-gen').addEventListener('click', generate);
    generate();
  });
}

/* ---------------- Color Picker (image sampler) ---------------- */
function mountColorPicker(container){
  mountEmbed(container, 'TOOL / COLOR PICKER', function(body){
    body.innerHTML =
      '<input type="file" accept="image/*" id="cp-file" class="tool-row">'+
      '<canvas id="cp-canvas" style="max-width:100%;cursor:crosshair;border:1px solid var(--line)"></canvas>'+
      '<div class="tool-output" id="cp-out">Upload an image, then click it to sample a color.</div>';
    var canvas = body.querySelector('#cp-canvas'), ctx = canvas.getContext('2d');
    body.querySelector('#cp-file').addEventListener('change', function(e){
      var file = e.target.files[0]; if(!file) return;
      var reader = new FileReader();
      reader.onload = function(ev){
        var img = new Image();
        img.onload = function(){ canvas.width = img.width; canvas.height = img.height; ctx.drawImage(img,0,0); };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    });
    canvas.addEventListener('click', function(e){
      var rect = canvas.getBoundingClientRect();
      var x = Math.floor((e.clientX-rect.left) * (canvas.width/rect.width));
      var y = Math.floor((e.clientY-rect.top) * (canvas.height/rect.height));
      var d = ctx.getImageData(x,y,1,1).data;
      var hex = '#'+[d[0],d[1],d[2]].map(function(v){return v.toString(16).padStart(2,'0');}).join('');
      body.querySelector('#cp-out').innerHTML = '<span style="display:inline-block;width:16px;height:16px;background:'+hex+';vertical-align:middle;margin-right:8px"></span>'+hex+' — rgb('+d[0]+', '+d[1]+', '+d[2]+')';
    });
  });
}

/* ---------------- QR Generator (lazy-loads a small external encoder) ---------------- */
function mountQRGenerator(container){
  mountEmbed(container, 'TOOL / QR GENERATOR', function(body){
    body.innerHTML =
      '<textarea class="tool-textarea" id="qr-in" style="min-height:60px" placeholder="https://example.com"></textarea>'+
      '<div class="tool-row"><button class="game-btn" id="qr-gen">Generate</button></div>'+
      '<div id="qr-out"></div>'+
      '<div class="tool-msg" id="qr-msg"></div>';
    function ensureLib(cb){
      if(window.QRCode){ cb(); return; }
      var s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
      s.onload = cb;
      s.onerror = function(){ body.querySelector('#qr-msg').textContent = 'Could not load the QR library — check your internet connection.'; };
      document.head.appendChild(s);
    }
    body.querySelector('#qr-gen').addEventListener('click', function(){
      var text = body.querySelector('#qr-in').value.trim();
      if(!text) return;
      ensureLib(function(){
        var out = body.querySelector('#qr-out');
        out.innerHTML = '';
        new QRCode(out, {text:text, width:200, height:200});
        body.querySelector('#qr-msg').textContent = '';
      });
    });
  });
}

/* ---------------- Image Resizer ---------------- */
function mountImageResizer(container){
  mountEmbed(container, 'TOOL / IMAGE RESIZER', function(body){
    body.innerHTML =
      '<input type="file" accept="image/*" id="rz-file" class="tool-row">'+
      '<div class="tool-row"><label style="font:11px monospace">Width <input type="number" id="rz-w" value="800" style="width:80px"></label>'+
      '<label style="font:11px monospace">Height <input type="number" id="rz-h" value="600" style="width:80px"></label></div>'+
      '<canvas id="rz-canvas" style="max-width:100%;border:1px solid var(--line)"></canvas>'+
      '<div class="tool-row"><button class="game-btn" id="rz-download">Download</button></div>';
    var canvas = body.querySelector('#rz-canvas'), ctx = canvas.getContext('2d'), img=null;
    body.querySelector('#rz-file').addEventListener('change', function(e){
      var file = e.target.files[0]; if(!file) return;
      var reader = new FileReader();
      reader.onload = function(ev){
        img = new Image();
        img.onload = function(){
          body.querySelector('#rz-w').value = img.width;
          body.querySelector('#rz-h').value = img.height;
          render();
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    });
    function render(){
      if(!img) return;
      var w = parseInt(body.querySelector('#rz-w').value,10) || img.width;
      var h = parseInt(body.querySelector('#rz-h').value,10) || img.height;
      canvas.width = w; canvas.height = h;
      ctx.drawImage(img,0,0,w,h);
    }
    ['rz-w','rz-h'].forEach(function(id){ body.querySelector('#'+id).addEventListener('input', render); });
    body.querySelector('#rz-download').addEventListener('click', function(){
      if(!img) return;
      var a = document.createElement('a'); a.download='resized.png'; a.href = canvas.toDataURL('image/png'); a.click();
    });
  });
}

/* ---------------- Watermark Tool ---------------- */
function mountWatermark(container){
  mountEmbed(container, 'TOOL / WATERMARK', function(body){
    body.innerHTML =
      '<input type="file" accept="image/*" id="wm-file" class="tool-row">'+
      '<div class="tool-row"><input type="text" id="wm-text" value="© Velocity Systems" style="flex:1"><input type="color" id="wm-color" value="#ffffff"></div>'+
      '<canvas id="wm-canvas" style="max-width:100%;border:1px solid var(--line)"></canvas>'+
      '<div class="tool-row"><button class="game-btn" id="wm-download">Download</button></div>';
    var canvas = body.querySelector('#wm-canvas'), ctx = canvas.getContext('2d'), img=null;
    body.querySelector('#wm-file').addEventListener('change', function(e){
      var file = e.target.files[0]; if(!file) return;
      var reader = new FileReader();
      reader.onload = function(ev){ img = new Image(); img.onload = render; img.src = ev.target.result; };
      reader.readAsDataURL(file);
    });
    function render(){
      if(!img) return;
      canvas.width = img.width; canvas.height = img.height;
      ctx.drawImage(img,0,0);
      var text = body.querySelector('#wm-text').value;
      ctx.font = 'bold '+Math.round(img.width*0.04)+'px sans-serif';
      ctx.fillStyle = body.querySelector('#wm-color').value;
      ctx.globalAlpha = 0.7;
      ctx.textAlign = 'right';
      ctx.fillText(text, img.width-20, img.height-20);
      ctx.globalAlpha = 1;
    }
    ['wm-text','wm-color'].forEach(function(id){ body.querySelector('#'+id).addEventListener('input', render); });
    body.querySelector('#wm-download').addEventListener('click', function(){
      if(!img) return;
      var a = document.createElement('a'); a.download='watermarked.png'; a.href = canvas.toDataURL('image/png'); a.click();
    });
  });
}

/* ---------------- Image Format Converter ---------------- */
function mountImageConverter(container){
  mountEmbed(container, 'TOOL / IMAGE CONVERTER', function(body){
    body.innerHTML =
      '<input type="file" accept="image/*" id="ic-file" class="tool-row">'+
      '<div class="tool-row"><select id="ic-fmt"><option value="image/png">PNG</option><option value="image/jpeg">JPEG</option><option value="image/webp">WebP</option></select></div>'+
      '<canvas id="ic-canvas" style="max-width:100%;border:1px solid var(--line)"></canvas>'+
      '<div class="tool-row"><button class="game-btn" id="ic-download">Download</button></div>';
    var canvas = body.querySelector('#ic-canvas'), ctx = canvas.getContext('2d'), img=null;
    body.querySelector('#ic-file').addEventListener('change', function(e){
      var file = e.target.files[0]; if(!file) return;
      var reader = new FileReader();
      reader.onload = function(ev){
        img = new Image();
        img.onload = function(){ canvas.width=img.width; canvas.height=img.height; ctx.drawImage(img,0,0); };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    });
    body.querySelector('#ic-download').addEventListener('click', function(){
      if(!img) return;
      var fmt = body.querySelector('#ic-fmt').value;
      var ext = fmt==='image/png'?'png':fmt==='image/jpeg'?'jpg':'webp';
      var a = document.createElement('a'); a.download='converted.'+ext; a.href = canvas.toDataURL(fmt, 0.92); a.click();
    });
  });
}

/* ---------------- Screen Capture ---------------- */
function mountScreenshot(container){
  mountEmbed(container, 'TOOL / SCREEN CAPTURE', function(body){
    body.innerHTML =
      '<div class="tool-row"><button class="game-btn" id="sc-start">Start capture</button></div>'+
      '<canvas id="sc-canvas" style="max-width:100%;border:1px solid var(--line);display:none"></canvas>'+
      '<div class="tool-row"><button class="game-btn secondary" id="sc-download" style="display:none">Download PNG</button></div>'+
      '<div class="tool-msg">Requires browser permission to share your screen. Nothing is uploaded — the image stays in this tab.</div>';
    var canvas = body.querySelector('#sc-canvas'), ctx = canvas.getContext('2d');
    body.querySelector('#sc-start').addEventListener('click', function(){
      if(!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia){
        body.querySelector('.tool-msg').textContent = 'Screen capture is not supported in this browser.';
        return;
      }
      navigator.mediaDevices.getDisplayMedia({video:true}).then(function(stream){
        var video = document.createElement('video');
        video.srcObject = stream;
        video.play();
        video.addEventListener('loadedmetadata', function(){
          setTimeout(function(){
            canvas.width = video.videoWidth; canvas.height = video.videoHeight;
            ctx.drawImage(video,0,0);
            stream.getTracks().forEach(function(t){ t.stop(); });
            canvas.style.display = 'block';
            body.querySelector('#sc-download').style.display = 'inline-block';
          }, 200);
        });
      }).catch(function(){ body.querySelector('.tool-msg').textContent = 'Capture cancelled or denied.'; });
    });
    body.querySelector('#sc-download').addEventListener('click', function(){
      var a = document.createElement('a'); a.download='screenshot.png'; a.href = canvas.toDataURL('image/png'); a.click();
    });
  });
}
