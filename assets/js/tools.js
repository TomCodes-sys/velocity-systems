// tools.js — every tool on the site, in one file.
// Loaded by each tools/<id>.html after app.js and play.js. The block at the bottom
// runs only the tool whose id matches <body data-id>, so one file serves all pages.
// To add a tool: add its section here, register it in PLAYABLES, and list it in data.js.
// Contents (each section below is one tool):
//   base-converter
//   calculator
//   case-converter
//   color-converter
//   color-picker
//   contrast-checker
//   countdown-timer
//   currency-converter
//   date-calculator
//   device-info
//   dice-coin
//   diff-checker
//   file-converter
//   fraction-calculator
//   game-deals
//   gradient-generator
//   hash-generator
//   image-converter
//   image-resizer
//   json-csv
//   json-explorer
//   json-formatter
//   line-tools
//   lorem-ipsum
//   markdown-preview
//   notepad
//   palette-generator
//   password-generator
//   percentage-calculator
//   pomodoro
//   qr-generator
//   reaction-timer
//   regex-tester
//   screen-capture
//   split-bill
//   stopwatch
//   text-encoder
//   text-to-speech
//   timestamp-converter
//   todo-list
//   unit-converter
//   uuid-generator
//   watermark-tool
//   wheel-spinner
//   word-counter
//   world-clock

var PLAYABLES = {};
/* ===================================================================
   Shared helpers used by more than one tool
   =================================================================== */

/* GET JSON with a timeout and a small localStorage cache. If the network fails
   and an older cached copy exists, that is returned instead of an error. */
function fetchJson(url, opts){
  opts = opts || {};
  var ttl = opts.ttl == null ? 600000 : opts.ttl, key = 'vs-http-' + url;
  if(ttl){ var c = lsGet(key, null); if(c && Date.now() - c.t < ttl) return Promise.resolve(c.v); }
  var ctl = typeof AbortController === 'function' ? new AbortController() : null;
  var timer = setTimeout(function(){ if(ctl) ctl.abort(); }, opts.timeout || 12000);
  return fetch(url, ctl ? {signal: ctl.signal} : undefined)
    .then(function(r){ clearTimeout(timer); if(!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function(v){
      if(ttl && JSON.stringify(v).length < 400000) lsSet(key, {t: Date.now(), v: v});
      return v;
    })
    .catch(function(e){
      clearTimeout(timer);
      var old = lsGet(key, null);
      if(old && opts.stale !== false) return old.v;
      throw e;
    });
}

/* ---------- currency ---------- */
var POPULAR_CUR = ['AUD','USD','NZD','CAD','GBP','EUR','JPY','CNY','KRW','INR','SGD','HKD','CHF','SEK','NOK','DKK','PLN','CZK','BRL','MXN','ZAR','TRY','THB','PHP','IDR','MYR','AED','TWD'];
var TZ_CUR = {'Pacific/Auckland':'NZD','Europe/London':'GBP','Europe/Dublin':'EUR','Europe/Zurich':'CHF','Europe/Stockholm':'SEK','Europe/Oslo':'NOK','Europe/Copenhagen':'DKK','Europe/Warsaw':'PLN','Europe/Prague':'CZK','Europe/Budapest':'HUF','Europe/Istanbul':'TRY',
  'Asia/Tokyo':'JPY','Asia/Seoul':'KRW','Asia/Kolkata':'INR','Asia/Calcutta':'INR','Asia/Singapore':'SGD','Asia/Hong_Kong':'HKD','Asia/Shanghai':'CNY','Asia/Bangkok':'THB','Asia/Manila':'PHP','Asia/Jakarta':'IDR','Asia/Kuala_Lumpur':'MYR','Asia/Dubai':'AED','Asia/Taipei':'TWD',
  'Africa/Johannesburg':'ZAR','America/Sao_Paulo':'BRL','America/Mexico_City':'MXN','America/Toronto':'CAD','America/Vancouver':'CAD','America/Edmonton':'CAD','America/Winnipeg':'CAD','America/Halifax':'CAD','America/St_Johns':'CAD','America/Regina':'CAD'};
var REGION_CUR = {AU:'AUD',NZ:'NZD',GB:'GBP',UK:'GBP',US:'USD',CA:'CAD',IE:'EUR',DE:'EUR',FR:'EUR',ES:'EUR',IT:'EUR',NL:'EUR',BE:'EUR',AT:'EUR',PT:'EUR',FI:'EUR',GR:'EUR',JP:'JPY',KR:'KRW',IN:'INR',SG:'SGD',HK:'HKD',CN:'CNY',CH:'CHF',SE:'SEK',NO:'NOK',DK:'DKK',PL:'PLN',CZ:'CZK',BR:'BRL',MX:'MXN',ZA:'ZAR',TR:'TRY',TH:'THB',PH:'PHP',ID:'IDR',MY:'MYR',AE:'AED',TW:'TWD'};

/* Where the visitor probably is, worked out from the browser's own timezone and
   language (nothing is sent anywhere). Falls back to AUD. */
function guessCurrency(){
  var tz = '';
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch(e){}
  if(TZ_CUR[tz]) return {code: TZ_CUR[tz], why: 'your timezone'};
  if(/^Australia\//.test(tz)) return {code: 'AUD', why: 'your timezone'};
  if(/^Europe\//.test(tz)) return {code: 'EUR', why: 'your timezone'};
  if(/^(America|US)\//.test(tz)) return {code: 'USD', why: 'your timezone'};
  var m = /[-_]([A-Za-z]{2})$/.exec(navigator.language || '');
  // en-US is the default language setting for many people outside the US, so it isn't treated as evidence.
  if(m && m[1].toUpperCase() !== 'US' && REGION_CUR[m[1].toUpperCase()]) return {code: REGION_CUR[m[1].toUpperCase()], why: 'your browser language'};
  return {code: 'AUD', why: 'the default'};
}
function getCurrency(){
  var saved = lsGet('vs-currency', null);
  if(saved) return {code: saved, why: 'your saved choice'};
  return guessCurrency();
}
function setCurrency(code){ lsSet('vs-currency', code); }

/* Exchange rates with USD as the base (cached for six hours). */
function fxLoad(){
  var cached = lsGet('vs-fx', null);
  if(cached && Date.now() - cached.t < 6 * 3600 * 1000) return Promise.resolve(cached);
  return fetchJson('https://open.er-api.com/v6/latest/USD', {ttl: 0, timeout: 8000, stale: false})
    .then(function(d){ if(!d || !d.rates) throw new Error('bad response'); return {t: Date.now(), date: String(d.time_last_update_utc || '').slice(0, 16), rates: d.rates, src: 'open.er-api.com'}; })
    .catch(function(){
      return fetchJson('https://api.frankfurter.app/latest?from=USD', {ttl: 0, timeout: 8000, stale: false})
        .then(function(d){ d.rates.USD = 1; return {t: Date.now(), date: d.date, rates: d.rates, src: 'Frankfurter (ECB)'}; });
    })
    .then(function(c){ lsSet('vs-fx', c); return c; })
    .catch(function(){
      if(cached){ cached.stale = true; return cached; }
      throw new Error('Could not load exchange rates');
    });
}
function curName(code){
  try { return new Intl.DisplayNames(['en'], {type: 'currency'}).of(code) || code; } catch(e){ return code; }
}
function fmtMoney(n, code){
  try { return new Intl.NumberFormat(undefined, {style: 'currency', currency: code}).format(n); }
  catch(e){ return code + ' ' + n.toFixed(2); }
}
function currencyOptionsHtml(rates, selected){
  var all = rates ? Object.keys(rates) : POPULAR_CUR.slice();
  var pop = POPULAR_CUR.filter(function(c){ return all.indexOf(c) > -1; });
  var rest = all.filter(function(c){ return pop.indexOf(c) < 0; }).sort();
  function opt(c){ return '<option value="' + c + '"' + (c === selected ? ' selected' : '') + '>' + c + ' — ' + esc(curName(c)) + '</option>'; }
  return '<optgroup label="Common">' + pop.map(opt).join('') + '</optgroup>' + (rest.length ? '<optgroup label="All currencies">' + rest.map(opt).join('') + '</optgroup>' : '');
}

/* ---------- files ---------- */
function saveBlob(name, blob){
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function(){ URL.revokeObjectURL(a.href); }, 4000);
}
function fmtSize(n){ return n < 1024 ? n + ' B' : n < 1048576 ? (n / 1024).toFixed(1) + ' KB' : (n / 1048576).toFixed(2) + ' MB'; }

var _crcTable = null;
function crc32(u8){
  if(!_crcTable){
    _crcTable = [];
    for(var n = 0; n < 256; n++){ var c = n; for(var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; _crcTable[n] = c >>> 0; }
  }
  var crc = 0xFFFFFFFF;
  for(var i = 0; i < u8.length; i++) crc = _crcTable[(crc ^ u8[i]) & 255] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}
/* Store-only (uncompressed) ZIP. files: [{name, data: Uint8Array}] → Blob */
function makeZip(files){
  var chunks = [], central = [], offset = 0, enc = new TextEncoder(), d = new Date();
  var dosTime = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  var dosDate = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  files.forEach(function(f){
    var name = enc.encode(f.name), crc = crc32(f.data), size = f.data.length;
    var h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
    h.setUint16(10, dosTime, true); h.setUint16(12, dosDate, true); h.setUint32(14, crc, true);
    h.setUint32(18, size, true); h.setUint32(22, size, true); h.setUint16(26, name.length, true); h.setUint16(28, 0, true);
    chunks.push(new Uint8Array(h.buffer), name, f.data);
    var c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true);
    c.setUint16(12, dosTime, true); c.setUint16(14, dosDate, true); c.setUint32(16, crc, true);
    c.setUint32(20, size, true); c.setUint32(24, size, true); c.setUint16(28, name.length, true);
    c.setUint32(42, offset, true);
    central.push(new Uint8Array(c.buffer), name);
    offset += 30 + name.length + size;
  });
  var cdSize = 0; central.forEach(function(x){ cdSize += x.length; });
  var end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
  end.setUint32(12, cdSize, true); end.setUint32(16, offset, true);
  return new Blob(chunks.concat(central, [new Uint8Array(end.buffer)]), {type: 'application/zip'});
}


/* ---------- searchable currency picker (used wherever a currency can be chosen) ---------- */
var CUR_ALIASES = {USD:'usa us america united states dollar', GBP:'uk britain england scotland pound sterling', EUR:'europe euro germany france spain italy ireland', JPY:'japan yen', CAD:'canada', AUD:'australia aussie',
  NZD:'new zealand kiwi', CNY:'china yuan renminbi', KRW:'korea won', INR:'india rupee', CHF:'switzerland swiss franc', SEK:'sweden krona', NOK:'norway krone', DKK:'denmark krone', BRL:'brazil real', MXN:'mexico peso', ZAR:'south africa rand', SGD:'singapore', HKD:'hong kong', TRY:'turkey lira', PLN:'poland zloty'};
function currencyPicker(host, cfg){
  var rates = cfg.rates || null, value = cfg.value, open = false, active = 0, shown = [];
  host.innerHTML = '<div class="cur-pick"><button type="button" class="cur-btn" aria-haspopup="listbox"><span></span>'+icon('chevronDown',{size:14})+'</button>'+
    '<div class="cur-pop" hidden><input type="text" placeholder="Search by code, name or country…" aria-label="Search currencies" autocomplete="off"><div class="cur-list" role="listbox"></div></div></div>';
  var root = host.firstChild, btn = root.querySelector('.cur-btn'), pop = root.querySelector('.cur-pop'), input = pop.querySelector('input'), list = pop.querySelector('.cur-list');
  function codes(){ var all = rates ? Object.keys(rates) : POPULAR_CUR.slice(); var pop2 = POPULAR_CUR.filter(function(c){ return all.indexOf(c) > -1; }); return pop2.concat(all.filter(function(c){ return pop2.indexOf(c) < 0; }).sort()); }
  function label(){ btn.firstChild.textContent = value + ' — ' + curName(value); }
  function draw(){
    var q = input.value.trim().toLowerCase();
    shown = codes().filter(function(c){ return !q || (c + ' ' + curName(c) + ' ' + (CUR_ALIASES[c] || '')).toLowerCase().indexOf(q) > -1; });
    active = Math.max(0, Math.min(active, shown.length - 1));
    list.innerHTML = shown.length ? shown.map(function(c, i){
      return '<button type="button" role="option" class="cur-item'+(i === active ? ' on' : '')+(c === value ? ' sel' : '')+'" data-c="'+c+'"><b>'+c+'</b><small>'+esc(curName(c))+'</small></button>';
    }).join('') : '<div class="cur-empty">No currency matches “'+esc(input.value)+'”.</div>';
    var on = list.querySelector('.on'); if(on && on.scrollIntoView) on.scrollIntoView({block: 'nearest'});
  }
  function show(on){
    open = on; pop.hidden = !on; root.classList.toggle('open', on);
    if(on){ input.value = ''; active = Math.max(0, codes().indexOf(value)); draw(); input.focus(); }
  }
  function pick(c){ value = c; label(); show(false); if(cfg.onChange) cfg.onChange(c); }
  btn.addEventListener('click', function(){ show(!open); });
  input.addEventListener('input', function(){ active = 0; draw(); });
  input.addEventListener('keydown', function(e){
    if(e.key === 'ArrowDown'){ e.preventDefault(); active = Math.min(shown.length - 1, active + 1); draw(); }
    else if(e.key === 'ArrowUp'){ e.preventDefault(); active = Math.max(0, active - 1); draw(); }
    else if(e.key === 'Enter'){ e.preventDefault(); if(shown[active]) pick(shown[active]); }
    else if(e.key === 'Escape'){ e.preventDefault(); show(false); btn.focus(); }
  });
  list.addEventListener('click', function(e){ var b = e.target.closest('[data-c]'); if(b) pick(b.getAttribute('data-c')); });
  document.addEventListener('click', function(e){ if(open && !root.contains(e.target)) show(false); });
  label();
  return {get: function(){ return value; }, set: function(c){ value = c; label(); }, setRates: function(r){ rates = r; if(open) draw(); }};
}

/* ==================================================================
   tools / base-converter
   ================================================================== */
function mountBaseConverter(container){
  mountEmbed(container, 'TOOL / NUMBER BASE CONVERTER', function(body){
    var opts = ''; for(var b = 2; b <= 36; b++) opts += '<option value="'+b+'"'+(b === 10 ? ' selected' : '')+'>Base '+b+'</option>';
    body.innerHTML =
      '<div class="tool-grid two"><div class="field"><label for="bc-in">Number</label><input id="bc-in" spellcheck="false" autocomplete="off" placeholder="255"></div>'+
      '<div class="field"><label for="bc-from">From</label><select id="bc-from">'+opts+'</select></div></div>'+
      '<div class="err-text" id="bc-err" role="alert"></div><div class="result-card" id="bc-out"></div>';
    var $ = function(s){ return body.querySelector(s); };
    var DIG = '0123456789abcdefghijklmnopqrstuvwxyz';
    function parse(s, base){
      s = s.trim().toLowerCase().replace(/[\s_]/g, '');
      var neg = false; if(s[0] === '-'){ neg = true; s = s.slice(1); }
      if(base === 16) s = s.replace(/^0x/, ''); if(base === 2) s = s.replace(/^0b/, ''); if(base === 8) s = s.replace(/^0o/, '');
      if(!s) return null;
      var v = 0n, B = BigInt(base);
      for(var i = 0; i < s.length; i++){
        var d = DIG.indexOf(s[i]);
        if(d < 0 || d >= base) throw new Error('“'+s[i]+'” is not a valid digit in base '+base+'.');
        v = v * B + BigInt(d);
      }
      return neg ? -v : v;
    }
    function run(){
      $('#bc-err').textContent = '';
      var v;
      try { v = parse($('#bc-in').value, parseInt($('#bc-from').value, 10)); }
      catch(e){ $('#bc-err').textContent = e.message; $('#bc-out').innerHTML = ''; return; }
      if(v === null){ $('#bc-out').innerHTML = '<div class="result-sub">Enter a number to convert.</div>'; return; }
      var rows = [[2,'Binary'],[8,'Octal'],[10,'Decimal'],[16,'Hexadecimal'],[32,'Base 32'],[36,'Base 36']];
      $('#bc-out').innerHTML = '<dl class="kv">'+rows.map(function(r){
        var s = v.toString(r[0]); return '<dt>'+r[1]+'</dt><dd>'+esc(r[0] === 16 ? s.toUpperCase() : s)+' <button type="button" class="hist-clear" data-copy="'+esc(s)+'">Copy</button></dd>';
      }).join('')+'</dl>';
    }
    body.addEventListener('input', run); body.addEventListener('change', run);
    body.addEventListener('click', function(e){ var b = e.target.closest('[data-copy]'); if(b) copyText(b.getAttribute('data-copy'), 'Value'); });
    run();
  });
}
PLAYABLES['base-converter'] = mountBaseConverter;

/* ==================================================================
   tools / calculator
   ================================================================== */
/* ---------------- Calculator ---------------- */
function mountCalculator(container){
  mountEmbed(container, 'TOOL / CALCULATOR', function(body){
    body.innerHTML =
      '<div class="calc-pad">'+
        '<div class="tool-output calc-expr" id="calc-expr" style="text-align:right;color:var(--muted)"></div>'+
        '<div class="tool-output calc-val" id="calc-val" style="text-align:right;font-weight:bold">0</div>'+
        '<div class="calc-keys">'+
          ['AC','⌫','%','÷','7','8','9','×','4','5','6','−','1','2','3','+','0','.','='].map(function(k){
            var span = k==='0' ? 'grid-column:span 2' : '';
            return '<button class="game-btn'+(['÷','×','−','+','='].indexOf(k)>-1?'':' secondary')+'" data-key="'+k+'" style="'+span+'">'+k+'</button>';
          }).join('')+
        '</div>'+
      '</div>';
    var display='0', op=null, prevVal=null, justEq=false;
    var hist = toolHistory('calculator');
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
        if(op && prevVal!==null){ var r = compute(prevVal, display, op); exprEl.textContent = prevVal+' '+op+' '+display+' ='; hist.add({text:prevVal+' '+op+' '+display, result:String(r)}); display = String(r); op=null; prevVal=null; justEq=true; }
      }
      valEl.textContent = display;
    }
    Array.prototype.slice.call(body.querySelectorAll('[data-key]')).forEach(function(b){ b.addEventListener('click', function(){ press(b.getAttribute('data-key')); }); });
    hist.mount(body, {title:'History', format:function(e){ return {main:e.text+' =', sub:e.result}; }, onPick:function(e){ display = e.result; justEq = true; op = null; prevVal = null; valEl.textContent = display; }});
  });
}
PLAYABLES['calculator'] = mountCalculator;

/* ==================================================================
   tools / case-converter
   ================================================================== */
function mountCaseConverter(container){
  mountEmbed(container, 'TOOL / CASE CONVERTER', function(body){
    function words(s){ return s.replace(/([a-z0-9])([A-Z])/g, '$1 $2').split(/[^A-Za-z0-9]+/).filter(Boolean); }
    var CASES = [
      ['UPPER CASE', function(s){ return s.toUpperCase(); }],
      ['lower case', function(s){ return s.toLowerCase(); }],
      ['Title Case', function(s){ return s.toLowerCase().replace(/(^|[\s\-–—(])([a-z])/g, function(m, a, b){ return a + b.toUpperCase(); }); }],
      ['Sentence case', function(s){ return s.toLowerCase().replace(/(^\s*|[.!?]\s+)([a-z])/g, function(m, a, b){ return a + b.toUpperCase(); }); }],
      ['camelCase', function(s){ return words(s).map(function(w, i){ w = w.toLowerCase(); return i ? w[0].toUpperCase() + w.slice(1) : w; }).join(''); }],
      ['PascalCase', function(s){ return words(s).map(function(w){ w = w.toLowerCase(); return w[0].toUpperCase() + w.slice(1); }).join(''); }],
      ['snake_case', function(s){ return words(s).map(function(w){ return w.toLowerCase(); }).join('_'); }],
      ['kebab-case', function(s){ return words(s).map(function(w){ return w.toLowerCase(); }).join('-'); }],
      ['CONSTANT_CASE', function(s){ return words(s).map(function(w){ return w.toUpperCase(); }).join('_'); }],
    ];
    body.innerHTML =
      '<div class="field"><label for="cc-in">Text</label><textarea id="cc-in" spellcheck="false" placeholder="Type or paste text"></textarea></div>'+
      '<div class="tool-row" style="margin-top:12px">'+CASES.map(function(c, i){ return '<button type="button" class="game-btn secondary" data-i="'+i+'">'+c[0]+'</button>'; }).join('')+'</div>'+
      '<div class="field"><label for="cc-out">Result</label><textarea id="cc-out" readonly spellcheck="false"></textarea></div>'+
      '<div class="tool-row" style="margin-top:12px"><button class="game-btn" id="cc-copy">Copy result</button><button class="game-btn secondary" id="cc-swap">Move result to input</button></div>';
    var $ = function(s){ return body.querySelector(s); };
    body.addEventListener('click', function(e){
      var b = e.target.closest('[data-i]'); if(!b) return;
      $('#cc-out').value = CASES[+b.getAttribute('data-i')][1]($('#cc-in').value);
    });
    $('#cc-copy').addEventListener('click', function(){ if($('#cc-out').value) copyText($('#cc-out').value, 'Result'); });
    $('#cc-swap').addEventListener('click', function(){ if($('#cc-out').value){ $('#cc-in').value = $('#cc-out').value; $('#cc-in').dispatchEvent(new Event('input', {bubbles:true})); } });
  });
}
PLAYABLES['case-converter'] = mountCaseConverter;

/* ==================================================================
   tools / color-converter
   ================================================================== */
// tools/color-converter.js
function mountColorConverter(container){
  mountEmbed(container, 'TOOL / COLOUR CONVERTER', function(body){
    body.innerHTML =
      '<div class="tool-grid"><div class="field"><label for="cl-in">Any colour (hex, rgb(), hsl() or a name)</label><input id="cl-in" value="#6b98e6" spellcheck="false" autocomplete="off"></div>'+
      '<div class="field"><label for="cl-pick">Picker</label><input id="cl-pick" type="color" class="big" value="#6b98e6"></div></div>'+
      '<div class="err-text" id="cl-err" role="alert"></div>'+
      '<div class="contrast-preview" id="cl-prev" style="height:90px;margin-bottom:14px"></div>'+
      '<div class="result-card"><dl class="kv" id="cl-out"></dl></div>'+
      '<div class="result-card"><div class="field-label" style="margin-bottom:8px">Shades</div><div class="dice-row" id="cl-shades"></div></div>';
    var $ = function(s){ return body.querySelector(s); };
    function parse(s){
      s = s.trim(); if(!s) return null;
      var m;
      if((m = /^#?([0-9a-f]{3,8})$/i.exec(s)) && [3, 4, 6, 8].indexOf(m[1].length) > -1){
        var h = m[1]; if(h.length < 5) h = h.split('').map(function(c){ return c + c; }).join('');
        return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)];
      }
      if((m = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i.exec(s))) return [+m[1], +m[2], +m[3]].map(function(v){ return Math.min(255, v); });
      if((m = /^hsla?\(\s*([\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%/i.exec(s))) return hsl2rgb(+m[1], +m[2] / 100, +m[3] / 100);
      var t = document.createElement('span'); t.style.color = ''; t.style.color = s;
      if(!t.style.color) return null;
      document.body.appendChild(t); var c = getComputedStyle(t).color; t.remove();
      m = /(\d+)[^\d]+(\d+)[^\d]+(\d+)/.exec(c); return m ? [+m[1], +m[2], +m[3]] : null;
    }
    function hsl2rgb(h, s, l){
      h = ((h % 360) + 360) % 360; var c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(h / 60 % 2 - 1)), m = l - c / 2, r = 0, g = 0, b = 0;
      if(h < 60){ r = c; g = x; } else if(h < 120){ r = x; g = c; } else if(h < 180){ g = c; b = x; } else if(h < 240){ g = x; b = c; } else if(h < 300){ r = x; b = c; } else { r = c; b = x; }
      return [r, g, b].map(function(v){ return Math.round((v + m) * 255); });
    }
    function rgb2hsl(r, g, b){
      r /= 255; g /= 255; b /= 255; var mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn, h = 0, s = 0;
      if(d){ s = d / (1 - Math.abs(2 * l - 1)); h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; if(h < 0) h += 360; }
      return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
    }
    function hex(r, g, b){ return '#' + [r, g, b].map(function(v){ return v.toString(16).padStart(2, '0'); }).join(''); }
    function render(rgb){
      var r = rgb[0], g = rgb[1], b = rgb[2], hsl = rgb2hsl(r, g, b);
      var mx = Math.max(r, g, b) / 255, mn = Math.min(r, g, b) / 255, v = Math.round(mx * 100), sv = mx ? Math.round((mx - mn) / mx * 100) : 0;
      var k = 1 - mx, c = k < 1 ? Math.round((1 - r / 255 - k) / (1 - k) * 100) : 0, m = k < 1 ? Math.round((1 - g / 255 - k) / (1 - k) * 100) : 0, y = k < 1 ? Math.round((1 - b / 255 - k) / (1 - k) * 100) : 0;
      var rows = [['HEX', hex(r, g, b).toUpperCase()], ['RGB', 'rgb(' + r + ', ' + g + ', ' + b + ')'], ['HSL', 'hsl(' + hsl[0] + ', ' + hsl[1] + '%, ' + hsl[2] + '%)'],
        ['HSV', 'hsv(' + hsl[0] + ', ' + sv + '%, ' + v + '%)'], ['CMYK', 'cmyk(' + c + '%, ' + m + '%, ' + y + '%, ' + Math.round(k * 100) + '%)']];
      $('#cl-out').innerHTML = rows.map(function(x){ return '<dt>' + x[0] + '</dt><dd>' + esc(x[1]) + ' <button type="button" class="hist-clear" data-copy="' + esc(x[1]) + '">Copy</button></dd>'; }).join('');
      $('#cl-prev').style.background = hex(r, g, b);
      $('#cl-shades').innerHTML = [10, 25, 40, 55, 70, 85, 95].map(function(l){
        var c2 = hsl2rgb(hsl[0], hsl[1] / 100, l / 100), hx = hex(c2[0], c2[1], c2[2]);
        return '<button type="button" class="die" style="background:' + hx + ';color:' + (l > 55 ? '#000' : '#fff') + ';font-size:10px" data-copy="' + hx.toUpperCase() + '" title="Copy ' + hx.toUpperCase() + '">' + l + '</button>';
      }).join('');
    }
    function update(src){
      var rgb = parse($('#cl-in').value);
      $('#cl-err').textContent = rgb ? '' : 'Not a colour I recognise. Try #6b98e6, rgb(107,152,230), hsl(218,70%,65%) or a name like teal.';
      if(!rgb) return;
      render(rgb); if(src !== 'pick') $('#cl-pick').value = hex(rgb[0], rgb[1], rgb[2]);
    }
    $('#cl-in').addEventListener('input', function(){ update('text'); });
    $('#cl-pick').addEventListener('input', function(){ $('#cl-in').value = this.value; update('pick'); });
    body.addEventListener('click', function(e){ var b = e.target.closest('[data-copy]'); if(b) copyText(b.getAttribute('data-copy'), 'Colour'); });
    update('text');
  });
}
PLAYABLES['color-converter'] = mountColorConverter;

/* ==================================================================
   tools / color-picker
   ================================================================== */
/* ---------------- Color Picker (image sampler) ---------------- */
function mountColorPicker(container){
  mountEmbed(container, 'TOOL / COLOR PICKER', function(body){
    body.innerHTML =
      '<div class="tl-split cp-split"><div class="tl-main"><input type="file" accept="image/*,.heic,.heif,.avif,.ico,.bmp,.tif,.tiff,.svg,.gif,.webp,.jfif" id="cp-file" class="tool-row">'+
      '<canvas id="cp-canvas" style="max-width:100%;cursor:crosshair;border:1px solid var(--line)"></canvas></div>'+
      '<div class="tl-side"><h3 class="tl-h">'+icon('pipette',{size:14})+' Sampled colour</h3><div class="tool-output" id="cp-out">Upload an image, then click it to sample a color.</div></div></div>';
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
      body.querySelector('#cp-out').innerHTML = '<span class="cp-sw" style="background:'+hex+'"></span>'+hex+' — rgb('+d[0]+', '+d[1]+', '+d[2]+')';
    });
  });
}
PLAYABLES['color-picker'] = mountColorPicker;

/* ==================================================================
   tools / contrast-checker
   ================================================================== */
function mountContrast(container){
  mountEmbed(container, 'TOOL / CONTRAST CHECKER', function(body){
    body.innerHTML =
      '<div class="tool-grid"><div class="field"><label for="cc-fg">Text colour</label><input id="cc-fg" type="color" class="big" value="#eef0f4"></div>'+
      '<div class="field"><label for="cc-bg">Background colour</label><input id="cc-bg" type="color" class="big" value="#0b0c0f"></div>'+
      '<div class="field"><span class="field-label">&nbsp;</span><button class="game-btn secondary" id="cc-swap" style="height:42px">⇄ Swap</button></div></div>'+
      '<div class="contrast-preview" id="cc-prev"><b>Sample heading</b>The quick brown fox jumps over the lazy dog.</div>'+
      '<div class="result-card"><div class="result-big" id="cc-ratio"></div><div class="result-sub">contrast ratio</div>'+
      '<dl class="kv" style="margin-top:14px"><dt>Normal text</dt><dd class="badge-row" id="cc-n"></dd><dt>Large text</dt><dd class="badge-row" id="cc-l"></dd><dt>UI components</dt><dd class="badge-row" id="cc-u"></dd></dl></div>';
    var $ = function(s){ return body.querySelector(s); };
    function lum(hex){
      var c = [1, 3, 5].map(function(i){ var v = parseInt(hex.substr(i, 2), 16) / 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); });
      return .2126 * c[0] + .7152 * c[1] + .0722 * c[2];
    }
    function badge(ok, label){ return '<span class="'+(ok ? 'pass' : 'fail')+'">'+label+' '+(ok ? 'PASS' : 'FAIL')+'</span>'; }
    function update(){
      var fg = $('#cc-fg').value, bg = $('#cc-bg').value, a = lum(fg), b = lum(bg);
      var r = (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
      $('#cc-ratio').textContent = (Math.floor(r * 100) / 100).toFixed(2) + ' : 1';
      $('#cc-prev').style.cssText = 'color:'+fg+';background:'+bg;
      $('#cc-n').innerHTML = badge(r >= 4.5, 'AA') + badge(r >= 7, 'AAA');
      $('#cc-l').innerHTML = badge(r >= 3, 'AA') + badge(r >= 4.5, 'AAA');
      $('#cc-u').innerHTML = badge(r >= 3, 'AA');
    }
    $('#cc-swap').addEventListener('click', function(){
      var t = $('#cc-fg').value; $('#cc-fg').value = $('#cc-bg').value; $('#cc-bg').value = t;
      $('#cc-fg').dispatchEvent(new Event('input', {bubbles:true})); update();
    });
    body.addEventListener('input', update); update();
  });
}
PLAYABLES['contrast-checker'] = mountContrast;

/* ==================================================================
   tools / countdown-timer
   ================================================================== */
// The target time is saved, so a running countdown keeps counting if you reload or close the tab.

function mountCountdown(container){
  mountEmbed(container, 'TOOL / COUNTDOWN TIMER', function(body){
    body.innerHTML =
      '<div class="tool-row"><span class="seg" id="cd-seg"><button type="button" data-m="dur" class="on">Duration</button><button type="button" data-m="date">Target date</button></span>'+
        '<select id="cd-mode" style="display:none"><option value="dur">dur</option><option value="date">date</option></select></div>'+
      '<div id="cd-dur" class="tool-grid"><div class="field"><label for="cd-h">Hours</label><input id="cd-h" type="number" min="0" max="999" value="0"></div>'+
        '<div class="field"><label for="cd-m">Minutes</label><input id="cd-m" type="number" min="0" max="59" value="5"></div>'+
        '<div class="field"><label for="cd-s">Seconds</label><input id="cd-s" type="number" min="0" max="59" value="0"></div></div>'+
      '<div id="cd-date" class="tool-grid" hidden><div class="field"><label for="cd-target">Count down to</label><input id="cd-target" type="datetime-local"></div></div>'+
      '<div class="cd-display" id="cd-disp" role="timer" aria-live="off">00:00:00</div><p class="hint" id="cd-note" style="text-align:center"></p>'+
      '<div class="tool-row" style="justify-content:center"><button class="game-btn" id="cd-start">Start</button><button class="game-btn secondary" id="cd-reset">Reset</button><label><input type="checkbox" id="cd-sound" checked> Sound at zero</label></div>';
    var $ = function(s){ return body.querySelector(s); };
    var KEY = 'vs-countdown', st = lsGet(KEY, null), iv = null, fired = false;

    function fmt(ms){
      var t = Math.max(0, Math.ceil(ms / 1000)), d = Math.floor(t / 86400), h = Math.floor(t % 86400 / 3600), m = Math.floor(t % 3600 / 60), s = t % 60;
      var p = function(n){ return String(n).padStart(2, '0'); };
      return (d ? d + 'd ' : '') + p(h) + ':' + p(m) + ':' + p(s);
    }
    function beep(){
      try {
        var a = new (window.AudioContext || window.webkitAudioContext)(), n = 0;
        (function one(){ var o = a.createOscillator(), g = a.createGain(); o.frequency.value = 880; o.connect(g); g.connect(a.destination);
          g.gain.setValueAtTime(.2, a.currentTime); g.gain.exponentialRampToValueAtTime(.001, a.currentTime + .25); o.start(); o.stop(a.currentTime + .25);
          if(++n < 3) setTimeout(one, 350); })();
      } catch(e){}
    }
    function sync(){
      var m = $('#cd-mode').value;
      $('#cd-dur').hidden = m !== 'dur'; $('#cd-date').hidden = m !== 'date';
      Array.prototype.forEach.call(body.querySelectorAll('#cd-seg button'), function(b){ b.classList.toggle('on', b.getAttribute('data-m') === m); });
    }
    function tick(){
      if(!st){ return; }
      var left = st.end - Date.now();
      $('#cd-disp').textContent = fmt(left);
      document.title = fmt(left) + ' · Countdown';
      if(left <= 0){
        clearInterval(iv); iv = null;
        $('#cd-disp').classList.add('done'); $('#cd-note').textContent = 'Time’s up.';
        $('#cd-start').textContent = 'Start';
        if(!fired){ fired = true; if($('#cd-sound').checked) beep(); notify('Countdown finished', 'ok', {force:true}); }
        st = null; lsSet(KEY, null);
      }
    }
    function start(){
      var end;
      if($('#cd-mode').value === 'dur'){
        var ms = ((+$('#cd-h').value || 0) * 3600 + (+$('#cd-m').value || 0) * 60 + (+$('#cd-s').value || 0)) * 1000;
        if(ms <= 0){ notify('Set a duration first', 'warn'); return; }
        end = Date.now() + ms;
      } else {
        end = new Date($('#cd-target').value).getTime();
        if(isNaN(end) || end <= Date.now()){ notify('Pick a date and time in the future', 'warn'); return; }
      }
      st = {end:end}; lsSet(KEY, st); fired = false;
      $('#cd-disp').classList.remove('done'); $('#cd-note').textContent = 'Ends ' + new Date(end).toLocaleString();
      $('#cd-start').textContent = 'Restart';
      clearInterval(iv); iv = setInterval(tick, 250); tick();
    }
    function reset(){
      clearInterval(iv); iv = null; st = null; lsSet(KEY, null); fired = false; document.title = document.title.replace(/^[\d: d]+ · Countdown$/, 'Countdown Timer');
      $('#cd-disp').textContent = '00:00:00'; $('#cd-disp').classList.remove('done'); $('#cd-note').textContent = ''; $('#cd-start').textContent = 'Start';
    }
    $('#cd-seg').addEventListener('click', function(e){
      var b = e.target.closest('[data-m]'); if(!b) return;
      $('#cd-mode').value = b.getAttribute('data-m'); $('#cd-mode').dispatchEvent(new Event('change', {bubbles:true})); sync();
    });
    $('#cd-mode').addEventListener('change', sync);
    $('#cd-start').addEventListener('click', start); $('#cd-reset').addEventListener('click', reset);
    onUnmount(body, function(){ clearInterval(iv); });
    sync();
    if(st && st.end){
      if(st.end > Date.now()){ $('#cd-note').textContent = 'Ends ' + new Date(st.end).toLocaleString(); $('#cd-start').textContent = 'Restart'; iv = setInterval(tick, 250); tick(); }
      else { st = null; lsSet(KEY, null); }
    }
  });
}
PLAYABLES['countdown-timer'] = mountCountdown;

/* ==================================================================
   tools / currency-converter
   ================================================================== */
// tools/currency-converter
function mountCurrencyConverter(container){
  mountEmbed(container, 'TOOL / CURRENCY CONVERTER', function(body){
    var cur = getCurrency(), fx = null;
    body.innerHTML =
      '<div class="cv-layout"><div>'+
        '<div class="tool-grid"><div class="field"><label for="cv-amt">Amount</label><input id="cv-amt" inputmode="decimal" value="100" autocomplete="off"></div>'+
        '<div class="field"><span class="field-label">From</span><div id="cv-from-w"></div></div>'+
        '<div class="field"><span class="field-label">To</span><div id="cv-to-w"></div></div></div>'+
        '<div class="tool-row"><button class="game-btn secondary" id="cv-swap">⇄ Swap</button><button class="game-btn secondary" id="cv-save">Save to history</button></div>'+
        '<div class="err-text" id="cv-err" role="alert"></div>'+
        '<div class="result-card"><div class="result-big" id="cv-out">—</div><div class="result-sub" id="cv-rate"></div></div>'+
        '<div class="result-card"><div class="field-label" style="margin-bottom:8px">The same amount in other currencies</div><dl class="kv" id="cv-more"></dl></div>'+
      '</div></div>';
    var $ = function(s){ return body.querySelector(s); };
    var hist = toolHistory('currency-converter', {same: function(a, b){ return a.text === b.text; }});
    var from = lsGet('vs-cv-from', 'USD'), to = lsGet('vs-cv-to', cur.code === 'USD' ? 'AUD' : cur.code);
    var pf = currencyPicker($('#cv-from-w'), {value: from, onChange: function(c){ from = c; run(); }});
    var pt = currencyPicker($('#cv-to-w'), {value: to, onChange: function(c){ to = c; run(); }});

    function convert(amount, a, b){ return amount / fx.rates[a] * fx.rates[b]; }
    function amount(){ return parseFloat(String($('#cv-amt').value).replace(/,/g, '')); }
    function run(){
      lsSet('vs-cv-from', from); lsSet('vs-cv-to', to);
      if(!fx) return;
      var amt = amount();
      if(!fx.rates[from] || !fx.rates[to]){ $('#cv-out').textContent = '—'; $('#cv-rate').textContent = 'No rate available for that pair.'; return; }
      if(isNaN(amt)){ $('#cv-out').textContent = '—'; $('#cv-more').innerHTML = ''; return; }
      var r = convert(1, from, to);
      $('#cv-out').textContent = fmtMoney(convert(amt, from, to), to);
      $('#cv-rate').textContent = '1 ' + from + ' = ' + r.toLocaleString(undefined, {maximumFractionDigits: 6}) + ' ' + to + '  ·  1 ' + to + ' = ' + (1 / r).toLocaleString(undefined, {maximumFractionDigits: 6}) + ' ' + from +
        '  ·  rates ' + (fx.date || 'today') + (fx.stale ? ' (offline copy)' : '');
      $('#cv-more').innerHTML = ['USD', 'AUD', 'EUR', 'GBP', 'NZD', 'CAD', 'JPY'].filter(function(c){ return c !== from && fx.rates[c]; })
        .map(function(c){ return '<dt>' + c + '</dt><dd>' + esc(fmtMoney(convert(amt, from, c), c)) + '</dd>'; }).join('');
    }
    function save(){
      var amt = amount();
      if(!fx || isNaN(amt) || !fx.rates[from] || !fx.rates[to]) return;
      hist.add({text: amt + ' ' + from + ' → ' + to, result: fmtMoney(convert(amt, from, to), to)});
      notify('Saved to history', 'ok');
    }
    $('#cv-amt').addEventListener('input', run);
    $('#cv-amt').addEventListener('change', function(){ save(); run(); });
    $('#cv-swap').addEventListener('click', function(){ var t = from; from = to; to = t; pf.set(from); pt.set(to); run(); });
    $('#cv-save').addEventListener('click', save);
    hist.mount(body, {title: 'History', format: function(e){ return {main: e.text, sub: e.result}; }});
    fxLoad().then(function(c){ fx = c; pf.setRates(c.rates); pt.setRates(c.rates); run(); }).catch(function(){ $('#cv-err').textContent = 'Exchange rates couldn’t be loaded. Check your connection and reload.'; });
  });
}
PLAYABLES['currency-converter'] = mountCurrencyConverter;

/* ==================================================================
   tools / date-calculator
   ================================================================== */
// Dates are handled as UTC midnights so daylight-saving changes never skew day counts.

function mountDateCalc(container){
  mountEmbed(container, 'TOOL / DATE CALCULATOR', function(body){
    var today = new Date().toISOString().slice(0, 10);
    body.innerHTML =
      '<div class="result-card"><div class="field-label" style="margin-bottom:10px">Difference between two dates</div>'+
        '<div class="tool-grid two"><div class="field"><label for="dc-a">From</label><input id="dc-a" type="date"></div><div class="field"><label for="dc-b">To</label><input id="dc-b" type="date"></div></div>'+
        '<div id="dc-diff" class="mono-out"></div></div>'+
      '<div class="result-card"><div class="field-label" style="margin-bottom:10px">Add or subtract time</div>'+
        '<div class="tool-grid"><div class="field"><label for="dc-base">Start date</label><input id="dc-base" type="date"></div>'+
        '<div class="field"><label for="dc-op">Operation</label><select id="dc-op"><option value="1">Add</option><option value="-1">Subtract</option></select></div>'+
        '<div class="field"><label for="dc-n">Amount</label><input id="dc-n" type="number" value="30"></div>'+
        '<div class="field"><label for="dc-unit">Unit</label><select id="dc-unit"><option value="d">Days</option><option value="w">Weeks</option><option value="m">Months</option><option value="y">Years</option></select></div></div>'+
        '<div id="dc-add" class="result-big" style="font-size:24px"></div></div>';
    var $ = function(s){ return body.querySelector(s); };
    if(!$('#dc-a').value) $('#dc-a').value = today;
    if(!$('#dc-base').value) $('#dc-base').value = today;
    var hist = toolHistory('date-calculator', {same:function(a, b){ return a.text === b.text; }});
    var DAY = 86400000, WD = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    function utc(s){ var p = s.split('-'); return new Date(Date.UTC(+p[0], p[1] - 1, +p[2])); }
    function show(d){ return WD[d.getUTCDay()] + ', ' + d.getUTCDate() + ' ' + d.toLocaleString('en-AU', {month:'long', timeZone:'UTC'}) + ' ' + d.getUTCFullYear(); }
    function diff(save){
      var a = $('#dc-a').value, b = $('#dc-b').value, out = $('#dc-diff');
      if(!a || !b){ out.textContent = 'Pick two dates.'; return; }
      var A = utc(a), B = utc(b), neg = B < A; if(neg){ var t = A; A = B; B = t; }
      var days = Math.round((B - A) / DAY);
      var y = B.getUTCFullYear() - A.getUTCFullYear(), m = B.getUTCMonth() - A.getUTCMonth(), d = B.getUTCDate() - A.getUTCDate();
      if(d < 0){ m--; d += new Date(Date.UTC(B.getUTCFullYear(), B.getUTCMonth(), 0)).getUTCDate(); }
      if(m < 0){ y--; m += 12; }
      var text = (neg ? 'Earlier by ' : '') + y + ' years, ' + m + ' months, ' + d + ' days';
      out.textContent = days.toLocaleString() + ' days total  (' + Math.floor(days / 7) + ' weeks, ' + days % 7 + ' days)\n' + text;
      if(save) hist.add({text:a + ' → ' + b + ' = ' + days + ' days', sub:text});
    }
    function add(save){
      var base = $('#dc-base').value, n = parseInt($('#dc-n').value, 10), out = $('#dc-add');
      if(!base || isNaN(n)){ out.textContent = '—'; return; }
      var d = utc(base), k = n * (+$('#dc-op').value), u = $('#dc-unit').value;
      if(u === 'd') d = new Date(d.getTime() + k * DAY);
      else if(u === 'w') d = new Date(d.getTime() + k * 7 * DAY);
      else {
        var day = d.getUTCDate(); d.setUTCDate(1);
        if(u === 'm') d.setUTCMonth(d.getUTCMonth() + k); else d.setUTCFullYear(d.getUTCFullYear() + k);
        var last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate(); d.setUTCDate(Math.min(day, last));
      }
      out.textContent = show(d);
      if(save) hist.add({text:base + (k < 0 ? ' − ' : ' + ') + Math.abs(n) + ' ' + $('#dc-unit').selectedOptions[0].text.toLowerCase() + ' = ' + d.toISOString().slice(0, 10), sub:show(d)});
    }
    body.addEventListener('input', function(){ diff(false); add(false); });
    body.addEventListener('change', function(){ diff(true); add(true); });
    hist.mount(body, {title:'History', format:function(e){ return {main:e.text, sub:e.sub}; }});
    diff(false); add(false);
  });
}
PLAYABLES['date-calculator'] = mountDateCalc;

/* ==================================================================
   tools / device-info
   ================================================================== */
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
      body.innerHTML = '<div class="di-wrap">'+
        (publicIp ? '<div class="di-ip"><b>Public IP:</b> '+esc(publicIp)+'</div>' : '<div class="tool-msg">Public IP unavailable (offline or blocked)</div>')+
        '<div class="di-grid">'+rows.map(function(r){ return '<div class="di-row"><span>'+r[0]+'</span><b>'+esc(String(r[1]))+'</b></div>'; }).join('')+'</div>'+
      '</div>';
    }
    fetch('https://api.ipify.org?format=json').then(function(r){ return r.json(); }).then(function(d){ render(d.ip); }).catch(function(){ render(null); });
  });
}
PLAYABLES['device-info'] = mountDeviceInfo;

/* ==================================================================
   tools / dice-coin
   ================================================================== */
function mountDiceCoin(container){
  mountEmbed(container, 'TOOL / DICE & COIN', function(body){
    var SIDES = [4, 6, 8, 10, 12, 20, 100];
    body.innerHTML =
      '<div class="tool-row"><div class="field" style="width:120px"><label for="dc-sides">Dice type</label><select id="dc-sides">'+SIDES.map(function(s){ return '<option value="'+s+'"'+(s === 6 ? ' selected' : '')+'>d'+s+'</option>'; }).join('')+'</select></div>'+
        '<div class="field" style="width:110px"><label for="dc-count">How many</label><input id="dc-count" type="number" min="1" max="10" value="2"></div>'+
        '<button class="game-btn" id="dc-roll">Roll</button><button class="game-btn secondary" id="dc-flip">Flip a coin</button></div>'+
      '<div class="result-card" id="dc-out"><div class="result-sub">Roll some dice or flip a coin.</div></div>';
    var $ = function(s){ return body.querySelector(s); };
    var hist = toolHistory('dice-coin');
    function rnd(n){
      if(window.crypto && crypto.getRandomValues){
        var max = Math.floor(4294967296 / n) * n, b = new Uint32Array(1);
        do { crypto.getRandomValues(b); } while(b[0] >= max);
        return b[0] % n;
      }
      return Math.floor(Math.random() * n);
    }
    $('#dc-roll').addEventListener('click', function(){
      var sides = +$('#dc-sides').value, n = Math.max(1, Math.min(10, parseInt($('#dc-count').value, 10) || 1)), r = [], sum = 0;
      for(var i = 0; i < n; i++){ var v = rnd(sides) + 1; r.push(v); sum += v; }
      $('#dc-out').innerHTML = '<div class="dice-row">'+r.map(function(v){ return '<span class="die">'+v+'</span>'; }).join('')+'</div>'+
        '<div class="result-big">'+sum+'</div><div class="result-sub">'+n+'d'+sides+(n > 1 ? ' total' : '')+'</div>';
      hist.add({text:n+'d'+sides+' → '+r.join(', ')+(n > 1 ? ' = '+sum : '')});
    });
    $('#dc-flip').addEventListener('click', function(){
      var heads = rnd(2) === 0;
      $('#dc-out').innerHTML = '<div class="coin">'+(heads ? 'HEADS' : 'TAILS')+'</div><div class="result-sub">Coin flip</div>';
      hist.add({text:'Coin → '+(heads ? 'Heads' : 'Tails')});
    });
    hist.mount(body, {title:'Roll history', format:function(e){ return {main:e.text}; }});
  });
}
PLAYABLES['dice-coin'] = mountDiceCoin;

/* ==================================================================
   tools / diff-checker
   ================================================================== */
/* ---------------- Diff Checker ---------------- */
function mountDiffChecker(container){
  mountEmbed(container, 'TOOL / DIFF CHECKER', function(body){
    body.innerHTML =
      '<div class="diff-columns">'+
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
      if(a.length*b.length>300000){body.querySelector('#diff-out').textContent='This comparison is too large for the line-by-line algorithm. Try comparing smaller sections (up to roughly 500 lines per side, depending on length).';return;}
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
PLAYABLES['diff-checker'] = mountDiffChecker;

/* ==================================================================
   tools / file-converter
   ================================================================== */
// tools/file-converter.js
// Converts files entirely in your browser; nothing is uploaded.
//   Images  → PNG, JPEG, WebP, BMP, ICO, or PDF (optionally one PDF for all)
//   Audio / video soundtrack → WAV
//   Text    → PDF
// Results can be saved one by one or together as a ZIP.

function mountFileConverter(container, cfg){
  cfg = cfg || {};
  mountEmbed(container, cfg.label || 'TOOL / FILE CONVERTER', function(body){
    var MODES = {
      img: {label: 'Images', accept: 'image/*,.heic,.heif,.avif,.ico,.bmp,.tif,.tiff,.svg,.gif,.webp,.jfif', hint: 'PNG, JPG, WebP, GIF, BMP, SVG, AVIF, ICO and more can be read. HEIC/TIFF only open in Safari.'},
      aud: {label: 'Audio → WAV', accept: 'audio/*,video/*', hint: 'Any audio file, or the soundtrack of a video, that your browser can play.'},
      txt: {label: 'Text → PDF', accept: '.txt,.md,.csv,.json,.log,.xml,.html,.js,.css,.py,text/*', hint: 'Plain text files. Output uses a fixed-width font and Latin characters.'},
    };
    body.innerHTML =
      '<div class="tool-row"' + (cfg.only ? ' hidden' : '') + '><span class="seg" id="fv-seg">' + Object.keys(MODES).map(function(k, i){ return '<button type="button" data-m="' + k + '"' + (i ? '' : ' class="on"') + '>' + MODES[k].label + '</button>'; }).join('') + '</span>'+
        '<select id="fv-mode" style="display:none">' + Object.keys(MODES).map(function(k){ return '<option value="' + k + '">' + k + '</option>'; }).join('') + '</select></div>'+
      '<label class="fv-drop" id="fv-drop" for="fv-file"><b>Drop files here</b> or click to choose<span id="fv-hint"></span></label>'+
      '<input type="file" id="fv-file" multiple hidden data-nopersist>'+
      '<div id="fv-opts"></div>'+
      '<div class="tool-row"><button class="game-btn" id="fv-go" disabled>Convert</button><button class="game-btn secondary" id="fv-zip" disabled>Download all (.zip)</button><button class="game-btn secondary" id="fv-clear" disabled>Clear</button><span class="hint" id="fv-sum" style="margin:0"></span></div>'+
      '<div class="gd-list" id="fv-list" hidden></div>';
    var $ = function(s){ return body.querySelector(s); };
    var items = [], busy = false, seq = 0;
    function canEncode(t){ try { return document.createElement('canvas').toDataURL(t).indexOf('data:' + t) === 0; } catch(e){ return false; } }

    /* ---------- options per mode ---------- */
    function optsHtml(mode){
      if(mode === 'img') return '<div class="tool-grid">'+
        '<div class="field"><label for="fv-fmt">Convert to</label><select id="fv-fmt"><option value="png">PNG</option><option value="jpeg">JPEG</option><option value="webp">WebP</option>' + (canEncode('image/avif') ? '<option value="avif">AVIF</option>' : '') + '<option value="bmp">BMP</option><option value="ico">ICO (icon)</option><option value="pdf">PDF</option></select></div>'+
        '<div class="field" id="fv-qf"><label for="fv-q">Quality <span id="fv-qv">90</span>%</label><input id="fv-q" type="range" min="10" max="100" value="90"></div>'+
        '<div class="field"><label for="fv-w">Max width (px)</label><input id="fv-w" inputmode="numeric" placeholder="Original"></div>'+
        '<div class="field"><label for="fv-h">Max height (px)</label><input id="fv-h" inputmode="numeric" placeholder="Original"></div>'+
        '<div class="field" id="fv-bgf"><label for="fv-bg">Background for transparent areas</label><input id="fv-bg" type="color" class="big" value="#ffffff"></div></div>'+
        '<div class="tool-row" id="fv-icorow" hidden><span class="field-label">Icon sizes</span>' + [16, 32, 48, 64, 128, 256].map(function(s){ return '<label><input type="checkbox" id="fv-ico' + s + '"' + ([16, 32, 48, 256].indexOf(s) > -1 ? ' checked' : '') + '> ' + s + '</label>'; }).join('') + '</div>'+
        '<div class="tool-row" id="fv-mergerow" hidden><label><input type="checkbox" id="fv-merge"> Combine all images into one PDF (one page each)</label></div>';
      if(mode === 'aud') return '<div class="tool-grid"><div class="field"><label for="fv-rate">Sample rate</label><select id="fv-rate"><option value="0">Keep original</option><option value="48000">48 kHz</option><option value="44100">44.1 kHz</option><option value="22050">22.05 kHz</option><option value="16000">16 kHz (speech)</option></select></div>'+
        '<div class="field"><span class="field-label">Channels</span><label><input type="checkbox" id="fv-mono"> Mix down to mono</label></div></div>';
      return '<div class="field"><label for="fv-paste">Or paste text to convert</label><textarea id="fv-paste" spellcheck="false" style="min-height:110px" data-nopersist></textarea></div>'+
        '<div class="tool-row"><button class="game-btn secondary" id="fv-addtext">Add pasted text</button></div>';
    }
    function setMode(){
      var m = $('#fv-mode').value;
      Array.prototype.forEach.call(body.querySelectorAll('#fv-seg button'), function(b){ b.classList.toggle('on', b.getAttribute('data-m') === m); });
      $('#fv-file').accept = MODES[m].accept; $('#fv-hint').textContent = MODES[m].hint;
      $('#fv-opts').innerHTML = optsHtml(m);
      items = []; drawList(); fmtUi();
    }
    function fmtUi(){
      var f = $('#fv-fmt'); if(!f) return;
      var v = f.value;
      $('#fv-qf').hidden = ['jpeg', 'webp', 'avif', 'pdf'].indexOf(v) < 0;
      $('#fv-bgf').hidden = ['jpeg', 'bmp', 'pdf'].indexOf(v) < 0;
      $('#fv-icorow').hidden = v !== 'ico'; $('#fv-mergerow').hidden = v !== 'pdf';
      $('#fv-qv').textContent = $('#fv-q').value;
    }

    /* ---------- encoders ---------- */
    function latin1(s){ var u = new Uint8Array(s.length); for(var i = 0; i < s.length; i++){ var c = s.charCodeAt(i); u[i] = c < 256 ? c : 63; } return u; }
    function readImage(file){
      return new Promise(function(res, rej){
        var url = URL.createObjectURL(file), im = new Image();
        im.onload = function(){ res({im: im, url: url, w: im.naturalWidth || 1024, h: im.naturalHeight || (im.naturalWidth ? 0 : 768)}); };
        im.onerror = function(){ URL.revokeObjectURL(url); rej(new Error('This browser can’t read that image format')); };
        im.src = url;
      });
    }
    function canvasFor(src, o){
      var w = src.w, h = src.h, r = Math.min(o.maxW ? o.maxW / w : 1, o.maxH ? o.maxH / h : 1, 1);
      w = Math.max(1, Math.round(w * r)); h = Math.max(1, Math.round(h * r));
      var c = document.createElement('canvas'); c.width = w; c.height = h;
      var x = c.getContext('2d');
      if(o.bg){ x.fillStyle = o.bg; x.fillRect(0, 0, w, h); }
      x.drawImage(src.im, 0, 0, w, h);
      return c;
    }
    function toBlob(c, type, q){ return new Promise(function(res){ c.toBlob(res, type, q); }); }
    function encodeBMP(c){
      var w = c.width, h = c.height, d = c.getContext('2d').getImageData(0, 0, w, h).data, row = Math.ceil(w * 3 / 4) * 4, size = 54 + row * h;
      var buf = new ArrayBuffer(size), v = new DataView(buf), u = new Uint8Array(buf);
      u[0] = 66; u[1] = 77; v.setUint32(2, size, true); v.setUint32(10, 54, true); v.setUint32(14, 40, true); v.setInt32(18, w, true); v.setInt32(22, h, true);
      v.setUint16(26, 1, true); v.setUint16(28, 24, true); v.setUint32(34, row * h, true); v.setInt32(38, 2835, true); v.setInt32(42, 2835, true);
      for(var y = 0; y < h; y++){ var o = 54 + (h - 1 - y) * row; for(var x = 0; x < w; x++){ var s = (y * w + x) * 4, p = o + x * 3; u[p] = d[s + 2]; u[p + 1] = d[s + 1]; u[p + 2] = d[s]; } }
      return new Blob([buf], {type: 'image/bmp'});
    }
    function encodeICO(src, sizes){
      return Promise.all(sizes.map(function(s){
        var c = document.createElement('canvas'); c.width = c.height = s;
        var r = Math.min(s / src.w, s / src.h), dw = src.w * r, dh = src.h * r;
        c.getContext('2d').drawImage(src.im, (s - dw) / 2, (s - dh) / 2, dw, dh);
        return toBlob(c, 'image/png').then(function(b){ return b.arrayBuffer(); }).then(function(ab){ return {s: s, u: new Uint8Array(ab)}; });
      })).then(function(list){
        var head = 6 + 16 * list.length, total = head; list.forEach(function(l){ total += l.u.length; });
        var buf = new ArrayBuffer(total), v = new DataView(buf), u = new Uint8Array(buf), off = head;
        v.setUint16(2, 1, true); v.setUint16(4, list.length, true);
        list.forEach(function(l, i){
          var p = 6 + i * 16; u[p] = l.s >= 256 ? 0 : l.s; u[p + 1] = l.s >= 256 ? 0 : l.s;
          v.setUint16(p + 4, 1, true); v.setUint16(p + 6, 32, true); v.setUint32(p + 8, l.u.length, true); v.setUint32(p + 12, off, true);
          u.set(l.u, off); off += l.u.length;
        });
        return new Blob([buf], {type: 'image/x-icon'});
      });
    }
    function buildImagePdf(pages){
      var enc = new TextEncoder(), parts = [], offsets = [], pos = 0;
      function add(x){ var u = typeof x === 'string' ? enc.encode(x) : x; parts.push(u); pos += u.length; }
      function obj(n, fn){ offsets[n] = pos; add(n + ' 0 obj\n'); fn(); add('\nendobj\n'); }
      add('%PDF-1.4\n');
      var n = pages.length;
      obj(1, function(){ add('<< /Type /Catalog /Pages 2 0 R >>'); });
      obj(2, function(){ add('<< /Type /Pages /Count ' + n + ' /Kids [' + pages.map(function(p, i){ return (3 + 3 * i) + ' 0 R'; }).join(' ') + '] >>'); });
      pages.forEach(function(p, i){
        var pw = Math.round(p.w * .75 * 100) / 100, ph = Math.round(p.h * .75 * 100) / 100, pn = 3 + 3 * i, cn = 4 + 3 * i, im = 5 + 3 * i;
        obj(pn, function(){ add('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + pw + ' ' + ph + '] /Resources << /XObject << /Im0 ' + im + ' 0 R >> >> /Contents ' + cn + ' 0 R >>'); });
        var cs = 'q ' + pw + ' 0 0 ' + ph + ' 0 0 cm /Im0 Do Q';
        obj(cn, function(){ add('<< /Length ' + cs.length + ' >>\nstream\n' + cs + '\nendstream'); });
        obj(im, function(){ add('<< /Type /XObject /Subtype /Image /Width ' + p.w + ' /Height ' + p.h + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + p.jpeg.length + ' >>\nstream\n'); add(p.jpeg); add('\nendstream'); });
      });
      var total = 2 + 3 * n, xref = pos, x = 'xref\n0 ' + (total + 1) + '\n0000000000 65535 f \n';
      for(var i = 1; i <= total; i++) x += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
      add(x + 'trailer\n<< /Size ' + (total + 1) + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF');
      return new Blob(parts, {type: 'application/pdf'});
    }
    function buildTextPdf(text){
      var COLS = 81, PER = 58, lines = [];
      text.replace(/\r\n?/g, '\n').replace(/\t/g, '    ').split('\n').forEach(function(l){
        if(!l.length){ lines.push(''); return; }
        while(l.length > COLS){ var cut = l.lastIndexOf(' ', COLS); if(cut < COLS * .5) cut = COLS; lines.push(l.slice(0, cut)); l = l.slice(cut).replace(/^ /, ''); }
        lines.push(l);
      });
      var pages = []; for(var i = 0; i < lines.length; i += PER) pages.push(lines.slice(i, i + PER));
      if(!pages.length) pages.push(['']);
      var parts = [], offsets = [], pos = 0;
      function add(x){ var u = typeof x === 'string' ? latin1(x) : x; parts.push(u); pos += u.length; }
      function obj(n, fn){ offsets[n] = pos; add(n + ' 0 obj\n'); fn(); add('\nendobj\n'); }
      function esc(s){ return s.replace(/[\\()]/g, '\\$&'); }
      add('%PDF-1.4\n');
      obj(1, function(){ add('<< /Type /Catalog /Pages 2 0 R >>'); });
      obj(2, function(){ add('<< /Type /Pages /Count ' + pages.length + ' /Kids [' + pages.map(function(p, i){ return (4 + 2 * i) + ' 0 R'; }).join(' ') + '] >>'); });
      obj(3, function(){ add('<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>'); });
      pages.forEach(function(p, i){
        var pn = 4 + 2 * i, cn = 5 + 2 * i;
        var cs = 'BT /F1 10 Tf 12.5 TL 54 788 Td\n' + p.map(function(l){ return '(' + esc(l) + ') Tj T*'; }).join('\n') + '\nET';
        obj(pn, function(){ add('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ' + cn + ' 0 R >>'); });
        obj(cn, function(){ var b = latin1(cs); add('<< /Length ' + b.length + ' >>\nstream\n'); add(b); add('\nendstream'); });
      });
      var total = 3 + 2 * pages.length, xref = pos, x = 'xref\n0 ' + (total + 1) + '\n0000000000 65535 f \n';
      for(var k = 1; k <= total; k++) x += String(offsets[k]).padStart(10, '0') + ' 00000 n \n';
      add(x + 'trailer\n<< /Size ' + (total + 1) + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF');
      return new Blob(parts, {type: 'application/pdf'});
    }
    function encodeWav(buf, mono){
      var ch = mono ? 1 : Math.min(buf.numberOfChannels, 2), len = buf.length, rate = buf.sampleRate, n = buf.numberOfChannels;
      var dv = new DataView(new ArrayBuffer(44 + len * ch * 2));
      function str(o, s){ for(var i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); }
      str(0, 'RIFF'); dv.setUint32(4, 36 + len * ch * 2, true); str(8, 'WAVE'); str(12, 'fmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, ch, true);
      dv.setUint32(24, rate, true); dv.setUint32(28, rate * ch * 2, true); dv.setUint16(32, ch * 2, true); dv.setUint16(34, 16, true); str(36, 'data'); dv.setUint32(40, len * ch * 2, true);
      var chans = []; for(var c = 0; c < n; c++) chans.push(buf.getChannelData(c));
      var off = 44;
      for(var i = 0; i < len; i++){
        for(var k = 0; k < ch; k++){
          var s; if(mono){ s = 0; for(var q = 0; q < n; q++) s += chans[q][i]; s /= n; } else s = chans[k][i];
          s = Math.max(-1, Math.min(1, s)); dv.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7FFF, true); off += 2;
        }
      }
      return new Blob([dv.buffer], {type: 'audio/wav'});
    }
    function decodeAudio(file, rate, mono){
      return file.arrayBuffer().then(function(ab){
        var AC = window.AudioContext || window.webkitAudioContext; if(!AC) throw new Error('Audio decoding isn’t supported here');
        var ctx = new AC();
        return new Promise(function(res, rej){ ctx.decodeAudioData(ab, res, function(){ rej(new Error('This browser can’t decode that file')); }); })
          .then(function(buf){ ctx.close && ctx.close(); return buf; });
      }).then(function(buf){
        if(!rate || rate === buf.sampleRate) return buf;
        var off = new OfflineAudioContext(buf.numberOfChannels, Math.ceil(buf.length * rate / buf.sampleRate), rate), src = off.createBufferSource();
        src.buffer = buf; src.connect(off.destination); src.start();
        return off.startRendering();
      }).then(function(buf){ return encodeWav(buf, mono); });
    }

    /* ---------- conversion ---------- */
    function baseName(n){ return n.replace(/\.[^.]+$/, '') || 'file'; }
    function convertOne(it, mode, o){
      if(mode === 'aud') return decodeAudio(it.file, o.rate, o.mono).then(function(b){ return [{blob: b, name: baseName(it.file.name) + '.wav'}]; });
      if(mode === 'txt') return (it.text != null ? Promise.resolve(it.text) : it.file.text()).then(function(t){ return [{blob: buildTextPdf(t), name: baseName(it.name) + '.pdf'}]; });
      return readImage(it.file).then(function(src){
        var f = o.fmt, c;
        function done(blob, ext){ URL.revokeObjectURL(src.url); if(!blob) throw new Error('This browser can’t encode ' + ext.toUpperCase()); return [{blob: blob, name: baseName(it.file.name) + '.' + ext}]; }
        if(f === 'ico') return encodeICO(src, o.icoSizes).then(function(b){ return done(b, 'ico'); });
        c = canvasFor(src, {maxW: o.maxW, maxH: o.maxH, bg: (f === 'jpeg' || f === 'bmp' || f === 'pdf') ? o.bg : null});
        if(f === 'bmp') return done(encodeBMP(c), 'bmp');
        if(f === 'pdf') return toBlob(c, 'image/jpeg', o.q).then(function(b){ return b.arrayBuffer(); }).then(function(ab){
          URL.revokeObjectURL(src.url);
          it.page = {w: c.width, h: c.height, jpeg: new Uint8Array(ab)};
          return o.merge ? [] : [{blob: buildImagePdf([it.page]), name: baseName(it.file.name) + '.pdf'}];
        });
        var type = f === 'jpeg' ? 'image/jpeg' : f === 'webp' ? 'image/webp' : f === 'avif' ? 'image/avif' : 'image/png';
        return toBlob(c, type, o.q).then(function(b){ return done(b && b.type === type ? b : null, f === 'jpeg' ? 'jpg' : f); });
      });
    }
    function readOpts(mode){
      var g = function(id){ var e = $('#' + id); return e ? e : null; };
      if(mode === 'aud') return {rate: +g('fv-rate').value, mono: g('fv-mono').checked};
      if(mode === 'txt') return {};
      var sizes = [16, 32, 48, 64, 128, 256].filter(function(s){ return g('fv-ico' + s).checked; });
      return {fmt: g('fv-fmt').value, q: (+g('fv-q').value) / 100, maxW: parseInt(g('fv-w').value, 10) || 0, maxH: parseInt(g('fv-h').value, 10) || 0,
        bg: g('fv-bg').value, icoSizes: sizes.length ? sizes : [32], merge: g('fv-merge').checked};
    }
    function run(){
      if(busy || !items.length) return;
      items = items.filter(function(i){ return !i.result; });   // drop an old combined PDF before re-running
      var mode = $('#fv-mode').value, o = readOpts(mode);
      busy = true; $('#fv-go').disabled = true;
      var chain = Promise.resolve();
      items.forEach(function(it){
        chain = chain.then(function(){
          it.state = 'work'; it.out = null; drawList();
          return convertOne(it, mode, o).then(function(out){ it.out = out; it.state = 'done'; }, function(e){ it.state = 'err'; it.err = e.message || 'Failed'; });
        }).then(drawList);
      });
      chain.then(function(){
        if(mode === 'img' && o.fmt === 'pdf' && o.merge){
          var pages = items.filter(function(i){ return i.page; }).map(function(i){ return i.page; });
          if(pages.length) items.push({id: ++seq, name: 'combined.pdf', file: {name: 'combined.pdf', size: 0}, state: 'done', out: [{blob: buildImagePdf(pages), name: 'combined.pdf'}], result: true});
        }
        busy = false; $('#fv-go').disabled = false; drawList();
        var ok = items.filter(function(i){ return i.state === 'done'; }).length;
        notify(ok + ' of ' + items.filter(function(i){ return !i.result; }).length + ' converted', ok ? 'ok' : 'err');
      });
    }

    /* ---------- list ---------- */
    function drawList(){
      var list = $('#fv-list'); list.hidden = !items.length;
      list.innerHTML = items.map(function(it){
        var outSize = it.out ? it.out.reduce(function(s, x){ return s + x.blob.size; }, 0) : 0;
        var status = it.state === 'work' ? 'Converting…' : it.state === 'err' ? '<span class="fail">' + esc(it.err) + '</span>' : it.state === 'done' ? (it.out.length ? fmtSize(it.file.size || 0) + ' → <b>' + fmtSize(outSize) + '</b>' : 'Added to combined PDF') : 'Ready';
        return '<div class="fv-row"><div class="gd-main"><div class="gd-title">' + esc(it.name) + '</div><div class="gd-sub">' + status + (!it.state ? ' · ' + fmtSize(it.file.size || 0) : '') + '</div></div>'+
          (it.out && it.out.length ? '<button type="button" class="game-btn secondary" data-save="' + it.id + '">Save</button>' : '') +
          (it.result ? '' : '<button type="button" class="hist-clear" data-rm="' + it.id + '" aria-label="Remove">✕</button>') + '</div>';
      }).join('');
      var done = items.filter(function(i){ return i.out && i.out.length; });
      $('#fv-go').disabled = busy || !items.filter(function(i){ return !i.result; }).length;
      $('#fv-zip').disabled = !done.length; $('#fv-clear').disabled = !items.length || busy;
      $('#fv-sum').textContent = items.length ? items.filter(function(i){ return !i.result; }).length + ' file(s)' : '';
    }
    function addFiles(files){
      var m = $('#fv-mode').value;
      Array.prototype.forEach.call(files, function(f){
        items = items.filter(function(i){ return !i.result; });
        items.push({id: ++seq, file: f, name: f.name});
      });
      drawList();
      if(m === 'img'){ var f = $('#fv-fmt'); if(f) fmtUi(); }
    }
    $('#fv-file').addEventListener('change', function(){ addFiles(this.files); this.value = ''; });
    var drop = $('#fv-drop');
    ['dragenter', 'dragover'].forEach(function(t){ drop.addEventListener(t, function(e){ e.preventDefault(); drop.classList.add('over'); }); });
    ['dragleave', 'drop'].forEach(function(t){ drop.addEventListener(t, function(e){ e.preventDefault(); drop.classList.remove('over'); }); });
    drop.addEventListener('drop', function(e){ if(e.dataTransfer && e.dataTransfer.files.length) addFiles(e.dataTransfer.files); });
    $('#fv-go').addEventListener('click', run);
    $('#fv-clear').addEventListener('click', function(){ items = []; drawList(); });
    $('#fv-zip').addEventListener('click', function(){
      var files = [], used = {};
      items.forEach(function(i){ (i.out || []).forEach(function(x){ files.push(x); }); });
      Promise.all(files.map(function(x){ return x.blob.arrayBuffer().then(function(ab){
        var n = x.name, k = 1; while(used[n]){ n = x.name.replace(/(\.[^.]*)?$/, ' (' + (k++) + ')$1'); } used[n] = 1;
        return {name: n, data: new Uint8Array(ab)};
      }); })).then(function(list){ saveBlob('converted-files.zip', makeZip(list)); });
    });
    $('#fv-list').addEventListener('click', function(e){
      var s = e.target.closest('[data-save]'), r = e.target.closest('[data-rm]');
      if(s){ var it = items.filter(function(i){ return String(i.id) === s.getAttribute('data-save'); })[0]; if(it) it.out.forEach(function(x){ saveBlob(x.name, x.blob); }); }
      if(r && !busy){ items = items.filter(function(i){ return String(i.id) !== r.getAttribute('data-rm'); }); drawList(); }
    });
    body.addEventListener('input', function(e){ if(e.target.id === 'fv-q') $('#fv-qv').textContent = e.target.value; });
    body.addEventListener('change', function(e){ if(e.target.id === 'fv-fmt') fmtUi(); });
    body.addEventListener('click', function(e){
      if(e.target.id === 'fv-addtext'){
        var t = $('#fv-paste').value; if(!t.trim()){ notify('Paste some text first', 'warn'); return; }
        items = items.filter(function(i){ return !i.result; });
        items.push({id: ++seq, text: t, name: 'pasted-text-' + (items.length + 1) + '.txt', file: {name: 'pasted-text.txt', size: t.length}}); $('#fv-paste').value = ''; drawList();
      }
    });
    $('#fv-seg').addEventListener('click', function(e){
      var b = e.target.closest('[data-m]'); if(!b) return;
      $('#fv-mode').value = b.getAttribute('data-m'); $('#fv-mode').dispatchEvent(new Event('change', {bubbles: true}));
    });
    $('#fv-mode').addEventListener('change', setMode);
    if(cfg.mode) $('#fv-mode').value = cfg.mode;
    setMode();
  });
}
PLAYABLES['file-converter'] = mountFileConverter;

/* ==================================================================
   tools / fraction-calculator
   ================================================================== */
// Exact fraction arithmetic using BigInt, so large numerators never lose precision.

function mountFractionCalc(container){
  mountEmbed(container, 'TOOL / FRACTION CALCULATOR', function(body){
    var OPS = {'+':'Add', '-':'Subtract', '×':'Multiply', '÷':'Divide'};
    function fracIn(p, label){
      return '<div class="field"><span class="field-label">'+label+'</span><div class="frac-in">'+
        '<input class="whole" id="'+p+'-w" inputmode="numeric" placeholder="0" autocomplete="off" aria-label="'+label+' whole number">'+
        '<div class="frac-stack"><input id="'+p+'-n" inputmode="numeric" placeholder="num" autocomplete="off" aria-label="'+label+' numerator"><hr>'+
        '<input id="'+p+'-d" inputmode="numeric" placeholder="den" autocomplete="off" aria-label="'+label+' denominator"></div></div></div>';
    }
    body.innerHTML =
      '<div class="frac-row">'+fracIn('a','First')+
        '<div class="field"><span class="field-label">Operation</span><div class="frac-ops" id="fc-ops">'+
          Object.keys(OPS).map(function(o){ return '<button type="button" data-op="'+o+'" title="'+OPS[o]+'" aria-label="'+OPS[o]+'">'+o+'</button>'; }).join('')+
        '</div><select id="fc-op" style="display:none"><option>+</option><option>-</option><option>×</option><option>÷</option></select></div>'+
        fracIn('b','Second')+'</div>'+
      '<div class="err-text" id="fc-err" role="alert"></div>'+
      '<div class="result-card" id="fc-result"><div class="result-sub">Enter two fractions. Mixed numbers work: put the whole part on the left.</div></div>'+
      '<div class="result-card"><div class="field-label" style="margin-bottom:8px">Decimal to fraction</div>'+
        '<div class="tool-row"><input id="fc-dec" inputmode="decimal" placeholder="e.g. 0.375" autocomplete="off" style="width:160px"><span id="fc-dec-out" class="mono-out"></span></div></div>';

    var $ = function(s){ return body.querySelector(s); };
    var hist = toolHistory('fraction-calculator', {same:function(a,b){ return a.expr === b.expr; }});
    var current = null;

    /* ---- BigInt helpers ---- */
    function abs(x){ return x < 0n ? -x : x; }
    function gcd(a, b){ a = abs(a); b = abs(b); while(b){ var t = a % b; a = b; b = t; } return a; }
    function norm(n, d){ if(d < 0n){ n = -n; d = -d; } var g = gcd(n, d) || 1n; return {n:n / g, d:d / g}; }
    function fmt(f){ return f.d === 1n ? String(f.n) : f.n + '/' + f.d; }
    function mixed(f){
      if(f.d === 1n || abs(f.n) < f.d) return fmt(f);
      var w = f.n / f.d, r = abs(f.n % f.d);
      return r === 0n ? String(w) : w + ' ' + r + '/' + f.d;
    }
    function decimal(f, digits){
      var neg = f.n < 0n, n = abs(f.n), out = (neg ? '-' : '') + (n / f.d), r = n % f.d;
      if(r === 0n) return out;
      out += '.';
      for(var i = 0; i < digits && r !== 0n; i++){ r *= 10n; out += (r / f.d); r %= f.d; }
      return r === 0n ? out : out + '…';
    }

    /* ---- reading the inputs ---- */
    function val(id){ return $('#'+id).value.trim(); }
    function readFrac(p){
      var w = val(p+'-w'), n = val(p+'-n'), d = val(p+'-d');
      if(w === '' && n === '' && d === '') return null;
      [w, n, d].forEach(function(x){ if(x !== '' && !/^-?\d+$/.test(x)) throw new Error('Use whole numbers only (no decimals) in each box.'); });
      if(w !== '' && n === '' && d !== '') throw new Error('Add a numerator, or clear the denominator.');
      var D = d === '' ? 1n : BigInt(d);
      if(D === 0n) throw new Error('A denominator cannot be zero.');
      var W = w === '' ? 0n : BigInt(w), N = n === '' ? 0n : BigInt(n);
      var neg = w.charAt(0) === '-', num;
      if((w !== '' && W !== 0n) || neg){ num = abs(W) * D + abs(N); if(neg) num = -num; } else num = N;
      return norm(num, D);
    }

    function compute(){
      $('#fc-err').textContent = '';
      var A, B;
      try { A = readFrac('a'); B = readFrac('b'); }
      catch(e){ $('#fc-err').textContent = e.message; current = null; return null; }
      if(!A || !B){ current = null; $('#fc-result').innerHTML = '<div class="result-sub">Enter two fractions. Mixed numbers work: put the whole part on the left.</div>'; return null; }
      var op = $('#fc-op').value, R, steps = [];
      var sa = mixed(A) !== fmt(A) ? mixed(A)+' = '+fmt(A) : fmt(A), sb = mixed(B) !== fmt(B) ? mixed(B)+' = '+fmt(B) : fmt(B);
      if(op === '+' || op === '-'){
        var L = A.d / gcd(A.d, B.d) * B.d, an = A.n * (L / A.d), bn = B.n * (L / B.d);
        steps.push('Common denominator: '+L);
        steps.push(fmt(A)+' → '+an+'/'+L+',  '+fmt(B)+' → '+bn+'/'+L);
        var top = op === '+' ? an + bn : an - bn;
        steps.push(an+(op === '+' ? ' + ' : ' − ')+bn+' = '+top+'  →  '+top+'/'+L);
        R = norm(top, L);
      } else if(op === '×'){
        steps.push('Multiply across: ('+A.n+' × '+B.n+') / ('+A.d+' × '+B.d+')');
        R = norm(A.n * B.n, A.d * B.d);
      } else {
        if(B.n === 0n){ $('#fc-err').textContent = 'You can’t divide by zero.'; current = null; return null; }
        steps.push('Flip the second fraction and multiply: '+fmt(A)+' × '+fmt(norm(B.d, B.n)));
        R = norm(A.n * B.d, A.d * B.n);
      }
      steps.push('Simplify to lowest terms: '+fmt(R));
      var expr = '('+mixed(A)+') '+op+' ('+mixed(B)+')';
      current = {expr:expr, result:fmt(R), mixed:mixed(R), dec:decimal(R, 10), R:R};
      $('#fc-result').innerHTML =
        '<div class="result-big">'+esc(fmt(R))+'</div>'+
        '<dl class="kv" style="margin-top:12px"><dt>Mixed</dt><dd>'+esc(mixed(R))+'</dd><dt>Decimal</dt><dd>'+esc(decimal(R, 10))+'</dd><dt>Percent</dt><dd>'+esc(decimal(norm(R.n * 100n, R.d), 6))+'%</dd></dl>'+
        '<ol class="steps"><li>Inputs: '+esc(sa)+(op === '÷' ? '  ÷  ' : '  '+op+'  ')+esc(sb)+'</li>'+steps.map(function(s){ return '<li>'+esc(s)+'</li>'; }).join('')+'</ol>'+
        '<div class="tool-row"><button class="game-btn" id="fc-save">Save to history</button><button class="game-btn secondary" id="fc-copy">Copy result</button><button class="game-btn secondary" id="fc-chain">Use as first fraction</button></div>';
      $('#fc-save').addEventListener('click', save);
      $('#fc-copy').addEventListener('click', function(){ copyText(fmt(R), 'Result'); });
      $('#fc-chain').addEventListener('click', function(){ setFrac('a', R); });
      return current;
    }
    function save(){ if(current){ hist.add({expr:current.expr, result:current.result, dec:current.dec}); notify('Saved to history', 'ok'); } }
    function setFrac(p, f){
      var w = '', n = String(f.n), d = String(f.d);
      if(f.d === 1n){ w = n; n = ''; d = ''; }
      $('#'+p+'-w').value = w; $('#'+p+'-n').value = n; $('#'+p+'-d').value = d === '' ? '' : d;
      ['w','n','d'].forEach(function(k){ $('#'+p+'-'+k).dispatchEvent(new Event('input', {bubbles:true})); });
    }

    function setOp(op){
      $('#fc-op').value = op;
      Array.prototype.forEach.call(body.querySelectorAll('#fc-ops button'), function(b){ b.classList.toggle('on', b.getAttribute('data-op') === op); });
      $('#fc-op').dispatchEvent(new Event('change', {bubbles:true}));
    }
    body.querySelector('#fc-ops').addEventListener('click', function(e){
      var b = e.target.closest('[data-op]'); if(b){ setOp(b.getAttribute('data-op')); compute(); }
    });
    body.addEventListener('input', function(e){ if(e.target.id !== 'fc-dec') compute(); });
    body.addEventListener('keydown', function(e){ if(e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.id !== 'fc-dec'){ compute(); save(); } });

    $('#fc-dec').addEventListener('input', function(){
      var v = this.value.trim(), out = $('#fc-dec-out');
      if(!v){ out.textContent = ''; return; }
      var m = /^(-?)(\d*)\.?(\d*)$/.exec(v);
      if(!m || (m[2] === '' && m[3] === '')){ out.textContent = 'Enter a number like 0.375 or 2.5'; return; }
      var places = m[3].length, n = BigInt((m[2] || '0') + m[3]) * (m[1] ? -1n : 1n);
      var f = norm(n, 10n ** BigInt(places));
      out.textContent = '= ' + fmt(f) + (abs(f.n) >= f.d && f.d !== 1n ? '   (' + mixed(f) + ')' : '');
    });

    hist.mount(body, {title:'History', format:function(e){ return {main:e.expr+' = '+e.result, sub:'≈ '+e.dec}; },
      onPick:function(e){ var parts = e.result.split('/'); setFrac('a', norm(BigInt(parts[0]), BigInt(parts[1] || '1'))); compute(); }});
    setOp($('#fc-op').value || '+');
    compute();
  });
}
PLAYABLES['fraction-calculator'] = mountFractionCalc;

/* ==================================================================
   tools / game-deals
   ================================================================== */
// tools/game-deals
// Game Deals & Freebies. Prices come from CheapShark (USD) and giveaways from GamerPower; both are
// read straight from your browser. Prices are converted from USD with a daily exchange rate, so they
// are estimates: stores can charge differently in your region.
function mountGameDeals(container){
  mountEmbed(container, 'TOOL / GAME DEALS & FREEBIES', function(body){
    var CS = 'https://www.cheapshark.com/api/1.0', GP = 'https://www.gamerpower.com/api', PAGE = 40, GPAGE = 18;
    var PLATFORMS = [['', 'All platforms'], ['pc', 'PC'], ['steam', 'Steam'], ['epic-games-store', 'Epic Games'], ['gog', 'GOG'], ['ubisoft', 'Ubisoft'], ['itchio', 'itch.io'], ['battlenet', 'Battle.net'],
      ['ps5', 'PlayStation 5'], ['ps4', 'PlayStation 4'], ['xbox-series-xs', 'Xbox Series X|S'], ['xbox-one', 'Xbox One'], ['switch', 'Nintendo Switch'], ['android', 'Android'], ['ios', 'iOS'], ['vr', 'VR']];
    var fx = null, stores = null, storeList = [], cur = getCurrency(), freeLoaded = false, picker = null, dealsRequest = 0;

    body.innerHTML =
      '<div class="gd-top"><span class="seg" id="gd-seg"><button type="button" data-t="deals" class="on">'+icon('tag',{size:14})+' Deals</button><button type="button" data-t="free">'+icon('gift',{size:14})+' Free stuff</button><button type="button" data-t="wish">'+icon('heart',{size:14})+' Wishlist <span id="gd-wcount"></span></button></span>'+
        '<select id="gd-tab" style="display:none"><option value="deals">deals</option><option value="free">free</option><option value="wish">wish</option></select>'+
        '<div class="gd-cur"><span class="field-label">Prices in</span><div id="gd-cur-w"></div></div></div>'+
      '<p class="hint" id="gd-fx">Loading exchange rates…</p>'+
      '<div id="gd-local-warning" class="tool-msg gd-local-warning" role="status" hidden></div>'+

      '<div id="gd-deals" class="gd-layout">'+
        '<aside class="gd-filters"><div class="field"><span class="field-label">Stores to search</span><details class="gd-check-picker" id="gd-store-wrap"><summary id="gd-store-summary">All stores</summary><div class="gd-check-options" id="gd-store-options"><label><input type="checkbox" id="gd-store-all" checked> All stores</label></div></details></div>'+
          '<div class="field"><label for="gd-kind">Content type</label><select id="gd-kind"><option value="all">Games &amp; DLC</option><option value="game">Games only</option><option value="dlc">DLC &amp; add-ons</option></select></div>'+
          '<div class="field"><label for="gd-sort">Sort by</label><select id="gd-sort"><option value="Deal Rating">Best deal</option><option value="Price">Lowest price</option><option value="Savings">Biggest discount</option><option value="recent">Newest deals</option><option value="Reviews">Steam reviews</option><option value="Metacritic">Metacritic</option><option value="Title">Title A–Z</option></select></div>'+
          '<div class="field"><label for="gd-max">Max price (<span id="gd-maxc"></span>)</label><input id="gd-max" inputmode="decimal" autocomplete="off" placeholder="No limit"></div>'+
          '<label><input type="checkbox" id="gd-sale"> On sale only</label><button type="button" class="game-btn secondary gd-reset-filters" id="gd-reset-filters" hidden>Reset filters</button></aside>'+
        '<section class="gd-main"><div id="gd-pager-top"></div><div class="gd-searchbar">'+icon('search',{size:18})+'<input id="gd-q" type="search" autocomplete="off" placeholder="Search for a game, e.g. Hades or Elden Ring — leave empty for the top deals"><button class="game-btn" id="gd-go">Search</button></div>'+
          '<div class="gd-links" id="gd-links"></div><div id="gd-results"></div></section>'+
      '</div>'+

      '<div id="gd-wish" hidden><h3 class="gd-h">'+icon('heart',{size:14})+' Your wishlist</h3><p class="hint">Saved in this browser only. Use the heart on any deal to add a game; prices refresh whenever you open this tab.</p><div id="gw-list"></div></div>'+

      '<div id="gd-free" class="gd-layout gd-free-layout" hidden>'+
        '<aside class="gd-filters">'+
          '<div class="field"><label for="gf-type">Giveaway type</label><select id="gf-type"><option value="">Everything</option><option value="game">Full games</option><option value="loot">In-game loot &amp; DLC</option><option value="beta">Beta access</option></select></div>'+
          '<div class="field"><span class="field-label">Platforms</span><details class="gd-check-picker" id="gf-plat-wrap"><summary id="gf-plat-summary">All platforms</summary><div class="gd-check-options"><input type="search" class="gd-picker-search" id="gf-plat-search" placeholder="Search platforms…" aria-label="Search platforms"><label><input type="checkbox" id="gf-plat-all" checked> All platforms</label>'+PLATFORMS.filter(function(p){return p[0];}).map(function(p){return '<label data-platform-label="'+esc((p[0]+' '+p[1]).toLowerCase())+'"><input type="checkbox" data-gf-platform="'+p[0]+'"> '+p[1]+'</label>';}).join('')+'</div></details></div>'+
          '<div class="field"><label for="gf-sort">Sort by</label><select id="gf-sort"><option value="date">Newest</option><option value="value">Highest value</option><option value="popularity">Most popular</option></select></div>'+
          '<div class="field"><span class="field-label">Official store freebies</span><details class="gd-check-picker" id="gf-store-wrap"><summary id="gf-store-summary">All stores</summary><div class="gd-check-options" id="gf-store-options"><label><input type="checkbox" id="gf-store-all" checked> All stores</label></div></details></div>'+
          '<label class="gd-check-inline"><input type="checkbox" id="gf-hide"> Show claimed in active lists</label><button type="button" class="game-btn secondary" id="gf-refresh">Refresh results</button>'+
        '</aside>'+
        '<section class="gd-main"><div class="gd-searchbar">'+icon('search',{size:18})+'<input id="gf-q" type="search" autocomplete="off" placeholder="Search free games, giveaways and loot by name or platform"></div>'+
          '<div id="gf-stats" class="gd-stats"></div>'+
          '<h3 class="gd-h">Giveaways &amp; freebies</h3><div id="gf-list"></div><div id="gf-pager"></div>'+
          '<h3 class="gd-h">Free right now on official stores</h3><p class="hint">Claimed store freebies are hidden here. Mark a free deal as claimed to keep it in your claimed list.</p><div id="gf-zero"></div><details class="gd-claimed-panel" id="gf-claimed-panel"><summary>Claimed games <span id="gf-claimed-count">0</span></summary><div id="gf-claimed-list"></div></details>'+
        '</section>'+
      '</div>';

    var $ = function(s){ return body.querySelector(s); };

    function selectedStoreIds(prefix){
      return Array.prototype.slice.call(body.querySelectorAll('[data-'+prefix+'-store]:checked')).map(function(x){return x.getAttribute('data-'+prefix+'-store');});
    }
    function syncStorePicker(prefix){
      var selected=selectedStoreIds(prefix), all=$('#'+prefix+'-store-all'), summary=$('#'+prefix+'-store-summary');
      if(all) all.checked=selected.length===0;
      if(summary) summary.textContent=selected.length ? selected.length+' store'+(selected.length===1?'':'s')+' selected' : 'All stores';
    }
    function populateStorePicker(prefix){
      var options=$('#'+prefix+'-store-options'); if(!options)return;
      options.innerHTML='<label><input type="checkbox" id="'+prefix+'-store-all" checked> All stores</label>'+storeList.map(function(st){return '<label><input type="checkbox" data-'+prefix+'-store="'+esc(st.storeID)+'"> '+esc(st.storeName)+'</label>';}).join('');
      syncStorePicker(prefix);
    }
    function handleStorePicker(prefix){
      var wrap=$('#'+prefix+'-store-wrap');
      wrap.addEventListener('change',function(e){
        if(e.target.id===prefix+'-store-all' && e.target.checked){wrap.querySelectorAll('[data-'+prefix+'-store]').forEach(function(x){x.checked=false;});}
        else if(e.target.matches('[data-'+prefix+'-store]') && e.target.checked){$('#'+prefix+'-store-all').checked=false;}
        if(!selectedStoreIds(prefix).length) $('#'+prefix+'-store-all').checked=true;
        syncStorePicker(prefix);
        if(prefix==='gd'){syncResetButton();pageData=[];searchDeals(0);}else drawFree();
      });
    }
    handleStorePicker('gd'); handleStorePicker('gf');
    function filtersAreEdited(){
      return $('#gd-kind').value !== 'all' || $('#gd-sort').value !== 'Deal Rating' || $('#gd-max').value.trim() !== '' || $('#gd-sale').checked || selectedStoreIds('gd').length > 0;
    }
    function syncResetButton(){ var b=$('#gd-reset-filters'); if(b) b.hidden=!filtersAreEdited(); }
    $('#gd-reset-filters').addEventListener('click',function(){
      $('#gd-kind').value='all'; $('#gd-sort').value='Deal Rating'; $('#gd-max').value=''; $('#gd-sale').checked=false;
      body.querySelectorAll('[data-gd-store]').forEach(function(x){x.checked=false;});
      if($('#gd-store-all')) $('#gd-store-all').checked=true;
      syncStorePicker('gd'); syncResetButton(); pageData=[]; searchDeals(0);
    });

    /* ---- currency ---- */
    function rate(){ return fx && fx.rates[cur.code] ? fx.rates[cur.code] : 1; }
    function code(){ return fx && fx.rates[cur.code] ? cur.code : 'USD'; }
    function money(usd){ return fmtMoney(usd * rate(), code()); }
    function renderCurrency(){
      $('#gd-maxc').textContent = code();
      $('#gd-fx').textContent = fx
        ? (cur.code === 'USD' ? 'Prices shown in US dollars (' + cur.why + ')' : 'Prices converted from USD to ' + cur.code + ' (' + curName(cur.code) + ') — from ' + cur.why + (fx.stale ? ' · rates may be out of date' : '') + ' · rates ' + (fx.date || 'today') + '. Stores may charge differently in your region.')
        : 'Exchange rates unavailable — showing US dollars.';
    }
    picker = currencyPicker($('#gd-cur-w'), {value: cur.code, onChange: function(c){ cur = {code: c, why: 'your saved choice'}; setCurrency(c); renderCurrency(); redrawAll(); }});
    $('#gd-maxc').textContent = cur.code;
    function msg(text, retry){ return '<div class="empty-state" style="margin:14px 0">' + esc(text) + (retry ? ' <button class="game-btn secondary" data-retry="' + retry + '">Try again</button>' : '') + '</div>'; }
    function noMatch(q){ var isDlc=$('#gd-kind').value==='dlc', steam='https://store.steampowered.com/search/?term='+encodeURIComponent(q||'')+(isDlc?'&category1=21':''); return '<div class="gd-no-match"><h4>No live price matches found</h4><p>CheapShark returned no offers for <strong>“'+esc(q|| (isDlc?'DLC and add-ons':'these filters'))+'”</strong>. This does not mean the item is unavailable; CheapShark only indexes participating stores.</p><div class="gd-no-match-actions"><a class="game-btn secondary" target="_blank" rel="noopener" href="'+steam+'">Search Steam Store'+(isDlc?' for DLC':'')+' ↗</a><button type="button" class="game-btn secondary" data-clear-deal-search>Clear filters</button></div><small>Steam opens a separate store search. Its results are not live price data from this comparison.</small></div>'; }
    /* CheapShark does not expose a reliable game-vs-DLC field on every deal. Label by title
       heuristics and make that limitation explicit rather than claiming authoritative metadata. */
    function dealKind(d){ var title=String(d.title||''); return /\b(dlc|expansion|season pass|soundtrack|ost|upgrade|content pack|cosmetic pack|character pack|map pack|add[- ]on|story pack|bonus pack|supporter pack|starter pack)\b/i.test(title) ? 'dlc' : 'game'; }
    function kindBadge(d){ var k=dealKind(d); return '<span class="gd-kind-badge '+k+'" title="Inferred from the listing title; store metadata may differ">'+(k==='dlc'?'DLC / ADD-ON':'GAME')+'</span>'; }
    if(location.protocol==='file:'){
      $('#gd-local-warning').hidden=false;
      $('#gd-local-warning').innerHTML='<strong>Opened as a local file.</strong> Live deals and exchange rates can fail from <code>file://</code> because browsers restrict cross-origin requests. Test the live finder at <a href="https://velocitysystems.pages.dev/tools/game-deals.html" target="_blank" rel="noopener">velocitysystems.pages.dev</a>, or run <code>python -m http.server</code> in the project folder and open <code>http://localhost:8000/tools/game-deals.html</code>.';
    }

    /* ---- shared pager ---- */
    function pagerHtml(page, hasNext, total, id){
      var pages = total ? Math.max(1, total) : null;
      return '<div class="gd-pager" data-pager="' + id + '"><button type="button" class="game-btn secondary" data-p="first"' + (page === 0 ? ' disabled' : '') + '>« First</button>'+
        '<button type="button" class="game-btn secondary" data-p="prev"' + (page === 0 ? ' disabled' : '') + '>‹ Previous</button>'+
        '<span class="gd-pg">Page <b>' + (page + 1) + '</b>' + (pages ? ' of ' + pages : '') + '</span>'+
        '<button type="button" class="game-btn secondary" data-p="next"' + (hasNext ? '' : ' disabled') + '>Next ›</button></div>';
    }

    /* ---- Deals tab ---- */
    var dealsPage = 0, dealsTotal = null, pageData = [], dealsHeading = '', dealsLoading = false, lastQ = '';
    function storeName(id){ return (stores && stores[id]) || 'Store ' + id; }
    function shopLinks(q){
      var enc = encodeURIComponent(q || '');
      var L = [['Steam', 'https://store.steampowered.com/search/?term=' + enc], ['Steam DLC', 'https://store.steampowered.com/search/?term=' + enc + '&category1=21'], ['GOG', 'https://www.gog.com/en/games?query=' + enc], ['Epic', 'https://store.epicgames.com/en-US/browse?q=' + enc],
        ['Instant Gaming', 'https://www.instant-gaming.com/en/search/?query=' + enc], ['Eneba', 'https://www.eneba.com/store/all?text=' + enc], ['Kinguin', 'https://www.kinguin.net/listing?active=1&phrase=' + enc],
        ['G2A', 'https://www.g2a.com/search?query=' + enc], ['Gamivo', 'https://www.gamivo.com/catalogsearch/result/?q=' + enc], ['CDKeys', 'https://www.cdkeys.com/catalogsearch/result/?q=' + enc]];
      $('#gd-links').innerHTML = q
        ? '<span class="field-label">Also search</span>' + L.map(function(l){ return '<a class="sec-chip" target="_blank" rel="noopener" href="' + l[1] + '">' + l[0] + ' ↗</a>'; }).join('') +
          '<span class="hint" style="width:100%;margin:6px 0 0">Steam, GOG and Epic are official stores. The others resell keys, so check seller ratings before buying.</span>'
        : '';
    }
    /* dealIDs from the API are already URL-encoded; encoding them again broke the redirect and sent people to the wrong (or no) game. */
    function dealHref(d){
      if(String(d.storeID) === '1' && d.steamAppID && d.steamAppID !== 'null' && d.steamAppID !== '0') return 'https://store.steampowered.com/app/' + encodeURIComponent(d.steamAppID) + '/';
      var id = String(d.dealID || ''); try { id = decodeURIComponent(id); } catch(e) {}
      return 'https://www.cheapshark.com/redirect?dealID=' + encodeURIComponent(id);
    }
    /* ---- price history (CheapShark /games?ids= returns cheapestPriceEver) + wishlist ---- */
    var hist = {}, wish = lsGet('vs-gd-wishlist', []);
    if(!Array.isArray(wish)) wish = [];
    function inWish(gid){ return wish.some(function(w){ return String(w.gameID) === String(gid); }); }
    function saveWish(){ lsSet('vs-gd-wishlist', wish.slice(0, 200)); $('#gd-wcount').textContent = wish.length ? '(' + wish.length + ')' : ''; }
    function fmtMonth(unix){ var d = new Date(Number(unix) * 1000); return isNaN(d) ? '' : d.toLocaleDateString(undefined, {month: 'short', year: 'numeric'}); }
    function loadHistory(list){
      var ids = []; list.forEach(function(d){ if(d.gameID && !hist[d.gameID] && ids.indexOf(d.gameID) < 0) ids.push(d.gameID); });
      if(!ids.length) return;
      fetchJson(CS + '/games?ids=' + ids.slice(0, 25).join(','), {ttl: 3600000}).then(function(o){
        Object.keys(o || {}).forEach(function(k){ var c = o[k] && o[k].cheapestPriceEver; if(c) hist[k] = {price: parseFloat(c.price), date: c.date}; });
        if(pageData.length) drawDeals();
        if(!$('#gd-free').hidden) drawFree();
      }).catch(function(){ /* badges are a bonus: the list works without them */ });
    }
    function histBits(gid, sale){
      var h = hist[gid]; if(!h || isNaN(h.price)) return {badge: '', sub: ''};
      if(sale <= h.price + 0.005) return {badge: '<span class="gd-badge low" title="The lowest price CheapShark has ever tracked for this game">' + icon('trendingDown', {size: 11}) + ' ALL-TIME LOW</span>', sub: ''};
      return {badge: '', sub: ' · Lowest ever ' + money(h.price) + (h.date ? ' (' + fmtMonth(h.date) + ')' : '')};
    }
    function heartBtn(gid, on){
      var label = on ? 'Remove from wishlist' : 'Add to wishlist';
      return '<button type="button" class="gd-heart' + (on ? ' on' : '') + '" data-wish="' + esc(gid) + '" aria-pressed="' + on + '" aria-label="' + label + '" title="' + label + '">' + icon('heart', {size: 18, fill: on ? 'currentColor' : 'none'}) + '</button>';
    }
    function dealRow(d, showClaim){
      var sale = parseFloat(d.salePrice), normal = parseFloat(d.normalPrice), save = Math.round(parseFloat(d.savings));
      var hb = histBits(d.gameID, sale), href = esc(dealHref(d));
      return '<div class="gd-deal" data-gid="' + esc(d.gameID) + '" data-title="' + esc(d.title) + '" data-thumb="' + esc(d.thumb || '') + '" data-steam="' + esc(d.steamAppID || '') + '">'+
        '<a class="gd-thumbwrap" tabindex="-1" aria-hidden="true" target="_blank" rel="noopener" href="' + href + '">' + (d.thumb ? '<img class="gd-thumb" src="' + esc(d.thumb) + '" alt="" loading="lazy">' : '<span class="gd-thumb"></span>') + '</a>'+
        '<div class="gd-main"><div class="gd-title-line"><a class="gd-title gd-open" target="_blank" rel="noopener" href="' + href + '">' + esc(d.title) + '</a>' + kindBadge(d) + hb.badge + '</div><div class="gd-sub"><span class="gd-store-name">' + esc(storeName(d.storeID)) + '</span>' + (showClaim && sale===0 ? ' <button type="button" class="gd-claim" data-claim="store-'+esc(d.gameID)+'" data-claim-title="'+esc(d.title)+'" data-claim-source="store" data-claim-detail="'+esc(storeName(d.storeID))+'">Mark claimed</button>' : '') +
          (d.steamRatingPercent && d.steamRatingPercent !== '0' ? ' · ' + esc(d.steamRatingPercent) + '% positive' : '') + (d.metacriticScore && d.metacriticScore !== '0' ? ' · Metacritic ' + esc(d.metacriticScore) : '') + hb.sub + '</div></div>'+
        '<div class="gd-was">' + (normal > sale ? money(normal) : '') + '</div>'+
        '<div class="gd-now' + (sale === 0 ? ' free' : '') + '">' + (sale === 0 ? 'FREE' : money(sale)) + '</div>'+
        '<div class="gd-off">' + (save > 0 ? '−' + save + '%' : '') + '</div>'+
        heartBtn(d.gameID, inWish(d.gameID)) + '</div>';
    }
    /* ---- Wishlist tab: current best price per saved game ---- */
    var wishData = null, wishBusy = false;
    function drawWish(){
      var box = $('#gw-list');
      if(!wish.length){ box.innerHTML = msg('Your wishlist is empty. Search for a game on the Deals tab and tap the heart to save it.'); return; }
      box.innerHTML = '<div class="gd-list">' + wish.map(function(w){
        var info = wishData && wishData[w.gameID], deals = info && info.deals || [];
        var best = deals.slice().sort(function(a, b){ return parseFloat(a.price) - parseFloat(b.price); })[0];
        var h = info && info.cheapestPriceEver, hp = h ? parseFloat(h.price) : NaN;
        var href = best ? esc(dealHref({storeID: best.storeID, dealID: best.dealID, steamAppID: info.info && info.info.steamAppID})) : (w.steamAppID ? 'https://store.steampowered.com/app/' + encodeURIComponent(w.steamAppID) + '/' : 'https://www.cheapshark.com/redirect?dealID=');
        var sale = best ? parseFloat(best.price) : NaN, normal = best ? parseFloat(best.retailPrice) : NaN, save = best ? Math.round(parseFloat(best.savings)) : 0;
        var low = best && !isNaN(hp) && sale <= hp + 0.005;
        var sub = wishBusy && !wishData ? 'Checking prices…' : !best ? 'No current price found' : esc(storeName(best.storeID)) + (!low && !isNaN(hp) ? ' · Lowest ever ' + money(hp) + (h.date ? ' (' + fmtMonth(h.date) + ')' : '') : '');
        return '<div class="gd-deal">'+
          '<a class="gd-thumbwrap" tabindex="-1" aria-hidden="true" target="_blank" rel="noopener" href="' + href + '">' + (w.thumb ? '<img class="gd-thumb" src="' + esc(w.thumb) + '" alt="" loading="lazy">' : '<span class="gd-thumb"></span>') + '</a>'+
          '<div class="gd-main"><a class="gd-title gd-open" target="_blank" rel="noopener" href="' + href + '">' + esc(w.title) + '</a>' + (low ? '<span class="gd-badge low">' + icon('trendingDown', {size: 11}) + ' ALL-TIME LOW</span>' : '') + '<div class="gd-sub">' + sub + '</div></div>'+
          '<div class="gd-was">' + (best && normal > sale ? money(normal) : '') + '</div>'+
          '<div class="gd-now' + (best && sale === 0 ? ' free' : '') + '">' + (best ? (sale === 0 ? 'FREE' : money(sale)) : '—') + '</div>'+
          '<div class="gd-off">' + (save > 0 ? '−' + save + '%' : '') + '</div>' + heartBtn(w.gameID, true) + '</div>';
      }).join('') + '</div>';
    }
    function loadWish(){
      drawWish(); if(!wish.length) return;
      wishBusy = true;
      fetchJson(CS + '/games?ids=' + wish.slice(0, 25).map(function(w){ return w.gameID; }).join(','), {ttl: 600000}).then(function(o){ wishData = o || {}; wishBusy = false; drawWish(); })
        .catch(function(){ wishBusy = false; if(!wishData) $('#gw-list').insertAdjacentHTML('afterbegin', msg('Couldn’t refresh prices from CheapShark. Your saved games are below.', 'wish')); });
    }
    function sortDeals(list, by){
      var n = function(x){ return parseFloat(x) || 0; };
      var fn = {'Price': function(a, b){ return n(a.salePrice) - n(b.salePrice); }, 'Savings': function(a, b){ return n(b.savings) - n(a.savings); },
        'Reviews': function(a, b){ return n(b.steamRatingPercent) - n(a.steamRatingPercent); }, 'Metacritic': function(a, b){ return n(b.metacriticScore) - n(a.metacriticScore); },
        'recent': function(a, b){ return n(b.lastChange) - n(a.lastChange); }, 'Title': function(a, b){ return a.title.localeCompare(b.title); }}[by];
      return fn ? list.slice().sort(fn) : list;
    }
    /* The list stays on screen while the next page loads, so nothing jumps or blanks. */
    function drawDeals(){
      var maxLocal = parseFloat($('#gd-max').value), list = pageData, kind=$('#gd-kind').value;
      if(kind!=='all') list = list.filter(function(d){ return dealKind(d)===kind; });
      if(!isNaN(maxLocal)) list = list.filter(function(d){ return parseFloat(d.salePrice) * rate() <= maxLocal; });
      list = sortDeals(list, $('#gd-sort').value);
      var pager = pagerHtml(dealsPage, pageData.length >= PAGE, dealsTotal, 'deals');
      $('#gd-pager-top').innerHTML = pager;
      $('#gd-results').innerHTML = '<h3 class="gd-h">' + esc(dealsHeading) + (dealsLoading ? ' · loading…' : '') + '</h3>' +
        (list.length ? '<div class="gd-list' + (dealsLoading ? ' busy' : '') + '">' + list.map(dealRow).join('') + '</div>' : ($('#gd-kind').value!=='all' ? noMatch($('#gd-q').value.trim()) : msg('Nothing matches. Try a shorter name, another store, or untick “On sale only”.'))) +
        pager;
    }
    function searchDeals(page){
      var q = $('#gd-q').value.trim();
      var requestId = ++dealsRequest;
      dealsPage = page || 0; lastQ = q; shopLinks(q);
      var sort = $('#gd-sort').value;
      var url = CS + '/deals?pageSize=' + PAGE + '&pageNumber=' + dealsPage + '&sortBy=' + encodeURIComponent(sort === 'recent' ? 'Recent' : sort);
      if(['Savings', 'Reviews', 'Metacritic'].indexOf(sort) > -1) url += '&desc=1';
      if(q) url += '&title=' + encodeURIComponent(q);
      var chosenStores=selectedStoreIds('gd');
      if(chosenStores.length) url += '&storeID=' + encodeURIComponent(chosenStores.join(','));
      if($('#gd-sale').checked || !q) url += '&onSale=1';
      var maxLocal = parseFloat($('#gd-max').value);
      if(!isNaN(maxLocal)) url += '&upperPrice=' + Math.ceil(maxLocal / rate());
      dealsLoading = true; dealsHeading = q ? 'Results for “' + q + '”' : 'Top deals right now';
      if(pageData.length) drawDeals(); else $('#gd-results').innerHTML = '<div class="empty-state" style="margin:14px 0">Searching stores…</div>';
      var ctl = typeof AbortController === 'function' ? new AbortController() : null;
      var timer = setTimeout(function(){ if(ctl) ctl.abort(); }, 12000);
      fetch(url, ctl ? {signal:ctl.signal} : undefined).then(function(r){
        clearTimeout(timer); if(!r.ok) throw new Error('HTTP '+r.status);
        var total = parseInt(r.headers.get('X-Total-Page-Count'),10); dealsTotal = isNaN(total)?null:total;
        return r.json();
      }).then(function(deals){
        if(requestId !== dealsRequest) return;
        if(!Array.isArray(deals)) throw new Error('Unexpected reply');
        if(!deals.length && (q || selectedStoreIds('gd').length || !isNaN(maxLocal))){
          /* CheapShark's sale-only and store/price filters can hide otherwise valid title matches.
             Retry the title without restrictive filters, then apply store/price locally. If the
             sale-only search was empty, deliberately drop onSale too (matching the older finder). */
          var fallback = CS + '/deals?pageSize=' + PAGE + '&pageNumber=' + dealsPage + '&sortBy=' + encodeURIComponent(sort === 'recent' ? 'Recent' : sort);
          if(['Savings','Reviews','Metacritic'].indexOf(sort)>-1) fallback += '&desc=1';
          if(q) fallback += '&title=' + encodeURIComponent(q);
          return fetchJson(fallback, {ttl:0, timeout:10000, stale:false}).then(function(retry){
            if(requestId !== dealsRequest) return;
            pageData = Array.isArray(retry) ? retry : [];
            var chosen=selectedStoreIds('gd'); if(chosen.length) pageData = pageData.filter(function(d){return chosen.indexOf(String(d.storeID))>-1;});
            if(!isNaN(maxLocal)) pageData = pageData.filter(function(d){return parseFloat(d.salePrice)*rate()<=maxLocal;});
            dealsLoading=false;
            if(!pageData.length && q){
              $('#gd-results').innerHTML = noMatch(q);
              return;
            }
            drawDeals(); loadHistory(pageData);
          });
        }
        pageData=deals; dealsLoading=false;
        if(!pageData.length && q){
          $('#gd-results').innerHTML = noMatch(q);
          return;
        }
        drawDeals(); loadHistory(deals);
      }).catch(function(){
        if(requestId !== dealsRequest) return;
        dealsLoading=false;
        $('#gd-results').innerHTML=msg(location.protocol==='file:' ? 'This page is opened with file://, so the browser may block the live API. Open the hosted Game Deals page or run a local HTTP server, then retry.' : 'CheapShark did not respond in time or could not be reached. The search has stopped; check your connection and try again.','deals');
      });
    }
    $('#gd-results').addEventListener('click', function(e){ if(e.target.closest('[data-clear-deal-search]')){ $('#gd-store-all').checked=true; body.querySelectorAll('[data-gd-store]').forEach(function(x){x.checked=false;}); syncStorePicker('gd'); $('#gd-max').value=''; $('#gd-sale').checked=false; $('#gd-kind').value='all'; $('#gd-sort').value='Deal Rating'; syncResetButton(); pageData=[]; searchDeals(0); } });
    $('#gd-go').addEventListener('click', function(){ pageData = []; searchDeals(0); });
    $('#gd-q').addEventListener('keydown', function(e){ if(e.key === 'Enter'){ pageData = []; searchDeals(0); } });
    ['#gd-sort', '#gd-sale', '#gd-kind'].forEach(function(s){ $(s).addEventListener('change', function(){ syncResetButton(); searchDeals(0); }); });
    $('#gd-max').addEventListener('input', function(){ syncResetButton(); if(pageData.length) drawDeals(); });
    $('#gd-max').addEventListener('change', function(){ syncResetButton(); searchDeals(0); });

    /* ---- Free stuff tab ---- */
    var claimed = lsGet('vs-gd-claimed', []), claimedMeta = lsGet('vs-gd-claimed-meta', []), giveaways = [], zero = [], gpage = 0;
    if(!Array.isArray(claimed)) claimed=[]; if(!Array.isArray(claimedMeta)) claimedMeta=[];
    function endsIn(s){
      if(!s || s === 'N/A') return '';
      var t = Date.parse(String(s).replace(' ', 'T') + 'Z'); if(isNaN(t)) return '';
      var ms = t - Date.now(); if(ms <= 0) return 'Ended';
      var d = Math.floor(ms / 86400000), h = Math.floor(ms % 86400000 / 3600000);
      return 'Ends in ' + (d ? d + 'd ' : '') + h + 'h';
    }
    function worthUsd(w){ var m = /([\d.,]+)/.exec(w || ''); return m ? parseFloat(m[1].replace(/,/g, '')) || 0 : 0; }
    function isGiveawayClaimed(g){return claimed.some(function(id){return String(id)===String(g.id);});}
    function isStoreClaimed(d){return claimed.indexOf('store-'+String(d.gameID))>-1;}
    function rememberClaim(id,title,source,detail){
      claimedMeta=claimedMeta.filter(function(m){return String(m.id)!==String(id);});
      claimedMeta.push({id:String(id),title:String(title||'Claimed game'),source:String(source||'giveaway'),detail:String(detail||'')});
      claimedMeta=claimedMeta.slice(-300);lsSet('vs-gd-claimed-meta',claimedMeta);
    }
    function giveawayCard(g){
      var isClaimed = isGiveawayClaimed(g), w = worthUsd(g.worth), end = endsIn(g.end_date);
      return '<div class="gd-card' + (isClaimed ? ' claimed' : '') + '">'+
        ((g.thumbnail || g.image) ? '<img class="gd-cimg" src="' + esc(g.thumbnail || g.image) + '" alt="" loading="lazy">' : '')+
        '<div class="gd-cbody"><div class="gd-badges"><span class="pass">' + esc((g.type || 'game').toUpperCase()) + '</span>' + (end ? '<span class="gd-end">' + esc(end) + '</span>' : '') + '</div>'+
          '<div class="gd-title">' + esc(g.title) + '</div>'+
          '<div class="gd-sub">' + esc(String(g.platforms || '').split(',').slice(0, 3).join(' · ')) + (g.users ? ' · ' + Number(g.users).toLocaleString() + ' claimed' : '') + '</div>'+
          (w ? '<div class="gd-worth"><s>' + money(w) + '</s> now free</div>' : '')+
          '<div class="tool-row" style="margin:10px 0 0"><a class="game-btn" target="_blank" rel="noopener" href="' + esc(g.open_giveaway_url || g.gamerpower_url || '#') + '">Get it ↗</a>'+
          '<button type="button" class="game-btn secondary" data-claim="' + esc(g.id) + '" data-claim-title="'+esc(g.title)+'" data-claim-source="giveaway" data-claim-detail="'+esc(String(g.platforms||'Platform not listed'))+'">' + (isClaimed ? '✓ Claimed' : 'Mark claimed') + '</button></div></div></div>';
    }
    function selectedPlatforms(){ return Array.prototype.slice.call(body.querySelectorAll('[data-gf-platform]:checked')).map(function(x){return x.getAttribute('data-gf-platform');}); }
    function syncPlatformPicker(){
      var selected=selectedPlatforms(), all=$('#gf-plat-all');
      all.checked=selected.length===0;
      $('#gf-plat-summary').textContent=selected.length?selected.length+' platform'+(selected.length===1?'':'s')+' selected':'All platforms';
    }
    $('#gf-plat-wrap').addEventListener('change',function(e){
      if(e.target.id==='gf-plat-all' && e.target.checked){body.querySelectorAll('[data-gf-platform]').forEach(function(x){x.checked=false;});}
      else if(e.target.matches('[data-gf-platform]') && e.target.checked){$('#gf-plat-all').checked=false;}
      syncPlatformPicker();loadFree();
    });
    $('#gf-plat-search').addEventListener('input',function(){
      var q=this.value.trim().toLowerCase();
      body.querySelectorAll('#gf-plat-wrap [data-platform-label]').forEach(function(label){label.hidden=!!q && label.getAttribute('data-platform-label').indexOf(q)<0;});
    });
    function platformMatches(g){
      var selected=selectedPlatforms(); if(!selected.length)return true;
      var text=String(g.platforms||'').toLowerCase();
      return selected.some(function(key){var p=PLATFORMS.filter(function(x){return x[0]===key;})[0];return text.indexOf(key.toLowerCase())>-1 || (p && text.indexOf(p[1].toLowerCase())>-1);});
    }
    function drawFree(){
      var q = $('#gf-q').value.trim().toLowerCase(), hide = $('#gf-hide').checked;
      var list = giveaways.filter(function(g){ return platformMatches(g) && (!q || (g.title + ' ' + g.platforms + ' ' + (g.description || '')).toLowerCase().indexOf(q) > -1) && (hide || !isGiveawayClaimed(g)); });
      var total = giveaways.reduce(function(s, g){ return s + worthUsd(g.worth); }, 0);
      var claimedGiveaways=giveaways.filter(isGiveawayClaimed), claimedStore=zero.filter(isStoreClaimed);
      $('#gf-stats').innerHTML = giveaways.length ? '<span><b>' + list.length + '</b> active shown</span><span><b>' + money(total) + '</b> total value</span><span><b>' + (claimedGiveaways.length+claimedStore.length) + '</b> claimed by you</span>' + (q ? '<span><b>' + list.length + '</b> match</span>' : '') : '';
      var pages = Math.max(1, Math.ceil(list.length / GPAGE)); gpage = Math.min(gpage, pages - 1);
      var slice = list.slice(gpage * GPAGE, gpage * GPAGE + GPAGE);
      $('#gf-list').innerHTML = slice.length ? '<div class="gd-grid">' + slice.map(giveawayCard).join('') + '</div>' : msg(giveaways.length ? 'Nothing matches that search.' : 'No active giveaways match those filters right now.');
      $('#gf-pager').innerHTML = list.length > GPAGE ? pagerHtml(gpage, gpage < pages - 1, pages, 'gf') : '';
      var chosenFreeStores=selectedStoreIds('gf');
      var z = sortDeals(zero, 'Title').filter(function(d){ return !isStoreClaimed(d) && (!chosenFreeStores.length || chosenFreeStores.indexOf(String(d.storeID))>-1) && (!q || d.title.toLowerCase().indexOf(q) > -1); });
      $('#gf-zero').innerHTML = z.length ? '<div class="gd-list">' + z.map(function(d){return dealRow(d,true);}).join('') + '</div>' : msg(zero.length ? 'No unclaimed store freebies match those filters.' : 'Nothing is priced at zero on the tracked stores at the moment.');
      claimedGiveaways.forEach(function(g){if(!claimedMeta.some(function(m){return String(m.id)===String(g.id);}))rememberClaim(g.id,g.title,'giveaway',String(g.platforms||'Platform not listed'));});
      claimedStore.forEach(function(d){var id='store-'+d.gameID;if(!claimedMeta.some(function(m){return String(m.id)===id;}))rememberClaim(id,d.title,'store',storeName(d.storeID));});
      var claimedHtml=claimedMeta.filter(function(m){return claimed.some(function(id){return String(id)===String(m.id);});}).slice().reverse().map(function(m){return '<div class="gd-claimed-row"><span>'+esc(m.title)+'</span><small>'+esc(m.source==='store'?'Official store · '+m.detail:'Giveaway · '+m.detail)+'</small><button type="button" class="game-btn secondary" data-claim="'+esc(m.id)+'">Unmark claimed</button></div>';});
      $('#gf-claimed-count').textContent=claimedHtml.length;
      $('#gf-claimed-list').innerHTML=claimedHtml.length?claimedHtml.join(''):'<p class="hint">Games you mark as claimed will appear here, saved in this browser.</p>';
    }
    function loadFree(){
      freeLoaded = true; gpage = 0;
      if(!giveaways.length) $('#gf-list').innerHTML = '<div class="empty-state" style="margin:14px 0">Loading giveaways…</div>';
      if(!zero.length) $('#gf-zero').innerHTML = '<div class="empty-state" style="margin:14px 0">Loading store freebies…</div>';
      var url = GP + '/giveaways?sort-by=' + encodeURIComponent($('#gf-sort').value);
      if($('#gf-type').value) url += '&type=' + encodeURIComponent($('#gf-type').value);
      var a = fetchJson(url, {ttl: 300000}).then(function(d){ giveaways = Array.isArray(d) ? d : []; return true; }).catch(function(){ giveaways = []; return false; });
      var b = fetchJson(CS + '/deals?upperPrice=0&pageSize=40&sortBy=recent', {ttl: 300000}).then(function(d){ zero = Array.isArray(d) ? d : []; loadHistory(zero); return true; }).catch(function(){ zero = []; return false; });
      Promise.all([a, b]).then(function(ok){
        drawFree();
        if(!ok[0]) $('#gf-list').innerHTML = msg('Couldn’t reach GamerPower. Try again in a moment.', 'free');
        if(!ok[1]) $('#gf-zero').innerHTML = msg('Couldn’t reach CheapShark. Try again in a moment.', 'free');
      });
    }
    ['#gf-type', '#gf-sort'].forEach(function(s){ $(s).addEventListener('change', loadFree); });
    $('#gf-refresh').addEventListener('click', loadFree);
    $('#gf-q').addEventListener('input', function(){ gpage = 0; drawFree(); });
    $('#gf-hide').addEventListener('change', function(){ gpage = 0; drawFree(); });

    /* ---- clicks: pager, claim, retry ---- */
    body.addEventListener('click', function(e){
      var pg = e.target.closest('[data-p]');
      if(pg){
        var id = pg.closest('[data-pager]').getAttribute('data-pager'), a = pg.getAttribute('data-p');
        if(id === 'deals'){ var np = a === 'first' ? 0 : a === 'prev' ? dealsPage - 1 : dealsPage + 1; searchDeals(Math.max(0, np)); $('#gd-results').scrollIntoView({block: 'start'}); }
        else { gpage = Math.max(0, a === 'first' ? 0 : a === 'prev' ? gpage - 1 : gpage + 1); drawFree(); $('#gf-list').scrollIntoView({block: 'start'}); }
        return;
      }
      var hw = e.target.closest('[data-wish]');
      if(hw){
        var gid = hw.getAttribute('data-wish'), row = hw.closest('.gd-deal'), idx = -1;
        wish.forEach(function(w, i){ if(String(w.gameID) === gid) idx = i; });
        if(idx > -1) wish.splice(idx, 1);
        else if(row && row.getAttribute('data-title')) wish.unshift({gameID: gid, title: row.getAttribute('data-title'), thumb: row.getAttribute('data-thumb'), steamAppID: row.getAttribute('data-steam')});
        saveWish();
        if(!$('#gd-wish').hidden) drawWish(); else { if(pageData.length) drawDeals(); if(giveaways.length || zero.length) drawFree(); }
        return;
      }
      var c = e.target.closest('[data-claim]');
      if(c){
        var rawId = c.getAttribute('data-claim'), i = claimed.findIndex(function(id){return String(id)===String(rawId);});
        if(i > -1){claimed.splice(i,1);claimedMeta=claimedMeta.filter(function(m){return String(m.id)!==String(rawId);});lsSet('vs-gd-claimed-meta',claimedMeta);}
        else {claimed.push(/^store-/.test(rawId) ? rawId : (/^\d+$/.test(rawId) ? Number(rawId) : rawId));rememberClaim(rawId,c.getAttribute('data-claim-title')||((c.closest('.gd-card')&&c.closest('.gd-card').querySelector('.gd-title')||{}).textContent)||'Claimed game',c.getAttribute('data-claim-source')||(/^store-/.test(rawId)?'store':'giveaway'),c.getAttribute('data-claim-detail')||'');}
        lsSet('vs-gd-claimed', claimed.slice(-300)); drawFree(); return;
      }
      var r = e.target.getAttribute && e.target.getAttribute('data-retry');
      if(r === 'deals') searchDeals(dealsPage); else if(r === 'free') loadFree(); else if(r === 'wish') loadWish();
    });

    /* ---- tabs, images, startup ---- */
    function showTab(){
      var t = $('#gd-tab').value;
      $('#gd-deals').hidden = t !== 'deals'; $('#gd-free').hidden = t !== 'free'; $('#gd-wish').hidden = t !== 'wish';
      Array.prototype.forEach.call(body.querySelectorAll('#gd-seg button'), function(b){ b.classList.toggle('on', b.getAttribute('data-t') === t); });
      if(t === 'free' && !freeLoaded) loadFree();
      if(t === 'wish') loadWish();
    }
    $('#gd-seg').addEventListener('click', function(e){
      var b = e.target.closest('[data-t]'); if(!b) return;
      $('#gd-tab').value = b.getAttribute('data-t'); $('#gd-tab').dispatchEvent(new Event('change', {bubbles: true}));
    });
    $('#gd-tab').addEventListener('change', showTab);
    body.addEventListener('error', function(e){ if(e.target.tagName === 'IMG') e.target.style.visibility = 'hidden'; }, true);
    function redrawAll(){ if(pageData.length) drawDeals(); if(giveaways.length || zero.length) drawFree(); if(!$('#gd-wish').hidden) drawWish(); }

    fxLoad().then(function(c){ fx = c; picker.setRates(c.rates); renderCurrency(); redrawAll(); }).catch(function(){ fx = null; renderCurrency(); });
    renderCurrency(); saveWish(); syncResetButton();
    fetchJson(CS + '/stores', {ttl: 86400000}).then(function(list){
      stores = {}; storeList = [];
      list.forEach(function(st){ if(String(st.isActive) === '1'){ stores[st.storeID] = st.storeName; storeList.push({storeID:String(st.storeID),storeName:st.storeName}); } });
      storeList.sort(function(a,b){return a.storeName.localeCompare(b.storeName);});
      populateStorePicker('gd'); populateStorePicker('gf');
      if(pageData.length) drawDeals(); if(giveaways.length || zero.length) drawFree();
    }).catch(function(){});
    setTimeout(function(){ showTab(); searchDeals(0); }, 30);
  });
}
PLAYABLES['game-deals'] = mountGameDeals;

/* ==================================================================
   tools / gradient-generator
   ================================================================== */
/* ---------------- Gradient Generator ---------------- */
function mountGradientGenerator(container){
  mountEmbed(container, 'TOOL / CSS GRADIENT', function(body){
    body.innerHTML =
      '<div class="tl-split"><div class="tl-main"><div id="grad-preview" class="grad-preview"></div></div>'+
      '<div class="tl-side"><h3 class="tl-h">'+icon('palette',{size:14})+' Colours</h3><div class="tool-row grad-controls">'+
        '<input type="color" id="grad-c1" value="#3b82f6" aria-label="First colour"><input type="color" id="grad-c2" value="#9b7bff" aria-label="Second colour">'+
        '<label class="grad-angle">Angle <input type="range" id="grad-angle" min="0" max="360" value="135"></label>'+
      '</div>'+
      '<div class="tool-output" id="grad-out" style="cursor:pointer"></div></div></div>';
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
PLAYABLES['gradient-generator'] = mountGradientGenerator;

/* ==================================================================
   tools / hash-generator
   ================================================================== */
// Uses the browser's Web Crypto API. The text you type is never saved or sent anywhere.

function mountHashGenerator(container){
  mountEmbed(container, 'TOOL / HASH GENERATOR', function(body){
    var ALGS = ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'];
    body.innerHTML =
      '<div class="field"><label for="hg-in">Text to hash</label><textarea id="hg-in" data-nopersist spellcheck="false" style="min-height:120px" placeholder="Type or paste text"></textarea></div>'+
      '<label style="display:block;margin:10px 0"><input type="checkbox" id="hg-upper"> Uppercase hex</label>'+
      '<div class="result-card" id="hg-out"></div>';
    var $ = function(s){ return body.querySelector(s); };
    function hex(buf){ return Array.prototype.map.call(new Uint8Array(buf), function(b){ return b.toString(16).padStart(2, '0'); }).join(''); }
    var run = 0;
    function update(){
      var id = ++run, text = $('#hg-in').value;
      if(!(window.crypto && crypto.subtle)){ $('#hg-out').innerHTML = '<div class="err-text">Hashing needs a secure page (https:// or localhost).</div>'; return; }
      var data = new TextEncoder().encode(text);
      Promise.all(ALGS.map(function(a){ return crypto.subtle.digest(a, data).then(hex); })).then(function(hs){
        if(id !== run) return;
        var up = $('#hg-upper').checked;
        $('#hg-out').innerHTML = '<dl class="kv">'+ALGS.map(function(a, i){
          var h = up ? hs[i].toUpperCase() : hs[i];
          return '<dt>'+a+'</dt><dd>'+h+' <button type="button" class="hist-clear" data-copy="'+h+'">Copy</button></dd>';
        }).join('')+'</dl>';
      });
    }
    body.addEventListener('input', update); body.addEventListener('change', update);
    body.addEventListener('click', function(e){ var b = e.target.closest('[data-copy]'); if(b) copyText(b.getAttribute('data-copy'), 'Hash'); });
    update();
  });
}
PLAYABLES['hash-generator'] = mountHashGenerator;

/* ==================================================================
   tools / image-converter
   ================================================================== */
// The Image Converter is the File Converter's image mode on its own page.
function mountImageConverter(container){ mountFileConverter(container, {mode: 'img', only: true, label: 'TOOL / IMAGE CONVERTER'}); }
PLAYABLES['image-converter'] = mountImageConverter;

/* ==================================================================
   tools / image-resizer
   ================================================================== */
/* ---------------- Image Resizer ---------------- */
function mountImageResizer(container){
  mountEmbed(container, 'TOOL / IMAGE RESIZER', function(body){
    body.innerHTML =
      '<input type="file" accept="image/*,.heic,.heif,.avif,.ico,.bmp,.tif,.tiff,.svg,.gif,.webp,.jfif" id="rz-file" class="tool-row">'+
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
PLAYABLES['image-resizer'] = mountImageResizer;

/* =====================================================================
   tools / bulk-image-compressor
   Compress many images at once in the browser (canvas re-encode to JPEG or WebP). Nothing is uploaded.
   ===================================================================== */
function mountBulkCompressor(container){
  mountEmbed(container, 'TOOL / BULK IMAGE COMPRESSOR', function(body){
    body.innerHTML =
      '<div class="tl-split"><div class="tl-main">'+
        '<label class="drop-zone" for="bc-file">'+icon('upload',{size:18})+' <span>Choose images, or drop them here</span></label>'+
        '<input type="file" id="bc-file" multiple accept="image/*" style="position:absolute;opacity:0;width:1px;height:1px">'+
        '<div id="bc-list" class="bc-list"></div></div>'+
      '<div class="tl-side"><h3 class="tl-h">'+icon('settings',{size:14})+' Settings</h3>'+
        '<div class="field"><label for="bc-format">Output format</label><select id="bc-format"><option value="image/jpeg">JPEG</option><option value="image/webp">WebP</option></select></div>'+
        '<div class="field"><label for="bc-q">Quality: <span id="bc-qv">75</span>%</label><input type="range" id="bc-q" min="30" max="95" value="75"></div>'+
        '<div class="field"><label for="bc-max">Longest side (px, 0 = keep size)</label><input type="number" id="bc-max" min="0" max="12000" value="2000"></div>'+
        '<div class="tool-row tl-btns"><button class="game-btn" id="bc-run" disabled>'+icon('zap',{size:14})+' Compress</button><button class="game-btn secondary" id="bc-clear" disabled>Clear</button><button class="game-btn secondary" id="bc-zip" disabled>Download all as ZIP</button></div>'+
        '<div class="tool-msg" id="bc-msg">Add some images to begin.</div></div></div>';
    var files = [], results = [];
    var list = body.querySelector('#bc-list'), msg = body.querySelector('#bc-msg');
    function draw(){
      list.innerHTML = files.map(function(f, i){
        var r = results[i];
        return '<div class="bc-row"><span class="bc-name">'+esc(f.name)+'</span><span class="bc-size">'+fmtBytes(f.size)+
          (r ? ' → <b>'+fmtBytes(r.blob.size)+'</b> <i>'+(r.blob.size < f.size ? '−'+Math.round(100-r.blob.size/f.size*100)+'%' : 'no gain')+'</i>' : '')+'</span>'+
          (r ? '<a class="game-btn secondary" download="'+esc(r.name)+'" href="'+r.url+'">Save</a>' : '')+'</div>';
      }).join('');
      body.querySelector('#bc-run').disabled = !files.length; body.querySelector('#bc-clear').disabled = !files.length; body.querySelector('#bc-zip').disabled = !results.some(Boolean);
    }
    function add(fl){
      Array.prototype.forEach.call(fl, function(f){ if(/^image\//.test(f.type)) files.push(f); });
      results = []; msg.textContent = files.length + ' image' + (files.length === 1 ? '' : 's') + ' ready.'; draw();
    }
    body.querySelector('#bc-file').addEventListener('change', function(e){ add(e.target.files); this.value = ''; });
    var dz = body.querySelector('.drop-zone');
    ['dragover','dragenter'].forEach(function(ev){ dz.addEventListener(ev, function(e){ e.preventDefault(); dz.classList.add('over'); }); });
    ['dragleave','drop'].forEach(function(ev){ dz.addEventListener(ev, function(e){ e.preventDefault(); dz.classList.remove('over'); }); });
    dz.addEventListener('drop', function(e){ if(e.dataTransfer) add(e.dataTransfer.files); });
    body.querySelector('#bc-q').addEventListener('input', function(){ body.querySelector('#bc-qv').textContent = this.value; });
    body.querySelector('#bc-clear').addEventListener('click', function(){ results.forEach(function(r){ URL.revokeObjectURL(r.url); }); files = []; results = []; msg.textContent = 'Add some images to begin.'; draw(); });
    function one(f, fmt, q, max){
      return new Promise(function(res, rej){
        var url = URL.createObjectURL(f), im = new Image();
        im.onerror = function(){ URL.revokeObjectURL(url); rej(new Error('Could not read ' + f.name)); };
        im.onload = function(){
          var w = im.naturalWidth, h = im.naturalHeight, k = max > 0 ? Math.min(1, max / Math.max(w, h)) : 1;
          var c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k));
          var x = c.getContext('2d'); if(fmt === 'image/jpeg'){ x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); }
          x.drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
          c.toBlob(function(b){ if(!b) return rej(new Error('Your browser cannot encode ' + fmt)); res({blob:b, url:URL.createObjectURL(b), name:f.name.replace(/\.[^.]+$/, '') + '-compressed.' + (fmt === 'image/webp' ? 'webp' : 'jpg')}); }, fmt, q);
        };
        im.src = url;
      });
    }
    body.querySelector('#bc-zip').addEventListener('click', async function(){
      var packed = [];
      for(var i=0;i<results.length;i++){
        if(!results[i]) continue;
        packed.push({name:results[i].name, data:new Uint8Array(await results[i].blob.arrayBuffer())});
      }
      if(!packed.length){ msg.textContent='Compress at least one image first.'; return; }
      try { saveBlob('compressed-images.zip', makeZip(packed), 'application/zip'); msg.textContent='ZIP created with '+packed.length+' image(s).'; }
      catch(e){ msg.textContent='Could not create the ZIP in this browser.'; }
    });
    body.querySelector('#bc-run').addEventListener('click', function(){
      var fmt = body.querySelector('#bc-format').value, q = parseInt(body.querySelector('#bc-q').value, 10) / 100, max = parseInt(body.querySelector('#bc-max').value, 10) || 0;
      msg.textContent = 'Compressing…'; results = [];
      var chain = Promise.resolve(), failed = 0;
      files.forEach(function(f, i){ chain = chain.then(function(){ return one(f, fmt, q, max).then(function(r){ results[i] = r; }).catch(function(){ failed++; }); }).then(function(){ draw(); }); });
      chain.then(function(){
        var before = 0, after = 0; results.forEach(function(r, i){ if(r){ before += files[i].size; after += r.blob.size; } });
        msg.textContent = before ? 'Saved ' + fmtBytes(Math.max(0, before - after)) + ' in total (' + fmtBytes(before) + ' → ' + fmtBytes(after) + ').' + (failed ? ' ' + failed + ' file(s) could not be read.' : '') : 'None of those files could be read as images.';
      });
    });
  });
}
PLAYABLES['bulk-image-compressor'] = mountBulkCompressor;


/* ==================================================================
   tools / json-csv
   ================================================================== */
function mountJsonCsv(container){
  mountEmbed(container, 'TOOL / JSON ⇄ CSV', function(body){
    body.innerHTML =
      '<div class="tool-row"><span class="seg" id="jc-seg"><button type="button" data-m="j2c" class="on">JSON → CSV</button><button type="button" data-m="c2j">CSV → JSON</button></span>'+
        '<select id="jc-mode" style="display:none"><option value="j2c">j2c</option><option value="c2j">c2j</option></select>'+
        '<select id="jc-delim" class="cat-sort-select" style="width:auto"><option value=",">Comma</option><option value=";">Semicolon</option><option value="&#9;">Tab</option></select></div>'+
      '<div class="tool-grid two"><div class="field"><label for="jc-in">Input</label><textarea id="jc-in" spellcheck="false" placeholder=\'[{"name":"Ada","age":36}]\'></textarea></div>'+
        '<div class="field"><label for="jc-out">Output</label><textarea id="jc-out" readonly spellcheck="false"></textarea></div></div>'+
      '<div class="err-text" id="jc-err" role="alert"></div>'+
      '<div class="tool-row"><button class="game-btn secondary" id="jc-copy" disabled>Copy output</button><button class="game-btn secondary" id="jc-dl" disabled>Download</button></div>';
    var $ = function(s){ return body.querySelector(s); };

    function parseCsv(text, d){
      text = text.replace(/^\uFEFF/, '');
      var rows = [], row = [], cur = '', q = false;
      for(var i = 0; i < text.length; i++){
        var c = text[i];
        if(q){
          if(c === '"'){ if(text[i+1] === '"'){ cur += '"'; i++; } else q = false; } else cur += c;
        } else if(c === '"'){ q = true; }
        else if(c === d){ row.push(cur); cur = ''; }
        else if(c === '\n' || c === '\r'){ if(c === '\r' && text[i+1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
        else cur += c;
      }
      if(q) throw new Error('CSV contains an unclosed quoted field. Check the quotation marks.');
      if(cur !== '' || row.length){ row.push(cur); rows.push(row); }
      return rows.filter(function(r){ return !(r.length === 1 && r[0] === ''); });
    }
    function cell(v, d){
      if(v === null || v === undefined) return '';
      var s = typeof v === 'object' ? JSON.stringify(v) : String(v);
      return (s.indexOf(d) > -1 || /["\n\r]/.test(s)) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }
    function convert(){
      var err = $('#jc-err'), d = $('#jc-delim').value, src = $('#jc-in').value;
      err.textContent = '';
      if(!src.trim()){ $('#jc-out').value = ''; $('#jc-copy').disabled=true; $('#jc-dl').disabled=true; return; }
      try {
        if($('#jc-mode').value === 'j2c'){
          var data = JSON.parse(src);
          if(!Array.isArray(data)) data = [data];
          var keys = [];
          data.forEach(function(o){ if(o && typeof o === 'object') Object.keys(o).forEach(function(k){ if(keys.indexOf(k) < 0) keys.push(k); }); });
          if(!keys.length) throw new Error('Expected an array of objects.');
          $('#jc-out').value = [keys.map(function(k){ return cell(k, d); }).join(d)].concat(data.map(function(o){
            return keys.map(function(k){ return cell(o ? o[k] : '', d); }).join(d);
          })).join('\n');
        } else {
          var rows = parseCsv(src, d);
          if(rows.length < 1) throw new Error('No rows found.');
          var head = rows[0];
          $('#jc-out').value = JSON.stringify(rows.slice(1).map(function(r){
            var o = {}; head.forEach(function(h, i){
              var v = r[i] === undefined ? '' : r[i];
              o[h] = v !== '' && !isNaN(Number(v)) && /^-?\d+(\.\d+)?$/.test(v) ? Number(v) : v;
            }); return o;
          }), null, 2);
        }
        $('#jc-copy').disabled=!$('#jc-out').value; $('#jc-dl').disabled=!$('#jc-out').value;
      } catch(e){ err.textContent = e.message; $('#jc-out').value = ''; $('#jc-copy').disabled=true; $('#jc-dl').disabled=true; }
    }
    $('#jc-seg').addEventListener('click', function(e){
      var b = e.target.closest('[data-m]'); if(!b) return;
      $('#jc-mode').value = b.getAttribute('data-m'); $('#jc-mode').dispatchEvent(new Event('change', {bubbles:true}));
    });
    function sync(){ Array.prototype.forEach.call(body.querySelectorAll('#jc-seg button'), function(b){ b.classList.toggle('on', b.getAttribute('data-m') === $('#jc-mode').value); }); }
    body.addEventListener('input', convert);
    body.addEventListener('change', function(){ sync(); convert(); });
    $('#jc-copy').addEventListener('click', function(){ if($('#jc-out').value) copyText($('#jc-out').value, 'Output'); });
    $('#jc-dl').addEventListener('click', function(){
      if(!$('#jc-out').value) return;
      var j = $('#jc-mode').value === 'c2j';
      downloadText(j ? 'data.json' : 'data.csv', $('#jc-out').value, j ? 'application/json' : 'text/csv');
    });
    sync(); convert();
  });
}
PLAYABLES['json-csv'] = mountJsonCsv;

/* ==================================================================
   tools / json-explorer
   ================================================================== */
/* ---------------- JSON Explorer (tree view) ---------------- */
function mountJsonExplorer(container){
  mountEmbed(container, 'TOOL / JSON EXPLORER', function(body){
    body.innerHTML =
      '<div class="tl-split"><div class="tl-main"><textarea class="tool-textarea" id="jx-in">{"name":"Velocity Systems","tools":["Snake","Wordle","Tetris"],"stats":{"games":10,"tools":22}}</textarea>'+
      '<div class="tool-row tl-btns" style="justify-content:flex-start"><button class="game-btn" id="jx-parse">'+icon('play',{size:14})+' Parse</button></div></div>'+
      '<div class="tl-side"><h3 class="tl-h">'+icon('code',{size:14})+' Tree</h3><div class="tool-output jx-tree" id="jx-tree" style="font-family:monospace;margin-top:0"></div></div></div>';
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
PLAYABLES['json-explorer'] = mountJsonExplorer;

/* ==================================================================
   tools / json-formatter
   ================================================================== */
/* JSON Formatter (tool) */
function mountJsonFormatter(container){
  mountEmbed(container, 'TOOL / JSON FORMATTER', function(body){
    body.innerHTML =
      '<div class="tl-split"><div class="tl-main"><textarea class="tool-textarea" id="json-in" spellcheck="false" placeholder=\'Paste JSON here, e.g. {"a":1,"b":[1,2,3]}\'></textarea></div>'+
      '<div class="tl-side"><h3 class="tl-h">'+icon('code',{size:14})+' Actions</h3><div class="tool-row tl-btns" style="margin-top:0"><button class="game-btn" id="json-format">Format</button><button class="game-btn secondary" id="json-minify">Minify</button></div>'+
      '<div class="tool-msg" id="json-msg"></div>'+
      '<div class="tool-output" id="json-out" style="display:none"></div></div></div>';
    var input = body.querySelector('#json-in');
    var msg = body.querySelector('#json-msg');
    var out = body.querySelector('#json-out');
    function parseOrFail(){
      try {
        var val = JSON.parse(input.value);
        msg.className = 'tool-msg ok'; msg.textContent = 'Valid JSON';
        return val;
      } catch(e){
        msg.className = 'tool-msg err'; msg.textContent = 'Invalid JSON — ' + e.message;
        out.style.display = 'none';
        return undefined;
      }
    }
    body.querySelector('#json-format').addEventListener('click', function(){
      var val = parseOrFail();
      if(val === undefined) return;
      var pretty = JSON.stringify(val, null, 2);
      out.style.display = 'block'; out.textContent = pretty;
      input.value = pretty;
    });
    body.querySelector('#json-minify').addEventListener('click', function(){
      var val = parseOrFail();
      if(val === undefined) return;
      var min = JSON.stringify(val);
      out.style.display = 'block'; out.textContent = min;
      input.value = min;
    });
  });
}
PLAYABLES['json-formatter'] = mountJsonFormatter;

/* ==================================================================
   tools / line-tools
   ================================================================== */
function mountLineTools(container){
  mountEmbed(container, 'TOOL / LINE TOOLS', function(body){
    var ACTIONS = {
      'Sort A–Z':    function(a){ return a.slice().sort(function(x, y){ return x.localeCompare(y, undefined, {numeric:true, sensitivity:'base'}); }); },
      'Sort Z–A':    function(a){ return a.slice().sort(function(x, y){ return y.localeCompare(x, undefined, {numeric:true, sensitivity:'base'}); }); },
      'By length':   function(a){ return a.slice().sort(function(x, y){ return x.length - y.length; }); },
      'Reverse':     function(a){ return a.slice().reverse(); },
      'Shuffle':     function(a){ a = a.slice(); for(var i = a.length - 1; i > 0; i--){ var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; },
      'Just clean':  function(a){ return a; },
    };
    body.innerHTML =
      '<div class="tool-row"><label><input type="checkbox" id="lt-trim" checked> Trim each line</label><label><input type="checkbox" id="lt-blank" checked> Remove blank lines</label>'+
        '<label><input type="checkbox" id="lt-dupe"> Remove duplicates</label><label><input type="checkbox" id="lt-case"> Ignore case when comparing</label></div>'+
      '<div class="tool-grid two"><div class="field"><label for="lt-in">Input (one item per line)</label><textarea id="lt-in" spellcheck="false"></textarea></div>'+
      '<div class="field"><label for="lt-out">Output</label><textarea id="lt-out" readonly spellcheck="false"></textarea></div></div>'+
      '<div class="tool-row">'+Object.keys(ACTIONS).map(function(k){ return '<button type="button" class="game-btn secondary" data-a="'+k+'">'+k+'</button>'; }).join('')+
        '<button class="game-btn" id="lt-copy">Copy output</button></div><p class="hint" id="lt-stat"></p>';
    var $ = function(s){ return body.querySelector(s); };
    body.addEventListener('click', function(e){
      var b = e.target.closest('[data-a]'); if(!b) return;
      var lines = $('#lt-in').value.split(/\r?\n/), before = lines.length;
      if($('#lt-trim').checked) lines = lines.map(function(l){ return l.trim(); });
      if($('#lt-blank').checked) lines = lines.filter(function(l){ return l !== ''; });
      if($('#lt-dupe').checked){
        var seen = {}, ic = $('#lt-case').checked;
        lines = lines.filter(function(l){ var k = ic ? l.toLowerCase() : l; if(seen[k]) return false; seen[k] = 1; return true; });
      }
      lines = ACTIONS[b.getAttribute('data-a')](lines);
      $('#lt-out').value = lines.join('\n');
      $('#lt-stat').textContent = before + ' lines in → ' + lines.length + ' lines out';
    });
    $('#lt-copy').addEventListener('click', function(){ if($('#lt-out').value) copyText($('#lt-out').value, 'Output'); });
  });
}
PLAYABLES['line-tools'] = mountLineTools;

/* ==================================================================
   tools / lorem-ipsum
   ================================================================== */
function mountLorem(container){
  mountEmbed(container, 'TOOL / LOREM IPSUM', function(body){
    var W = ('lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in reprehenderit voluptate velit esse cillum fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id est laborum').split(' ');
    body.innerHTML =
      '<div class="tool-row"><div class="field" style="width:130px"><label for="li-type">Generate</label><select id="li-type"><option value="p">Paragraphs</option><option value="s">Sentences</option><option value="w">Words</option></select></div>'+
        '<div class="field" style="width:110px"><label for="li-n">Amount</label><input id="li-n" type="number" min="1" max="200" value="3"></div>'+
        '<label><input type="checkbox" id="li-classic" checked> Start with “Lorem ipsum…”</label><button class="game-btn" id="li-go">Generate</button><button class="game-btn secondary" id="li-copy">Copy</button></div>'+
      '<textarea class="tool-textarea" id="li-out" readonly style="min-height:240px" aria-label="Generated text"></textarea>';
    var $ = function(s){ return body.querySelector(s); };
    function rw(){ return W[Math.floor(Math.random() * W.length)]; }
    function sentence(){
      var n = 6 + Math.floor(Math.random() * 10), a = [];
      for(var i = 0; i < n; i++) a.push(rw());
      var s = a.join(' ');
      if(n > 9){ var at = 3 + Math.floor(Math.random() * (n - 6)); a[at] += ','; s = a.join(' '); }
      return s[0].toUpperCase() + s.slice(1) + '.';
    }
    function para(){ var n = 3 + Math.floor(Math.random() * 4), a = []; for(var i = 0; i < n; i++) a.push(sentence()); return a.join(' '); }
    function gen(){
      var n = Math.max(1, Math.min(200, parseInt($('#li-n').value, 10) || 1)), t = $('#li-type').value, out;
      if(t === 'w'){ var a = []; for(var i = 0; i < n; i++) a.push(rw()); out = a.join(' '); }
      else { var parts = []; for(var j = 0; j < n; j++) parts.push(t === 's' ? sentence() : para()); out = parts.join(t === 's' ? ' ' : '\n\n'); }
      if($('#li-classic').checked){
        var start = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit';
        out = t === 'w' ? start.toLowerCase().replace(',', '').split(' ').slice(0, n).concat(out.split(' ').slice(Math.min(n, 8))).slice(0, n).join(' ')
                        : start + '. ' + out.replace(/^[^.]*\.\s*/, '');
        if(t !== 'w' && !/[.!?]$/.test(out)) out += '.';
      }
      $('#li-out').value = out;
    }
    $('#li-go').addEventListener('click', gen);
    $('#li-copy').addEventListener('click', function(){ copyText($('#li-out').value, 'Text'); });
    gen();
  });
}
PLAYABLES['lorem-ipsum'] = mountLorem;

/* ==================================================================
   tools / markdown-preview
   ================================================================== */
// Small Markdown renderer. All text is HTML-escaped first, so raw HTML in the input is shown as text, never run.

function mountMarkdownPreview(container){
  mountEmbed(container, 'TOOL / MARKDOWN PREVIEW', function(body){
    var SAMPLE = '# Heading\n\nSome **bold**, some *italic*, and `inline code`.\n\n- A list item\n- Another one\n\n> A quote\n\n```\ncode block\n```\n\n[A link](https://example.com)';
    body.innerHTML =
      '<div class="md-split"><div class="field"><label for="md-in">Markdown</label><textarea id="md-in" spellcheck="false" style="min-height:300px">'+esc(SAMPLE)+'</textarea></div>'+
      '<div class="field"><span class="field-label">Preview</span><div class="md-out" id="md-out"></div></div></div>'+
      '<div class="tool-row" style="margin-top:12px"><button class="game-btn secondary" id="md-copy">Copy rendered HTML</button><button class="game-btn secondary" id="md-clear">Clear</button></div>';
    var $ = function(s){ return body.querySelector(s); };

    function inline(t){
      t = esc(t);
      var codes = [];
      t = t.replace(/`([^`]+)`/g, function(m, c){ codes.push(c); return '\u0000' + (codes.length - 1) + '\u0000'; });
      t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function(m, label, url){
        return /^(https?:|mailto:|\/|#|\.)/i.test(url.replace(/&amp;/g, '&')) ? '<a href="'+url+'" target="_blank" rel="noreferrer noopener">'+label+'</a>' : m;
      });
      t = t.replace(/\*\*([^*]+)\*\*|__([^_]+)__/g, function(m, a, b){ return '<strong>'+(a || b)+'</strong>'; });
      t = t.replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>').replace(/(^|[^\w_])_([^_\s][^_]*)_(?!\w)/g, '$1<em>$2</em>');
      t = t.replace(/~~([^~]+)~~/g, '<del>$1</del>');
      return t.replace(/\u0000(\d+)\u0000/g, function(m, i){ return '<code>'+codes[+i]+'</code>'; });
    }
    function render(md){
      var L = md.replace(/\r\n?/g, '\n').split('\n'), out = '', i = 0;
      while(i < L.length){
        var l = L[i], m;
        if(/^```/.test(l)){
          var code = []; i++;
          while(i < L.length && !/^```/.test(L[i])){ code.push(L[i]); i++; }
          i++; out += '<pre><code>'+esc(code.join('\n'))+'</code></pre>'; continue;
        }
        if(!l.trim()){ i++; continue; }
        if((m = /^(#{1,6})\s+(.*)$/.exec(l))){ out += '<h'+m[1].length+'>'+inline(m[2])+'</h'+m[1].length+'>'; i++; continue; }
        if(/^\s*([-*_])(\s*\1){2,}\s*$/.test(l)){ out += '<hr>'; i++; continue; }
        if(/^>\s?/.test(l)){
          var q = []; while(i < L.length && /^>\s?/.test(L[i])){ q.push(L[i].replace(/^>\s?/, '')); i++; }
          out += '<blockquote>'+inline(q.join(' '))+'</blockquote>'; continue;
        }
        if(/^\s*[-*+]\s+/.test(l)){
          var ul = []; while(i < L.length && /^\s*[-*+]\s+/.test(L[i])){ ul.push('<li>'+inline(L[i].replace(/^\s*[-*+]\s+/, ''))+'</li>'); i++; }
          out += '<ul>'+ul.join('')+'</ul>'; continue;
        }
        if(/^\s*\d+[.)]\s+/.test(l)){
          var ol = []; while(i < L.length && /^\s*\d+[.)]\s+/.test(L[i])){ ol.push('<li>'+inline(L[i].replace(/^\s*\d+[.)]\s+/, ''))+'</li>'); i++; }
          out += '<ol>'+ol.join('')+'</ol>'; continue;
        }
        var p = [];
        while(i < L.length && L[i].trim() && !/^(```|#{1,6}\s|>|\s*[-*+]\s|\s*\d+[.)]\s)/.test(L[i])){ p.push(L[i]); i++; }
        out += '<p>'+inline(p.join('\n')).replace(/\n/g, '<br>')+'</p>';
      }
      return out;
    }
    function update(){ $('#md-out').innerHTML = render($('#md-in').value); }
    $('#md-in').addEventListener('input', update);
    $('#md-copy').addEventListener('click', function(){ copyText($('#md-out').innerHTML, 'HTML'); });
    $('#md-clear').addEventListener('click', function(){ $('#md-in').value = ''; $('#md-in').dispatchEvent(new Event('input', {bubbles:true})); });
    update();
  });
}
PLAYABLES['markdown-preview'] = mountMarkdownPreview;

/* ==================================================================
   tools / notepad
   ================================================================== */
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
  }, {persist:false});
}
PLAYABLES['notepad'] = mountNotepad;

/* ==================================================================
   tools / palette-generator
   ================================================================== */
/* ---------------- Palette Generator ---------------- */
function mountPaletteGenerator(container){
  mountEmbed(container, 'TOOL / COLOR PALETTE', function(body){
    body.innerHTML =
      '<div class="tl-split pal-split"><div class="tl-main"><div id="pal-swatches" class="pal-swatches"></div></div>'+
      '<div class="tl-side"><h3 class="tl-h">'+icon('palette',{size:14})+' Palette</h3><div class="tool-row tl-btns"><button class="game-btn" id="pal-gen">'+icon('refresh',{size:14})+' Generate</button></div>'+
      '<div class="tool-output" id="pal-out"></div></div></div>';
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
      body.querySelector('#pal-swatches').innerHTML = colors.map(function(c){ return '<div class="pal-sw" style="background:'+c+'" data-c="'+c+'" title="'+c+'"></div>'; }).join('');
      Array.prototype.slice.call(body.querySelectorAll('[data-c]')).forEach(function(el){ el.addEventListener('click', function(){ navigator.clipboard.writeText(el.getAttribute('data-c')); }); });
      body.querySelector('#pal-out').textContent = colors.join('  ');
    }
    body.querySelector('#pal-gen').addEventListener('click', generate);
    generate();
  });
}
PLAYABLES['palette-generator'] = mountPaletteGenerator;

/* ==================================================================
   tools / password-generator
   ================================================================== */
/* ---------------- Password Generator ---------------- */
function mountPasswordGenerator(container){
  mountEmbed(container, 'TOOL / PASSWORD GENERATOR', function(body){
    body.innerHTML =
      '<div class="tl-split"><div class="tl-main"><div class="tool-output pw-out" id="pw-out" style="cursor:pointer">Click Generate</div>'+
      '<div class="tool-row tl-btns"><button class="game-btn" id="pw-gen">Generate</button><button class="game-btn secondary" id="pw-copy">Copy</button></div>'+
      '<div class="tool-msg" id="pw-strength"></div></div>'+
      '<div class="tl-side"><h3 class="tl-h">'+icon('settings',{size:14})+' Options</h3>'+
      '<div class="field"><label for="pw-len">Length: <span id="pw-len-val">20</span></label><input type="range" id="pw-len" min="6" max="64" value="20"></div>'+
      '<div class="opt-grid">'+
        '<label class="opt"><input type="checkbox" id="pw-upper" checked> Uppercase</label>'+
        '<label class="opt"><input type="checkbox" id="pw-lower" checked> Lowercase</label>'+
        '<label class="opt"><input type="checkbox" id="pw-num" checked> Numbers</label>'+
        '<label class="opt"><input type="checkbox" id="pw-sym" checked> Symbols</label>'+
      '</div></div></div>';
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
PLAYABLES['password-generator'] = mountPasswordGenerator;

/* ==================================================================
   tools / percentage-calculator
   ================================================================== */
function mountPercentCalc(container){
  mountEmbed(container, 'TOOL / PERCENTAGE CALCULATOR', function(body){
    var CARDS = [
      {id:'p1', title:'What is X% of Y?', a:'Percent (X)', b:'Of (Y)',
       run:function(a,b){ var r = a / 100 * b; return {main:fmtN(r), text:a+'% of '+b+' = '+fmtN(r)}; }},
      {id:'p2', title:'X is what % of Y?', a:'Value (X)', b:'Total (Y)',
       run:function(a,b){ if(b === 0) return null; var r = a / b * 100; return {main:fmtN(r)+'%', text:a+' is '+fmtN(r)+'% of '+b}; }},
      {id:'p3', title:'% change from X to Y', a:'From (X)', b:'To (Y)',
       run:function(a,b){ if(a === 0) return null; var r = (b - a) / Math.abs(a) * 100; return {main:(r > 0 ? '+' : '')+fmtN(r)+'%', text:a+' → '+b+' is '+(r > 0 ? '+' : '')+fmtN(r)+'%'}; }},
      {id:'p4', title:'Increase Y by X%', a:'Percent (X)', b:'Amount (Y)',
       run:function(a,b){ var r = b * (1 + a / 100); return {main:fmtN(r), text:b+' + '+a+'% = '+fmtN(r)}; }},
      {id:'p5', title:'Decrease Y by X%', a:'Percent (X)', b:'Amount (Y)',
       run:function(a,b){ var r = b * (1 - a / 100); return {main:fmtN(r), text:b+' − '+a+'% = '+fmtN(r)}; }},
      {id:'p6', title:'Y is X% of what?', a:'Percent (X)', b:'Value (Y)',
       run:function(a,b){ if(a === 0) return null; var r = b / (a / 100); return {main:fmtN(r), text:b+' is '+a+'% of '+fmtN(r)}; }},
    ];
    function fmtN(n){ return String(Math.round(n * 1e8) / 1e8); }
    body.innerHTML = '<div class="tool-grid">'+CARDS.map(function(c){
      return '<div class="result-card" style="margin:0"><div class="field-label" style="margin-bottom:10px">'+c.title+'</div>'+
        '<div class="tool-grid two" style="margin-bottom:10px"><div class="field"><label for="'+c.id+'a">'+c.a+'</label><input id="'+c.id+'a" inputmode="decimal" autocomplete="off"></div>'+
        '<div class="field"><label for="'+c.id+'b">'+c.b+'</label><input id="'+c.id+'b" inputmode="decimal" autocomplete="off"></div></div>'+
        '<div class="result-big" id="'+c.id+'r" style="font-size:26px">—</div></div>';
    }).join('')+'</div>';

    var hist = toolHistory('percentage-calculator', {same:function(a,b){ return a.text === b.text; }});
    function calc(c, save){
      var a = parseFloat(body.querySelector('#'+c.id+'a').value), b = parseFloat(body.querySelector('#'+c.id+'b').value);
      var out = body.querySelector('#'+c.id+'r');
      if(isNaN(a) || isNaN(b)){ out.textContent = '—'; return; }
      var r = c.run(a, b);
      if(!r){ out.textContent = 'n/a'; return; }
      out.textContent = r.main;
      if(save) hist.add({text:r.text, main:r.main});
    }
    CARDS.forEach(function(c){
      ['a','b'].forEach(function(k){
        var el = body.querySelector('#'+c.id+k);
        el.addEventListener('input', function(){ calc(c, false); });
        el.addEventListener('change', function(){ calc(c, true); });
      });
      calc(c, false);
    });
    hist.mount(body, {title:'History', format:function(e){ return {main:e.text}; }});
  });
}
PLAYABLES['percentage-calculator'] = mountPercentCalc;

/* ==================================================================
   tools / pomodoro
   ================================================================== */
/* ---------------- Pomodoro ---------------- */
function mountPomodoro(container){
  mountEmbed(container, 'TOOL / POMODORO', function(body){
    body.innerHTML =
      '<div class="tl-split"><div class="tl-main"><div class="tool-output big-readout" id="pom-display">25:00</div>'+
      '<div class="tool-msg tl-phase" id="pom-phase">Focus</div>'+
      '<div class="tool-row tl-btns" style="justify-content:center"><button class="game-btn" id="pom-toggle">Start</button><button class="game-btn secondary" id="pom-reset">Reset</button></div></div>'+
      '<div class="tl-side"><h3 class="tl-h">'+icon('settings',{size:14})+' Session lengths</h3><div class="tool-grid">'+
      '<div class="field"><label for="pom-focus">Focus (minutes)</label><input type="number" id="pom-focus" value="25" min="1" max="90"></div>'+
      '<div class="field"><label for="pom-break">Break (minutes)</label><input type="number" id="pom-break" value="5" min="1" max="30"></div></div></div></div>';
    var seconds=25*60, timer=null, running=false, phase='focus';
    function update(){
      var m=Math.floor(seconds/60), s=seconds%60;
      body.querySelector('#pom-display').textContent = m+':'+String(s).padStart(2,'0');
    }
    function lengthFor(ph){
      var el = body.querySelector(ph==='focus' ? '#pom-focus' : '#pom-break'), v = parseInt(el.value,10);
      return v>0 ? Math.min(v, ph==='focus' ? 90 : 30) : (ph==='focus' ? 25 : 5);
    }
    /* Changing a length while the timer is idle (or paused at the start of that phase) updates the clock straight away. */
    ['#pom-focus','#pom-break'].forEach(function(sel){
      body.querySelector(sel).addEventListener('input', function(){
        if(!running && (sel==='#pom-focus') === (phase==='focus')){ seconds = lengthFor(phase)*60; update(); }
      });
    });
    function tick(){
      seconds--;
      if(seconds<=0){
        phase = phase==='focus' ? 'break' : 'focus';
        seconds = lengthFor(phase)*60;
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
      seconds = lengthFor('focus')*60;
      body.querySelector('#pom-phase').textContent='Focus';
      body.querySelector('#pom-toggle').textContent='Start';
      update();
    });
    update();
  });
}
PLAYABLES['pomodoro'] = mountPomodoro;

/* ==================================================================
   tools / qr-generator
   ================================================================== */
/* ---------------- QR Code Generator ----------------
   QR encoding: "qrcode-generator" by Kazuhiko Arase (MIT licence), minified below.
   Everything else (styles, shapes, logo, SVG/PNG export) is this site's own code.
   "QR Code" is a registered trademark of DENSO WAVE INCORPORATED. */
var QR = (function(){ var module = {exports: {}}, exports = module.exports, define;
var qrcode=function(){var t=function(t,r){var e=t,n=g[r],o=null,i=0,a=null,u=[],f={},c=function(t,r){o=function(t){for(var r=new Array(t),e=0;e<t;e+=1){r[e]=new Array(t);for(var n=0;n<t;n+=1)r[e][n]=null}return r}(i=4*e+17),l(0,0),l(i-7,0),l(0,i-7),s(),h(),d(t,r),e>=7&&v(t),null==a&&(a=p(e,n,u)),w(a,r)},l=function(t,r){for(var e=-1;e<=7;e+=1)if(!(t+e<=-1||i<=t+e))for(var n=-1;n<=7;n+=1)r+n<=-1||i<=r+n||(o[t+e][r+n]=0<=e&&e<=6&&(0==n||6==n)||0<=n&&n<=6&&(0==e||6==e)||2<=e&&e<=4&&2<=n&&n<=4)},h=function(){for(var t=8;t<i-8;t+=1)null==o[t][6]&&(o[t][6]=t%2==0);for(var r=8;r<i-8;r+=1)null==o[6][r]&&(o[6][r]=r%2==0)},s=function(){for(var t=B.getPatternPosition(e),r=0;r<t.length;r+=1)for(var n=0;n<t.length;n+=1){var i=t[r],a=t[n];if(null==o[i][a])for(var u=-2;u<=2;u+=1)for(var f=-2;f<=2;f+=1)o[i+u][a+f]=-2==u||2==u||-2==f||2==f||0==u&&0==f}},v=function(t){for(var r=B.getBCHTypeNumber(e),n=0;n<18;n+=1){var a=!t&&1==(r>>n&1);o[Math.floor(n/3)][n%3+i-8-3]=a}for(n=0;n<18;n+=1){a=!t&&1==(r>>n&1);o[n%3+i-8-3][Math.floor(n/3)]=a}},d=function(t,r){for(var e=n<<3|r,a=B.getBCHTypeInfo(e),u=0;u<15;u+=1){var f=!t&&1==(a>>u&1);u<6?o[u][8]=f:u<8?o[u+1][8]=f:o[i-15+u][8]=f}for(u=0;u<15;u+=1){f=!t&&1==(a>>u&1);u<8?o[8][i-u-1]=f:u<9?o[8][15-u-1+1]=f:o[8][15-u-1]=f}o[i-8][8]=!t},w=function(t,r){for(var e=-1,n=i-1,a=7,u=0,f=B.getMaskFunction(r),c=i-1;c>0;c-=2)for(6==c&&(c-=1);;){for(var g=0;g<2;g+=1)if(null==o[n][c-g]){var l=!1;u<t.length&&(l=1==(t[u]>>>a&1)),f(n,c-g)&&(l=!l),o[n][c-g]=l,-1==(a-=1)&&(u+=1,a=7)}if((n+=e)<0||i<=n){n-=e,e=-e;break}}},p=function(t,r,e){for(var n=A.getRSBlocks(t,r),o=b(),i=0;i<e.length;i+=1){var a=e[i];o.put(a.getMode(),4),o.put(a.getLength(),B.getLengthInBits(a.getMode(),t)),a.write(o)}var u=0;for(i=0;i<n.length;i+=1)u+=n[i].dataCount;if(o.getLengthInBits()>8*u)throw"code length overflow. ("+o.getLengthInBits()+">"+8*u+")";for(o.getLengthInBits()+4<=8*u&&o.put(0,4);o.getLengthInBits()%8!=0;)o.putBit(!1);for(;!(o.getLengthInBits()>=8*u||(o.put(236,8),o.getLengthInBits()>=8*u));)o.put(17,8);return function(t,r){for(var e=0,n=0,o=0,i=new Array(r.length),a=new Array(r.length),u=0;u<r.length;u+=1){var f=r[u].dataCount,c=r[u].totalCount-f;n=Math.max(n,f),o=Math.max(o,c),i[u]=new Array(f);for(var g=0;g<i[u].length;g+=1)i[u][g]=255&t.getBuffer()[g+e];e+=f;var l=B.getErrorCorrectPolynomial(c),h=k(i[u],l.getLength()-1).mod(l);for(a[u]=new Array(l.getLength()-1),g=0;g<a[u].length;g+=1){var s=g+h.getLength()-a[u].length;a[u][g]=s>=0?h.getAt(s):0}}var v=0;for(g=0;g<r.length;g+=1)v+=r[g].totalCount;var d=new Array(v),w=0;for(g=0;g<n;g+=1)for(u=0;u<r.length;u+=1)g<i[u].length&&(d[w]=i[u][g],w+=1);for(g=0;g<o;g+=1)for(u=0;u<r.length;u+=1)g<a[u].length&&(d[w]=a[u][g],w+=1);return d}(o,n)};f.addData=function(t,r){var e=null;switch(r=r||"Byte"){case"Numeric":e=M(t);break;case"Alphanumeric":e=x(t);break;case"Byte":e=m(t);break;case"Kanji":e=L(t);break;default:throw"mode:"+r}u.push(e),a=null},f.isDark=function(t,r){if(t<0||i<=t||r<0||i<=r)throw t+","+r;return o[t][r]},f.getModuleCount=function(){return i},f.make=function(){if(e<1){for(var t=1;t<40;t++){for(var r=A.getRSBlocks(t,n),o=b(),i=0;i<u.length;i++){var a=u[i];o.put(a.getMode(),4),o.put(a.getLength(),B.getLengthInBits(a.getMode(),t)),a.write(o)}var g=0;for(i=0;i<r.length;i++)g+=r[i].dataCount;if(o.getLengthInBits()<=8*g)break}e=t}c(!1,function(){for(var t=0,r=0,e=0;e<8;e+=1){c(!0,e);var n=B.getLostPoint(f);(0==e||t>n)&&(t=n,r=e)}return r}())},f.createTableTag=function(t,r){t=t||2;var e="";e+='<table style="',e+=" border-width: 0px; border-style: none;",e+=" border-collapse: collapse;",e+=" padding: 0px; margin: "+(r=void 0===r?4*t:r)+"px;",e+='">',e+="<tbody>";for(var n=0;n<f.getModuleCount();n+=1){e+="<tr>";for(var o=0;o<f.getModuleCount();o+=1)e+='<td style="',e+=" border-width: 0px; border-style: none;",e+=" border-collapse: collapse;",e+=" padding: 0px; margin: 0px;",e+=" width: "+t+"px;",e+=" height: "+t+"px;",e+=" background-color: ",e+=f.isDark(n,o)?"#000000":"#ffffff",e+=";",e+='"/>';e+="</tr>"}return e+="</tbody>",e+="</table>"},f.createSvgTag=function(t,r,e,n){var o={};"object"==typeof arguments[0]&&(t=(o=arguments[0]).cellSize,r=o.margin,e=o.alt,n=o.title),t=t||2,r=void 0===r?4*t:r,(e="string"==typeof e?{text:e}:e||{}).text=e.text||null,e.id=e.text?e.id||"qrcode-description":null,(n="string"==typeof n?{text:n}:n||{}).text=n.text||null,n.id=n.text?n.id||"qrcode-title":null;var i,a,u,c,g=f.getModuleCount()*t+2*r,l="";for(c="l"+t+",0 0,"+t+" -"+t+",0 0,-"+t+"z ",l+='<svg version="1.1" xmlns="http://www.w3.org/2000/svg"',l+=o.scalable?"":' width="'+g+'px" height="'+g+'px"',l+=' viewBox="0 0 '+g+" "+g+'" ',l+=' preserveAspectRatio="xMinYMin meet"',l+=n.text||e.text?' role="img" aria-labelledby="'+y([n.id,e.id].join(" ").trim())+'"':"",l+=">",l+=n.text?'<title id="'+y(n.id)+'">'+y(n.text)+"</title>":"",l+=e.text?'<description id="'+y(e.id)+'">'+y(e.text)+"</description>":"",l+='<rect width="100%" height="100%" fill="white" cx="0" cy="0"/>',l+='<path d="',a=0;a<f.getModuleCount();a+=1)for(u=a*t+r,i=0;i<f.getModuleCount();i+=1)f.isDark(a,i)&&(l+="M"+(i*t+r)+","+u+c);return l+='" stroke="transparent" fill="black"/>',l+="</svg>"},f.createDataURL=function(t,r){t=t||2,r=void 0===r?4*t:r;var e=f.getModuleCount()*t+2*r,n=r,o=e-r;return I(e,e,function(r,e){if(n<=r&&r<o&&n<=e&&e<o){var i=Math.floor((r-n)/t),a=Math.floor((e-n)/t);return f.isDark(a,i)?0:1}return 1})},f.createImgTag=function(t,r,e){t=t||2,r=void 0===r?4*t:r;var n=f.getModuleCount()*t+2*r,o="";return o+="<img",o+=' src="',o+=f.createDataURL(t,r),o+='"',o+=' width="',o+=n,o+='"',o+=' height="',o+=n,o+='"',e&&(o+=' alt="',o+=y(e),o+='"'),o+="/>"};var y=function(t){for(var r="",e=0;e<t.length;e+=1){var n=t.charAt(e);switch(n){case"<":r+="&lt;";break;case">":r+="&gt;";break;case"&":r+="&amp;";break;case'"':r+="&quot;";break;default:r+=n}}return r};return f.createASCII=function(t,r){if((t=t||1)<2)return function(t){t=void 0===t?2:t;var r,e,n,o,i,a=1*f.getModuleCount()+2*t,u=t,c=a-t,g={"██":"█","█ ":"▀"," █":"▄","  ":" "},l={"██":"▀","█ ":"▀"," █":" ","  ":" "},h="";for(r=0;r<a;r+=2){for(n=Math.floor((r-u)/1),o=Math.floor((r+1-u)/1),e=0;e<a;e+=1)i="█",u<=e&&e<c&&u<=r&&r<c&&f.isDark(n,Math.floor((e-u)/1))&&(i=" "),u<=e&&e<c&&u<=r+1&&r+1<c&&f.isDark(o,Math.floor((e-u)/1))?i+=" ":i+="█",h+=t<1&&r+1>=c?l[i]:g[i];h+="\n"}return a%2&&t>0?h.substring(0,h.length-a-1)+Array(a+1).join("▀"):h.substring(0,h.length-1)}(r);t-=1,r=void 0===r?2*t:r;var e,n,o,i,a=f.getModuleCount()*t+2*r,u=r,c=a-r,g=Array(t+1).join("██"),l=Array(t+1).join("  "),h="",s="";for(e=0;e<a;e+=1){for(o=Math.floor((e-u)/t),s="",n=0;n<a;n+=1)i=1,u<=n&&n<c&&u<=e&&e<c&&f.isDark(o,Math.floor((n-u)/t))&&(i=0),s+=i?g:l;for(o=0;o<t;o+=1)h+=s+"\n"}return h.substring(0,h.length-1)},f.renderTo2dContext=function(t,r){r=r||2;for(var e=f.getModuleCount(),n=0;n<e;n++)for(var o=0;o<e;o++)t.fillStyle=f.isDark(n,o)?"black":"white",t.fillRect(o*r,n*r,r,r)},f};t.stringToBytes=(t.stringToBytesFuncs={default:function(t){for(var r=[],e=0;e<t.length;e+=1){var n=t.charCodeAt(e);r.push(255&n)}return r}}).default,t.createStringToBytes=function(t,r){var e=function(){for(var e=S(t),n=function(){var t=e.read();if(-1==t)throw"eof";return t},o=0,i={};;){var a=e.read();if(-1==a)break;var u=n(),f=n()<<8|n();i[String.fromCharCode(a<<8|u)]=f,o+=1}if(o!=r)throw o+" != "+r;return i}(),n="?".charCodeAt(0);return function(t){for(var r=[],o=0;o<t.length;o+=1){var i=t.charCodeAt(o);if(i<128)r.push(i);else{var a=e[t.charAt(o)];"number"==typeof a?(255&a)==a?r.push(a):(r.push(a>>>8),r.push(255&a)):r.push(n)}}return r}};var r,e,n,o,i,a=1,u=2,f=4,c=8,g={L:1,M:0,Q:3,H:2},l=0,h=1,s=2,v=3,d=4,w=5,p=6,y=7,B=(r=[[],[6,18],[6,22],[6,26],[6,30],[6,34],[6,22,38],[6,24,42],[6,26,46],[6,28,50],[6,30,54],[6,32,58],[6,34,62],[6,26,46,66],[6,26,48,70],[6,26,50,74],[6,30,54,78],[6,30,56,82],[6,30,58,86],[6,34,62,90],[6,28,50,72,94],[6,26,50,74,98],[6,30,54,78,102],[6,28,54,80,106],[6,32,58,84,110],[6,30,58,86,114],[6,34,62,90,118],[6,26,50,74,98,122],[6,30,54,78,102,126],[6,26,52,78,104,130],[6,30,56,82,108,134],[6,34,60,86,112,138],[6,30,58,86,114,142],[6,34,62,90,118,146],[6,30,54,78,102,126,150],[6,24,50,76,102,128,154],[6,28,54,80,106,132,158],[6,32,58,84,110,136,162],[6,26,54,82,110,138,166],[6,30,58,86,114,142,170]],e=1335,n=7973,i=function(t){for(var r=0;0!=t;)r+=1,t>>>=1;return r},(o={}).getBCHTypeInfo=function(t){for(var r=t<<10;i(r)-i(e)>=0;)r^=e<<i(r)-i(e);return 21522^(t<<10|r)},o.getBCHTypeNumber=function(t){for(var r=t<<12;i(r)-i(n)>=0;)r^=n<<i(r)-i(n);return t<<12|r},o.getPatternPosition=function(t){return r[t-1]},o.getMaskFunction=function(t){switch(t){case l:return function(t,r){return(t+r)%2==0};case h:return function(t,r){return t%2==0};case s:return function(t,r){return r%3==0};case v:return function(t,r){return(t+r)%3==0};case d:return function(t,r){return(Math.floor(t/2)+Math.floor(r/3))%2==0};case w:return function(t,r){return t*r%2+t*r%3==0};case p:return function(t,r){return(t*r%2+t*r%3)%2==0};case y:return function(t,r){return(t*r%3+(t+r)%2)%2==0};default:throw"bad maskPattern:"+t}},o.getErrorCorrectPolynomial=function(t){for(var r=k([1],0),e=0;e<t;e+=1)r=r.multiply(k([1,C.gexp(e)],0));return r},o.getLengthInBits=function(t,r){if(1<=r&&r<10)switch(t){case a:return 10;case u:return 9;case f:case c:return 8;default:throw"mode:"+t}else if(r<27)switch(t){case a:return 12;case u:return 11;case f:return 16;case c:return 10;default:throw"mode:"+t}else{if(!(r<41))throw"type:"+r;switch(t){case a:return 14;case u:return 13;case f:return 16;case c:return 12;default:throw"mode:"+t}}},o.getLostPoint=function(t){for(var r=t.getModuleCount(),e=0,n=0;n<r;n+=1)for(var o=0;o<r;o+=1){for(var i=0,a=t.isDark(n,o),u=-1;u<=1;u+=1)if(!(n+u<0||r<=n+u))for(var f=-1;f<=1;f+=1)o+f<0||r<=o+f||0==u&&0==f||a==t.isDark(n+u,o+f)&&(i+=1);i>5&&(e+=3+i-5)}for(n=0;n<r-1;n+=1)for(o=0;o<r-1;o+=1){var c=0;t.isDark(n,o)&&(c+=1),t.isDark(n+1,o)&&(c+=1),t.isDark(n,o+1)&&(c+=1),t.isDark(n+1,o+1)&&(c+=1),0!=c&&4!=c||(e+=3)}for(n=0;n<r;n+=1)for(o=0;o<r-6;o+=1)t.isDark(n,o)&&!t.isDark(n,o+1)&&t.isDark(n,o+2)&&t.isDark(n,o+3)&&t.isDark(n,o+4)&&!t.isDark(n,o+5)&&t.isDark(n,o+6)&&(e+=40);for(o=0;o<r;o+=1)for(n=0;n<r-6;n+=1)t.isDark(n,o)&&!t.isDark(n+1,o)&&t.isDark(n+2,o)&&t.isDark(n+3,o)&&t.isDark(n+4,o)&&!t.isDark(n+5,o)&&t.isDark(n+6,o)&&(e+=40);var g=0;for(o=0;o<r;o+=1)for(n=0;n<r;n+=1)t.isDark(n,o)&&(g+=1);return e+=Math.abs(100*g/r/r-50)/5*10},o),C=function(){for(var t=new Array(256),r=new Array(256),e=0;e<8;e+=1)t[e]=1<<e;for(e=8;e<256;e+=1)t[e]=t[e-4]^t[e-5]^t[e-6]^t[e-8];for(e=0;e<255;e+=1)r[t[e]]=e;var n={glog:function(t){if(t<1)throw"glog("+t+")";return r[t]},gexp:function(r){for(;r<0;)r+=255;for(;r>=256;)r-=255;return t[r]}};return n}();function k(t,r){if(void 0===t.length)throw t.length+"/"+r;var e=function(){for(var e=0;e<t.length&&0==t[e];)e+=1;for(var n=new Array(t.length-e+r),o=0;o<t.length-e;o+=1)n[o]=t[o+e];return n}(),n={getAt:function(t){return e[t]},getLength:function(){return e.length},multiply:function(t){for(var r=new Array(n.getLength()+t.getLength()-1),e=0;e<n.getLength();e+=1)for(var o=0;o<t.getLength();o+=1)r[e+o]^=C.gexp(C.glog(n.getAt(e))+C.glog(t.getAt(o)));return k(r,0)},mod:function(t){if(n.getLength()-t.getLength()<0)return n;for(var r=C.glog(n.getAt(0))-C.glog(t.getAt(0)),e=new Array(n.getLength()),o=0;o<n.getLength();o+=1)e[o]=n.getAt(o);for(o=0;o<t.getLength();o+=1)e[o]^=C.gexp(C.glog(t.getAt(o))+r);return k(e,0).mod(t)}};return n}var A=function(){var t=[[1,26,19],[1,26,16],[1,26,13],[1,26,9],[1,44,34],[1,44,28],[1,44,22],[1,44,16],[1,70,55],[1,70,44],[2,35,17],[2,35,13],[1,100,80],[2,50,32],[2,50,24],[4,25,9],[1,134,108],[2,67,43],[2,33,15,2,34,16],[2,33,11,2,34,12],[2,86,68],[4,43,27],[4,43,19],[4,43,15],[2,98,78],[4,49,31],[2,32,14,4,33,15],[4,39,13,1,40,14],[2,121,97],[2,60,38,2,61,39],[4,40,18,2,41,19],[4,40,14,2,41,15],[2,146,116],[3,58,36,2,59,37],[4,36,16,4,37,17],[4,36,12,4,37,13],[2,86,68,2,87,69],[4,69,43,1,70,44],[6,43,19,2,44,20],[6,43,15,2,44,16],[4,101,81],[1,80,50,4,81,51],[4,50,22,4,51,23],[3,36,12,8,37,13],[2,116,92,2,117,93],[6,58,36,2,59,37],[4,46,20,6,47,21],[7,42,14,4,43,15],[4,133,107],[8,59,37,1,60,38],[8,44,20,4,45,21],[12,33,11,4,34,12],[3,145,115,1,146,116],[4,64,40,5,65,41],[11,36,16,5,37,17],[11,36,12,5,37,13],[5,109,87,1,110,88],[5,65,41,5,66,42],[5,54,24,7,55,25],[11,36,12,7,37,13],[5,122,98,1,123,99],[7,73,45,3,74,46],[15,43,19,2,44,20],[3,45,15,13,46,16],[1,135,107,5,136,108],[10,74,46,1,75,47],[1,50,22,15,51,23],[2,42,14,17,43,15],[5,150,120,1,151,121],[9,69,43,4,70,44],[17,50,22,1,51,23],[2,42,14,19,43,15],[3,141,113,4,142,114],[3,70,44,11,71,45],[17,47,21,4,48,22],[9,39,13,16,40,14],[3,135,107,5,136,108],[3,67,41,13,68,42],[15,54,24,5,55,25],[15,43,15,10,44,16],[4,144,116,4,145,117],[17,68,42],[17,50,22,6,51,23],[19,46,16,6,47,17],[2,139,111,7,140,112],[17,74,46],[7,54,24,16,55,25],[34,37,13],[4,151,121,5,152,122],[4,75,47,14,76,48],[11,54,24,14,55,25],[16,45,15,14,46,16],[6,147,117,4,148,118],[6,73,45,14,74,46],[11,54,24,16,55,25],[30,46,16,2,47,17],[8,132,106,4,133,107],[8,75,47,13,76,48],[7,54,24,22,55,25],[22,45,15,13,46,16],[10,142,114,2,143,115],[19,74,46,4,75,47],[28,50,22,6,51,23],[33,46,16,4,47,17],[8,152,122,4,153,123],[22,73,45,3,74,46],[8,53,23,26,54,24],[12,45,15,28,46,16],[3,147,117,10,148,118],[3,73,45,23,74,46],[4,54,24,31,55,25],[11,45,15,31,46,16],[7,146,116,7,147,117],[21,73,45,7,74,46],[1,53,23,37,54,24],[19,45,15,26,46,16],[5,145,115,10,146,116],[19,75,47,10,76,48],[15,54,24,25,55,25],[23,45,15,25,46,16],[13,145,115,3,146,116],[2,74,46,29,75,47],[42,54,24,1,55,25],[23,45,15,28,46,16],[17,145,115],[10,74,46,23,75,47],[10,54,24,35,55,25],[19,45,15,35,46,16],[17,145,115,1,146,116],[14,74,46,21,75,47],[29,54,24,19,55,25],[11,45,15,46,46,16],[13,145,115,6,146,116],[14,74,46,23,75,47],[44,54,24,7,55,25],[59,46,16,1,47,17],[12,151,121,7,152,122],[12,75,47,26,76,48],[39,54,24,14,55,25],[22,45,15,41,46,16],[6,151,121,14,152,122],[6,75,47,34,76,48],[46,54,24,10,55,25],[2,45,15,64,46,16],[17,152,122,4,153,123],[29,74,46,14,75,47],[49,54,24,10,55,25],[24,45,15,46,46,16],[4,152,122,18,153,123],[13,74,46,32,75,47],[48,54,24,14,55,25],[42,45,15,32,46,16],[20,147,117,4,148,118],[40,75,47,7,76,48],[43,54,24,22,55,25],[10,45,15,67,46,16],[19,148,118,6,149,119],[18,75,47,31,76,48],[34,54,24,34,55,25],[20,45,15,61,46,16]],r=function(t,r){var e={};return e.totalCount=t,e.dataCount=r,e},e={};return e.getRSBlocks=function(e,n){var o=function(r,e){switch(e){case g.L:return t[4*(r-1)+0];case g.M:return t[4*(r-1)+1];case g.Q:return t[4*(r-1)+2];case g.H:return t[4*(r-1)+3];default:return}}(e,n);if(void 0===o)throw"bad rs block @ typeNumber:"+e+"/errorCorrectionLevel:"+n;for(var i=o.length/3,a=[],u=0;u<i;u+=1)for(var f=o[3*u+0],c=o[3*u+1],l=o[3*u+2],h=0;h<f;h+=1)a.push(r(c,l));return a},e}(),b=function(){var t=[],r=0,e={getBuffer:function(){return t},getAt:function(r){var e=Math.floor(r/8);return 1==(t[e]>>>7-r%8&1)},put:function(t,r){for(var n=0;n<r;n+=1)e.putBit(1==(t>>>r-n-1&1))},getLengthInBits:function(){return r},putBit:function(e){var n=Math.floor(r/8);t.length<=n&&t.push(0),e&&(t[n]|=128>>>r%8),r+=1}};return e},M=function(t){var r=a,e=t,n={getMode:function(){return r},getLength:function(t){return e.length},write:function(t){for(var r=e,n=0;n+2<r.length;)t.put(o(r.substring(n,n+3)),10),n+=3;n<r.length&&(r.length-n==1?t.put(o(r.substring(n,n+1)),4):r.length-n==2&&t.put(o(r.substring(n,n+2)),7))}},o=function(t){for(var r=0,e=0;e<t.length;e+=1)r=10*r+i(t.charAt(e));return r},i=function(t){if("0"<=t&&t<="9")return t.charCodeAt(0)-"0".charCodeAt(0);throw"illegal char :"+t};return n},x=function(t){var r=u,e=t,n={getMode:function(){return r},getLength:function(t){return e.length},write:function(t){for(var r=e,n=0;n+1<r.length;)t.put(45*o(r.charAt(n))+o(r.charAt(n+1)),11),n+=2;n<r.length&&t.put(o(r.charAt(n)),6)}},o=function(t){if("0"<=t&&t<="9")return t.charCodeAt(0)-"0".charCodeAt(0);if("A"<=t&&t<="Z")return t.charCodeAt(0)-"A".charCodeAt(0)+10;switch(t){case" ":return 36;case"$":return 37;case"%":return 38;case"*":return 39;case"+":return 40;case"-":return 41;case".":return 42;case"/":return 43;case":":return 44;default:throw"illegal char :"+t}};return n},m=function(r){var e=f,n=t.stringToBytes(r),o={getMode:function(){return e},getLength:function(t){return n.length},write:function(t){for(var r=0;r<n.length;r+=1)t.put(n[r],8)}};return o},L=function(r){var e=c,n=t.stringToBytesFuncs.SJIS;if(!n)throw"sjis not supported.";!function(){var t=n("友");if(2!=t.length||38726!=(t[0]<<8|t[1]))throw"sjis not supported."}();var o=n(r),i={getMode:function(){return e},getLength:function(t){return~~(o.length/2)},write:function(t){for(var r=o,e=0;e+1<r.length;){var n=(255&r[e])<<8|255&r[e+1];if(33088<=n&&n<=40956)n-=33088;else{if(!(57408<=n&&n<=60351))throw"illegal char at "+(e+1)+"/"+n;n-=49472}n=192*(n>>>8&255)+(255&n),t.put(n,13),e+=2}if(e<r.length)throw"illegal char at "+(e+1)}};return i},D=function(){var t=[],r={writeByte:function(r){t.push(255&r)},writeShort:function(t){r.writeByte(t),r.writeByte(t>>>8)},writeBytes:function(t,e,n){e=e||0,n=n||t.length;for(var o=0;o<n;o+=1)r.writeByte(t[o+e])},writeString:function(t){for(var e=0;e<t.length;e+=1)r.writeByte(t.charCodeAt(e))},toByteArray:function(){return t},toString:function(){var r="";r+="[";for(var e=0;e<t.length;e+=1)e>0&&(r+=","),r+=t[e];return r+="]"}};return r},S=function(t){var r=t,e=0,n=0,o=0,i={read:function(){for(;o<8;){if(e>=r.length){if(0==o)return-1;throw"unexpected end of file./"+o}var t=r.charAt(e);if(e+=1,"="==t)return o=0,-1;t.match(/^\s$/)||(n=n<<6|a(t.charCodeAt(0)),o+=6)}var i=n>>>o-8&255;return o-=8,i}},a=function(t){if(65<=t&&t<=90)return t-65;if(97<=t&&t<=122)return t-97+26;if(48<=t&&t<=57)return t-48+52;if(43==t)return 62;if(47==t)return 63;throw"c:"+t};return i},I=function(t,r,e){for(var n=function(t,r){var e=t,n=r,o=new Array(t*r),i={setPixel:function(t,r,n){o[r*e+t]=n},write:function(t){t.writeString("GIF87a"),t.writeShort(e),t.writeShort(n),t.writeByte(128),t.writeByte(0),t.writeByte(0),t.writeByte(0),t.writeByte(0),t.writeByte(0),t.writeByte(255),t.writeByte(255),t.writeByte(255),t.writeString(","),t.writeShort(0),t.writeShort(0),t.writeShort(e),t.writeShort(n),t.writeByte(0);var r=a(2);t.writeByte(2);for(var o=0;r.length-o>255;)t.writeByte(255),t.writeBytes(r,o,255),o+=255;t.writeByte(r.length-o),t.writeBytes(r,o,r.length-o),t.writeByte(0),t.writeString(";")}},a=function(t){for(var r=1<<t,e=1+(1<<t),n=t+1,i=u(),a=0;a<r;a+=1)i.add(String.fromCharCode(a));i.add(String.fromCharCode(r)),i.add(String.fromCharCode(e));var f,c,g,l=D(),h=(f=l,c=0,g=0,{write:function(t,r){if(t>>>r!=0)throw"length over";for(;c+r>=8;)f.writeByte(255&(t<<c|g)),r-=8-c,t>>>=8-c,g=0,c=0;g|=t<<c,c+=r},flush:function(){c>0&&f.writeByte(g)}});h.write(r,n);var s=0,v=String.fromCharCode(o[s]);for(s+=1;s<o.length;){var d=String.fromCharCode(o[s]);s+=1,i.contains(v+d)?v+=d:(h.write(i.indexOf(v),n),i.size()<4095&&(i.size()==1<<n&&(n+=1),i.add(v+d)),v=d)}return h.write(i.indexOf(v),n),h.write(e,n),h.flush(),l.toByteArray()},u=function(){var t={},r=0,e={add:function(n){if(e.contains(n))throw"dup key:"+n;t[n]=r,r+=1},size:function(){return r},indexOf:function(r){return t[r]},contains:function(r){return void 0!==t[r]}};return e};return i}(t,r),o=0;o<r;o+=1)for(var i=0;i<t;i+=1)n.setPixel(i,o,e(i,o));var a=D();n.write(a);for(var u=function(){var t=0,r=0,e=0,n="",o={},i=function(t){n+=String.fromCharCode(a(63&t))},a=function(t){if(t<0);else{if(t<26)return 65+t;if(t<52)return t-26+97;if(t<62)return t-52+48;if(62==t)return 43;if(63==t)return 47}throw"n:"+t};return o.writeByte=function(n){for(t=t<<8|255&n,r+=8,e+=1;r>=6;)i(t>>>r-6),r-=6},o.flush=function(){if(r>0&&(i(t<<6-r),t=0,r=0),e%3!=0)for(var o=3-e%3,a=0;a<o;a+=1)n+="="},o.toString=function(){return n},o}(),f=a.toByteArray(),c=0;c<f.length;c+=1)u.writeByte(f[c]);return u.flush(),"data:image/gif;base64,"+u};return t}();qrcode.stringToBytesFuncs["UTF-8"]=function(t){return function(t){for(var r=[],e=0;e<t.length;e++){var n=t.charCodeAt(e);n<128?r.push(n):n<2048?r.push(192|n>>6,128|63&n):n<55296||n>=57344?r.push(224|n>>12,128|n>>6&63,128|63&n):(e++,n=65536+((1023&n)<<10|1023&t.charCodeAt(e)),r.push(240|n>>18,128|n>>12&63,128|n>>6&63,128|63&n))}return r}(t)},function(t){"function"==typeof define&&define.amd?define([],t):"object"==typeof exports&&(module.exports=t())}(function(){return qrcode});
return module.exports; })();
QR.stringToBytes = QR.stringToBytesFuncs['UTF-8'] || QR.stringToBytes;

function mountQRGenerator(container){
  mountEmbed(container, 'TOOL / QR CODE GENERATOR', function(body){
    var TYPES = {text:'Text or link', wifi:'Wi-Fi network', email:'Email', sms:'SMS message', phone:'Phone number', vcard:'Contact card'};
    body.innerHTML =
      '<div class="qr-layout">'+
        '<div class="qr-form">'+
          '<div class="field"><label for="qr-type">What is it for?</label><select id="qr-type">'+Object.keys(TYPES).map(function(k){ return '<option value="'+k+'">'+TYPES[k]+'</option>'; }).join('')+'</select></div>'+
          '<div id="qr-fields"></div>'+
          '<div class="qr-opts">'+
            '<div class="tool-grid two"><div class="field"><label for="qr-fg">Colour</label><input id="qr-fg" type="color" class="big" value="#111111"></div>'+
              '<div class="field"><label for="qr-bg">Background</label><input id="qr-bg" type="color" class="big" value="#ffffff"></div></div>'+
            '<div class="tool-row"><label><input type="checkbox" id="qr-grad"> Gradient to</label><input id="qr-fg2" type="color" value="#3b82f6" style="width:56px;height:34px"><label><input type="checkbox" id="qr-trans"> Transparent background</label></div>'+
            '<div class="tool-grid two"><div class="field"><label for="qr-shape">Dots</label><select id="qr-shape"><option value="square">Square</option><option value="rounded">Rounded</option><option value="dots">Round dots</option><option value="diamond">Diamonds</option></select></div>'+
              '<div class="field"><label for="qr-eye">Corner markers</label><select id="qr-eye"><option value="square">Square</option><option value="rounded">Rounded</option></select></div>'+
              '<div class="field"><label for="qr-ecc">Error correction</label><select id="qr-ecc"><option value="L">Low (7%)</option><option value="M" selected>Medium (15%)</option><option value="Q">Quartile (25%)</option><option value="H">High (30%)</option></select></div>'+
              '<div class="field"><label for="qr-margin">Margin <span id="qr-mv">3</span></label><input id="qr-margin" type="range" min="0" max="10" value="3"></div></div>'+
            '<div class="field"><label for="qr-size">Download size <span id="qr-sv">768</span> px</label><input id="qr-size" type="range" min="256" max="2048" step="64" value="768"></div>'+
            '<div class="field"><span class="field-label">Logo in the centre (optional)</span><input type="file" id="qr-logo" accept="image/*,.svg,.avif,.ico,.bmp" data-nopersist></div>'+
            '<div class="tool-row" id="qr-logorow" hidden><div class="field" style="flex:1;min-width:180px"><label for="qr-logosz">Logo size <span id="qr-lv">22</span>%</label><input id="qr-logosz" type="range" min="10" max="30" value="22"></div><button class="game-btn secondary" id="qr-logoclear" type="button">Remove logo</button></div>'+
          '</div>'+
        '</div>'+
        '<div class="qr-out"><div class="qr-preview" id="qr-preview"><canvas id="qr-canvas" aria-label="QR code preview"></canvas></div>'+
          '<p class="err-text" id="qr-err" role="alert"></p><p class="hint" id="qr-info"></p>'+
          '<div class="tool-row" style="justify-content:center"><button class="game-btn" id="qr-png">Download PNG</button><button class="game-btn secondary" id="qr-svg">Download SVG</button><button class="game-btn secondary" id="qr-copy">Copy image</button></div></div>'+
      '</div>';
    var $ = function(s){ return body.querySelector(s); };
    var logo = null;

    var FORMS = {
      text: '<div class="field"><label for="qr-text">Text or web address</label><textarea id="qr-text" rows="4" placeholder="https://example.com">https://example.com</textarea></div>',
      wifi: '<div class="tool-grid two"><div class="field"><label for="qr-ssid">Network name</label><input id="qr-ssid" autocomplete="off"></div><div class="field"><label for="qr-wpass">Password</label><input id="qr-wpass" autocomplete="off" data-nopersist></div>'+
            '<div class="field"><label for="qr-wsec">Security</label><select id="qr-wsec"><option value="WPA">WPA / WPA2 / WPA3</option><option value="WEP">WEP</option><option value="nopass">None</option></select></div><div class="field"><span class="field-label">&nbsp;</span><label><input type="checkbox" id="qr-whid"> Hidden network</label></div></div>',
      email:'<div class="field"><label for="qr-eto">To</label><input id="qr-eto" type="email" placeholder="name@example.com"></div><div class="field"><label for="qr-esub">Subject</label><input id="qr-esub"></div><div class="field"><label for="qr-ebody">Message</label><textarea id="qr-ebody" rows="3"></textarea></div>',
      sms:  '<div class="field"><label for="qr-snum">Phone number</label><input id="qr-snum" inputmode="tel" placeholder="+61 400 000 000"></div><div class="field"><label for="qr-smsg">Message</label><textarea id="qr-smsg" rows="3"></textarea></div>',
      phone:'<div class="field"><label for="qr-pnum">Phone number</label><input id="qr-pnum" inputmode="tel" placeholder="+61 400 000 000"></div>',
      vcard:'<div class="tool-grid two"><div class="field"><label for="qr-vn">Full name</label><input id="qr-vn"></div><div class="field"><label for="qr-vo">Organisation</label><input id="qr-vo"></div>'+
            '<div class="field"><label for="qr-vp">Phone</label><input id="qr-vp" inputmode="tel"></div><div class="field"><label for="qr-ve">Email</label><input id="qr-ve" type="email"></div></div><div class="field"><label for="qr-vu">Website</label><input id="qr-vu"></div>',
    };
    function v(id){ var e = $('#'+id); return e ? e.value.trim() : ''; }
    function wifiEsc(s){ return s.replace(/([\\;,:"])/g, '\\$1'); }
    function payload(){
      switch($('#qr-type').value){
        case 'wifi': return v('qr-ssid') ? 'WIFI:T:'+($('#qr-wsec') ? $('#qr-wsec').value : 'WPA')+';S:'+wifiEsc(v('qr-ssid'))+';P:'+wifiEsc($('#qr-wpass').value)+';H:'+($('#qr-whid').checked ? 'true' : 'false')+';;' : '';
        case 'email': return v('qr-eto') ? 'mailto:'+v('qr-eto')+(v('qr-esub') || v('qr-ebody') ? '?subject='+encodeURIComponent(v('qr-esub'))+'&body='+encodeURIComponent($('#qr-ebody').value) : '') : '';
        case 'sms': return v('qr-snum') ? 'SMSTO:'+v('qr-snum').replace(/\s/g, '')+':'+$('#qr-smsg').value : '';
        case 'phone': return v('qr-pnum') ? 'tel:'+v('qr-pnum').replace(/\s/g, '') : '';
        case 'vcard': return v('qr-vn') ? 'BEGIN:VCARD\nVERSION:3.0\nFN:'+v('qr-vn')+(v('qr-vo') ? '\nORG:'+v('qr-vo') : '')+(v('qr-vp') ? '\nTEL:'+v('qr-vp') : '')+(v('qr-ve') ? '\nEMAIL:'+v('qr-ve') : '')+(v('qr-vu') ? '\nURL:'+v('qr-vu') : '')+'\nEND:VCARD' : '';
        default: var t = $('#qr-text'); return t ? t.value : '';
      }
    }

    /* ---- the matrix and the drawing, shared by canvas and SVG ---- */
    function matrix(text, ecc){
      var q = QR(0, ecc); q.addData(text, 'Byte'); q.make();
      var n = q.getModuleCount(), m = [];
      for(var r = 0; r < n; r++){ m.push([]); for(var c = 0; c < n; c++) m[r].push(q.isDark(r, c)); }
      return m;
    }
    function inEye(r, c, n){ return (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7); }
    function opts(){
      return {fg: $('#qr-fg').value, fg2: $('#qr-grad').checked ? $('#qr-fg2').value : null, bg: $('#qr-bg').value, trans: $('#qr-trans').checked,
        shape: $('#qr-shape').value, eye: $('#qr-eye').value, margin: +$('#qr-margin').value, logoPct: +$('#qr-logosz').value / 100};
    }
    /* Calls shape callbacks in module units so canvas and SVG can share the layout. */
    function layout(m, o, cb){
      var n = m.length;
      for(var r = 0; r < n; r++) for(var c = 0; c < n; c++){
        if(!m[r][c] || inEye(r, c, n)) continue;
        if(logo && centre(r, c, n, o)) continue;
        cb.module(c + o.margin, r + o.margin, o.shape);
      }
      [[0, 0], [n - 7, 0], [0, n - 7]].forEach(function(p){ cb.eye(p[0] + o.margin, p[1] + o.margin, o.eye); });
    }
    function centre(r, c, n, o){
      var half = n * o.logoPct * .5 + 1, mid = n / 2;
      return Math.abs(c + .5 - mid) < half && Math.abs(r + .5 - mid) < half;
    }
    function rr(x, y, w, h, r){ var p = new Path2D(); p.roundRect ? p.roundRect(x, y, w, h, r) : p.rect(x, y, w, h); return p; }

    function renderCanvas(cv, m, o, px){
      var n = m.length, total = n + o.margin * 2, s = px / total, c = cv.getContext('2d');
      cv.width = cv.height = px;
      if(!o.trans){ c.fillStyle = o.bg; c.fillRect(0, 0, px, px); } else c.clearRect(0, 0, px, px);
      var fill = o.fg; if(o.fg2){ var g = c.createLinearGradient(0, 0, px, px); g.addColorStop(0, o.fg); g.addColorStop(1, o.fg2); fill = g; }
      c.fillStyle = fill;
      layout(m, o, {
        module: function(x, y, shape){
          var X = x * s, Y = y * s;
          if(shape === 'dots'){ c.beginPath(); c.arc(X + s / 2, Y + s / 2, s * .44, 0, Math.PI * 2); c.fill(); }
          else if(shape === 'rounded'){ c.fill(rr(X + s * .04, Y + s * .04, s * .92, s * .92, s * .32)); }
          else if(shape === 'diamond'){ c.beginPath(); c.moveTo(X + s / 2, Y); c.lineTo(X + s, Y + s / 2); c.lineTo(X + s / 2, Y + s); c.lineTo(X, Y + s / 2); c.closePath(); c.fill(); }
          else c.fillRect(X, Y, s + .6, s + .6);
        },
        eye: function(x, y, style){
          var X = x * s, Y = y * s, S = 7 * s, rad = style === 'soft' ? s * 2.2 : style === 'rounded' ? s * 1.6 : 0;
          var ring = new Path2D(); ring.addPath(rr(X, Y, S, S, rad)); ring.addPath(rr(X + s, Y + s, S - 2 * s, S - 2 * s, Math.max(0, rad - s)));
          c.fill(ring, 'evenodd');
          c.fill(rr(X + 2 * s, Y + 2 * s, 3 * s, 3 * s, style === 'soft' ? s * 1.1 : style === 'rounded' ? s * .8 : 0));
        }
      });
      if(logo){
        var L = n * s * o.logoPct, ratio = logo.width / logo.height, w = ratio >= 1 ? L : L * ratio, h = ratio >= 1 ? L / ratio : L, pad = s * .6, cx = px / 2, cy = px / 2;
        c.fillStyle = o.trans ? '#ffffff' : o.bg; c.fill(rr(cx - L / 2 - pad, cy - L / 2 - pad, L + 2 * pad, L + 2 * pad, s));
        c.drawImage(logo, cx - w / 2, cy - h / 2, w, h);
      }
    }
    function renderSvg(m, o, px){
      var n = m.length, total = n + o.margin * 2, d = '', defs = '', fill = o.fg;
      if(o.fg2){ defs = '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="'+o.fg+'"/><stop offset="1" stop-color="'+o.fg2+'"/></linearGradient></defs>'; fill = 'url(#g)'; }
      function rrp(x, y, w, h, r){ r = Math.min(r, w / 2, h / 2); return 'M'+(x + r)+' '+y+'h'+(w - 2 * r)+'a'+r+' '+r+' 0 0 1 '+r+' '+r+'v'+(h - 2 * r)+'a'+r+' '+r+' 0 0 1 -'+r+' '+r+'h-'+(w - 2 * r)+'a'+r+' '+r+' 0 0 1 -'+r+' -'+r+'v-'+(h - 2 * r)+'a'+r+' '+r+' 0 0 1 '+r+' -'+r+'z'; }
      layout(m, o, {
        module: function(x, y, shape){
          if(shape === 'dots') d += 'M'+(x + .06)+' '+(y + .5)+'a.44 .44 0 1 0 .88 0a.44 .44 0 1 0 -.88 0z';
          else if(shape === 'rounded') d += rrp(x + .04, y + .04, .92, .92, .32);
          else if(shape === 'diamond') d += 'M'+(x + .5)+' '+y+'l.5 .5l-.5 .5l-.5 -.5z';
          else d += 'M'+x+' '+y+'h1v1h-1z';
        },
        eye: function(x, y, style){
          var rad = style === 'soft' ? 2.2 : style === 'rounded' ? 1.6 : 0;
          d += rrp(x, y, 7, 7, rad) + rrp(x + 1, y + 1, 5, 5, Math.max(0, rad - 1)) + rrp(x + 2, y + 2, 3, 3, style === 'soft' ? 1.1 : style === 'rounded' ? .8 : 0);
        }
      });
      var out = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+total+' '+total+'" width="'+px+'" height="'+px+'" shape-rendering="geometricPrecision">'+defs+
        (o.trans ? '' : '<rect width="'+total+'" height="'+total+'" fill="'+o.bg+'"/>')+'<path fill="'+fill+'" fill-rule="evenodd" d="'+d+'"/>';
      if(logo){
        var L = n * o.logoPct, ratio = logo.width / logo.height, w = ratio >= 1 ? L : L * ratio, h = ratio >= 1 ? L / ratio : L, pad = .6, cv = document.createElement('canvas');
        cv.width = logo.width; cv.height = logo.height; cv.getContext('2d').drawImage(logo, 0, 0);
        out += '<rect x="'+(total / 2 - L / 2 - pad)+'" y="'+(total / 2 - L / 2 - pad)+'" width="'+(L + 2 * pad)+'" height="'+(L + 2 * pad)+'" rx="1" fill="'+(o.trans ? '#ffffff' : o.bg)+'"/>'+
          '<image x="'+(total / 2 - w / 2)+'" y="'+(total / 2 - h / 2)+'" width="'+w+'" height="'+h+'" href="'+cv.toDataURL('image/png')+'"/>';
      }
      return out + '</svg>';
    }

    var cur = null;
    function update(){
      var text = payload(), err = $('#qr-err');
      err.textContent = '';
      $('#qr-mv').textContent = $('#qr-margin').value; $('#qr-sv').textContent = $('#qr-size').value; $('#qr-lv').textContent = $('#qr-logosz').value;
      $('#qr-logorow').hidden = !logo;
      var ecc = logo ? 'H' : $('#qr-ecc').value;
      if(!text){ cur = null; var cv0 = $('#qr-canvas'); cv0.width = cv0.height = 8; cv0.getContext('2d').clearRect(0, 0, 8, 8); $('#qr-info').textContent = 'Fill in the details to see your code.'; return; }
      try { cur = {m: matrix(text, ecc), o: opts()}; }
      catch(e){ cur = null; err.textContent = 'That’s too much for one QR code. Shorten it or lower the error correction.'; return; }
      var prev = $('#qr-canvas'), px = Math.min(520, Math.max(240, ($('#qr-preview').clientWidth || 360) - 24)) * Math.min(window.devicePixelRatio || 1, 2);
      renderCanvas(prev, cur.m, cur.o, Math.round(px)); prev.style.width = Math.round(px / Math.min(window.devicePixelRatio || 1, 2)) + 'px';
      var contrast = lumRatio(cur.o.fg, cur.o.trans ? '#ffffff' : cur.o.bg);
      $('#qr-info').textContent = cur.m.length + ' × ' + cur.m.length + ' modules · error correction ' + ecc + (logo ? ' (forced by the logo)' : '') + (contrast < 3 ? ' · ⚠ low contrast, it may not scan' : '');
    }
    function lumRatio(a, b){
      function L(h){ var c = [1, 3, 5].map(function(i){ var x = parseInt(h.substr(i, 2), 16) / 255; return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); }); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; }
      var x = L(a), y = L(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
    }
    function setType(){ $('#qr-fields').innerHTML = FORMS[$('#qr-type').value]; enhanceFileInputs($('#qr-fields')); update(); }

    $('#qr-type').addEventListener('change', setType);
    body.addEventListener('input', update); body.addEventListener('change', update);
    $('#qr-logo').addEventListener('change', function(){
      var f = this.files && this.files[0]; if(!f){ return; }
      var url = URL.createObjectURL(f), im = new Image();
      im.onload = function(){ logo = im; update(); };
      im.onerror = function(){ notify('That image couldn’t be read', 'err'); URL.revokeObjectURL(url); };
      im.src = url;
    });
    $('#qr-logoclear').addEventListener('click', function(){ logo = null; $('#qr-logo').value = ''; var nm = body.querySelector('.file-name'); if(nm) nm.textContent = 'or drop a file here'; update(); });
    function big(){ var cv = document.createElement('canvas'); renderCanvas(cv, cur.m, cur.o, +$('#qr-size').value); return cv; }
    $('#qr-png').addEventListener('click', function(){ if(!cur) return; big().toBlob(function(b){ saveBlob('qr-code.png', b); }, 'image/png'); });
    $('#qr-svg').addEventListener('click', function(){ if(!cur) return; saveBlob('qr-code.svg', new Blob([renderSvg(cur.m, cur.o, +$('#qr-size').value)], {type: 'image/svg+xml'})); });
    $('#qr-copy').addEventListener('click', function(){
      if(!cur) return;
      if(!(navigator.clipboard && window.ClipboardItem)){ notify('Copying images isn’t supported here. Use Download PNG.', 'warn'); return; }
      big().toBlob(function(b){ navigator.clipboard.write([new ClipboardItem({'image/png': b})]).then(function(){ notify('QR code copied', 'ok'); }, function(){ notify('Couldn’t copy. Use Download PNG.', 'err'); }); }, 'image/png');
    });
    window.addEventListener('resize', update);
    setType();
    setTimeout(update, 40);   // restored field values have landed by now
  });
}
PLAYABLES['qr-generator'] = mountQRGenerator;

/* ==================================================================
   tools / reaction-timer
   ================================================================== */
/* ---------------- Reaction Timer (rebuilt) ---------------- */
function mountReactionTimer(container){
  mountEmbed(container, 'TOOL / REACTION TIMER', function(body){
    body.innerHTML =
      '<div class="snake-wrap">'+
        '<div class="snake-hud">'+
          '<span id="rt-last">LAST —</span><span id="rt-best">BEST —</span>'+
          '<span id="rt-avg">AVG —</span><span id="rt-count">ROUNDS 0</span>'+
        '</div>'+
        '<div id="rt-target" class="rt-target" role="button" tabindex="0" style="background:var(--surface-2);border:2px solid var(--line);border-radius:var(--rad);cursor:pointer;user-select:none;text-align:center;padding:16px">'+
          '<div id="rt-msg" class="rt-msg">Click to begin</div>'+
          '<div id="rt-sub" class="tool-msg">Wait for green, then click as fast as you can</div>'+
        '</div>'+
        '<div class="tool-row" style="justify-content:center">'+
          '<label>Min delay <input type="number" id="rt-min" value="1.5" step="0.5" min="0.5" max="10">s</label>'+
          '<label>Max delay <input type="number" id="rt-max" value="4" step="0.5" min="1" max="15">s</label>'+
          '<button class="game-btn secondary" id="rt-reset">Reset stats</button>'+
        '</div>'+
        '<div id="rt-hist" class="tool-output" style="width:100%;max-width:520px;display:none"></div>'+
      '</div>';

    var target = body.querySelector('#rt-target');
    var saved = toolHistory('reaction-timer', {max:50});
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
        results.push(ms); saved.add({ms:ms}); refresh();
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
    saved.mount(body, {title:'All attempts', format:function(e){ return {main:e.ms+' ms', sub:e.ms<200?'Excellent':e.ms<260?'Good':e.ms<350?'Average':'Slow'}; }});
  });
}
PLAYABLES['reaction-timer'] = mountReactionTimer;

/* ==================================================================
   tools / regex-tester
   ================================================================== */
function mountRegexTester(container){
  mountEmbed(container, 'TOOL / REGEX TESTER', function(body){
    body.innerHTML =
      '<div class="tool-row"><div class="field" style="flex:1;min-width:240px"><label for="rx-pat">Pattern</label><input id="rx-pat" spellcheck="false" autocomplete="off" placeholder="(\\w+)@(\\w+)\\.com"></div>'+
        '<div class="field"><span class="field-label">Flags</span><div class="tool-row" style="margin:0;gap:12px">'+
        ['g','i','m','s','u'].map(function(f){ return '<label><input type="checkbox" id="rx-f-'+f+'"'+(f === 'g' ? ' checked' : '')+'> '+f+'</label>'; }).join('')+'</div></div></div>'+
      '<div class="field"><label for="rx-text">Test text</label><textarea id="rx-text" spellcheck="false" style="min-height:120px" placeholder="Paste text to test against"></textarea></div>'+
      '<div class="err-text" id="rx-err" role="alert"></div>'+
      '<div class="field-label" style="margin:6px 0">Highlighted <span id="rx-count" style="color:var(--accent)"></span></div><div class="rx-out" id="rx-hl"></div>'+
      '<div id="rx-groups" style="margin-top:12px"></div>';
    var $ = function(s){ return body.querySelector(s); };
    function run(){
      var pat = $('#rx-pat').value, text = $('#rx-text').value, err = $('#rx-err');
      err.textContent = ''; $('#rx-groups').innerHTML = ''; $('#rx-count').textContent = '';
      if(!pat){ $('#rx-hl').textContent = text; return; }
      var flags = ['g','i','m','s','u'].filter(function(f){ return $('#rx-f-'+f).checked; }).join('');
      if(flags.indexOf('g') < 0) flags += 'g';   // always scan the whole text for display
      var re;
      try { re = new RegExp(pat, flags); } catch(e){ err.textContent = e.message; $('#rx-hl').textContent = text; return; }
      var html = '', last = 0, n = 0, rows = [], m;
      re.lastIndex = 0;
      while((m = re.exec(text)) !== null && n < 500){
        n++;
        html += esc(text.slice(last, m.index)) + '<mark class="rx-hit">' + esc(m[0]) + '</mark>';
        last = m.index + m[0].length;
        rows.push({i:m.index, m:m});
        if(m[0] === '') re.lastIndex++;
      }
      html += esc(text.slice(last));
      $('#rx-hl').innerHTML = html;
      $('#rx-count').textContent = '· ' + n + (n >= 500 ? '+' : '') + ' match' + (n === 1 ? '' : 'es');
      if(rows.length){
        $('#rx-groups').innerHTML = '<div class="field-label" style="margin-bottom:6px">Matches</div><div class="rx-out" style="min-height:0;max-height:240px;overflow:auto">'+
          rows.slice(0, 60).map(function(r, i){
            var g = Array.prototype.slice.call(r.m, 1).map(function(x, k){ return '  $'+(k+1)+' = '+(x === undefined ? 'undefined' : JSON.stringify(x)); }).join('\n');
            return '#'+(i+1)+' @'+r.i+'  '+JSON.stringify(r.m[0]) + (g ? '\n'+g : '');
          }).map(esc).join('\n\n') + '</div>';
      }
    }
    body.addEventListener('input', run); body.addEventListener('change', run);
    run();
  });
}
PLAYABLES['regex-tester'] = mountRegexTester;

/* ==================================================================
   tools / screen-capture
   ================================================================== */
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
PLAYABLES['screen-capture'] = mountScreenshot;

/* ==================================================================
   tools / split-bill
   ================================================================== */
function mountSplitBill(container){
  mountEmbed(container, 'TOOL / TIP & SPLIT', function(body){
    body.innerHTML =
      '<div class="tool-grid">'+
        '<div class="field"><label for="sb-bill">Bill total</label><input id="sb-bill" inputmode="decimal" placeholder="0.00" autocomplete="off"></div>'+
        '<div class="field"><label for="sb-tip">Tip %</label><input id="sb-tip" inputmode="decimal" value="10" autocomplete="off"></div>'+
        '<div class="field"><label for="sb-people">People</label><input id="sb-people" type="number" min="1" max="100" value="2"></div>'+
      '</div>'+
      '<div class="tool-row"><span class="seg" id="sb-presets">'+[0,5,10,15,20].map(function(p){ return '<button type="button" data-tip="'+p+'">'+p+'%</button>'; }).join('')+'</span>'+
        '<label><input type="checkbox" id="sb-round"> Round each share up to the next dollar</label></div>'+
      '<div class="result-card" id="sb-out"></div>';
    var $ = function(s){ return body.querySelector(s); };
    function money(n){ return n.toLocaleString(undefined, {style:'currency', currency:'AUD'}); }
    function calc(){
      var bill = parseFloat($('#sb-bill').value), tip = parseFloat($('#sb-tip').value) || 0;
      var n = Math.max(1, Math.min(100, parseInt($('#sb-people').value, 10) || 1));
      Array.prototype.forEach.call(body.querySelectorAll('[data-tip]'), function(b){ b.classList.toggle('on', parseFloat(b.getAttribute('data-tip')) === tip); });
      if(isNaN(bill) || bill < 0){ $('#sb-out').innerHTML = '<div class="result-sub">Enter the bill total to see each person’s share.</div>'; return; }
      var tipAmt = bill * tip / 100, total = bill + tipAmt, share = total / n;
      if($('#sb-round').checked) share = Math.ceil(share);
      var paid = share * n;
      $('#sb-out').innerHTML = '<div class="result-sub">Each person pays</div><div class="result-big">'+money(share)+'</div>'+
        '<dl class="kv" style="margin-top:12px"><dt>Tip</dt><dd>'+money(tipAmt)+'</dd><dt>Total</dt><dd>'+money(total)+'</dd><dt>Collected</dt><dd>'+money(paid)+(paid > total + .005 ? ' (+'+money(paid - total)+' extra)' : '')+'</dd></dl>';
    }
    $('#sb-presets').addEventListener('click', function(e){
      var b = e.target.closest('[data-tip]'); if(!b) return;
      $('#sb-tip').value = b.getAttribute('data-tip'); $('#sb-tip').dispatchEvent(new Event('input', {bubbles:true}));
    });
    body.addEventListener('input', calc); body.addEventListener('change', calc);
    calc();
  });
}
PLAYABLES['split-bill'] = mountSplitBill;

/* ==================================================================
   tools / stopwatch
   ================================================================== */
/* ---------------- Stopwatch ---------------- */
function mountStopwatch(container){
  mountEmbed(container, 'TOOL / STOPWATCH', function(body){
    body.innerHTML =
      '<div class="tl-split"><div class="tl-main"><div class="tool-output big-readout" id="sw-time">00:00.000</div>'+
      '<div class="tool-row tl-btns"><button class="game-btn" id="sw-toggle">Start</button><button class="game-btn secondary" id="sw-lap" disabled>Lap</button><button class="game-btn secondary" id="sw-reset">Reset</button></div></div>'+
      '<div class="tl-side"><h3 class="tl-h">'+icon('flag',{size:14})+' Laps</h3><div id="sw-laps" class="sw-laps"></div></div></div>';
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
PLAYABLES['stopwatch'] = mountStopwatch;

/* ==================================================================
   tools / text-encoder
   ================================================================== */
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
      '<div class="diff-columns">'+
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
PLAYABLES['text-encoder'] = mountBase64;

/* ==================================================================
   tools / text-to-speech
   ================================================================== */
/* ---------------- Text to Speech ---------------- */
function mountTTS(container){
  mountEmbed(container, 'TOOL / TEXT TO SPEECH', function(body){
    if(!window.speechSynthesis){ body.innerHTML = '<div class="tool-msg err">Your browser does not support the Web Speech API.</div>'; return; }
    body.innerHTML =
      '<div class="tl-split"><div class="tl-main"><textarea class="tool-textarea" id="tts-in" aria-label="Text to read aloud">Welcome to Velocity Systems.</textarea></div>'+
      '<div class="tl-side"><h3 class="tl-h">'+icon('volume',{size:14})+' Voice</h3>'+
      '<div class="field"><label for="tts-voice">Voice</label><select id="tts-voice"></select></div>'+
      '<div class="field"><label for="tts-rate">Speed</label><input type="range" id="tts-rate" min="0.5" max="2" step="0.1" value="1"></div>'+
      '<div class="tool-row tl-btns"><button class="game-btn" id="tts-speak">'+icon('play',{size:14})+' Speak</button><button class="game-btn secondary" id="tts-stop">Stop</button></div></div></div>';
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
PLAYABLES['text-to-speech'] = mountTTS;

/* ==================================================================
   tools / timestamp-converter
   ================================================================== */
function mountTimestamp(container){
  mountEmbed(container, 'TOOL / TIMESTAMP CONVERTER', function(body){
    body.innerHTML =
      '<div class="result-card"><div class="field-label">Now</div><div class="result-big" id="ts-now"></div><div class="result-sub" id="ts-now-ms"></div>'+
        '<div class="tool-row"><button class="game-btn secondary" id="ts-use">Use current time</button></div></div>'+
      '<div class="tool-grid two">'+
        '<div class="field"><label for="ts-in">Unix timestamp (seconds or milliseconds)</label><input id="ts-in" inputmode="numeric" autocomplete="off" placeholder="1700000000"></div>'+
        '<div class="field"><label for="ts-dt">Date &amp; time (your timezone)</label><input id="ts-dt" type="datetime-local" step="1"></div></div>'+
      '<div class="err-text" id="ts-err" role="alert"></div><div class="result-card" id="ts-out"><div class="result-sub">Enter a timestamp or pick a date.</div></div>';
    var $ = function(s){ return body.querySelector(s); };
    function pad(n){ return String(n).padStart(2, '0'); }
    function localInput(d){ return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+'T'+pad(d.getHours())+':'+pad(d.getMinutes())+':'+pad(d.getSeconds()); }
    function rel(ms){
      var s = Math.round((ms - Date.now()) / 1000), a = Math.abs(s), u = [['year',31536000],['month',2592000],['day',86400],['hour',3600],['minute',60],['second',1]];
      for(var i = 0; i < u.length; i++) if(a >= u[i][1]){ var v = Math.floor(a / u[i][1]); return s < 0 ? v+' '+u[i][0]+(v > 1 ? 's' : '')+' ago' : 'in '+v+' '+u[i][0]+(v > 1 ? 's' : ''); }
      return 'now';
    }
    function show(ms){
      var d = new Date(ms);
      if(isNaN(d)){ $('#ts-err').textContent = 'That doesn’t look like a valid time.'; return; }
      $('#ts-err').textContent = '';
      $('#ts-out').innerHTML = '<dl class="kv"><dt>Local</dt><dd>'+esc(d.toString())+'</dd><dt>UTC</dt><dd>'+esc(d.toUTCString())+'</dd><dt>ISO 8601</dt><dd>'+esc(d.toISOString())+'</dd>'+
        '<dt>Seconds</dt><dd>'+Math.floor(ms/1000)+'</dd><dt>Milliseconds</dt><dd>'+ms+'</dd><dt>Relative</dt><dd>'+esc(rel(ms))+'</dd></dl>';
    }
    $('#ts-in').addEventListener('input', function(){
      var v = this.value.trim(); if(!v){ $('#ts-err').textContent = ''; return; }
      if(!/^-?\d+$/.test(v)){ $('#ts-err').textContent = 'Use digits only.'; return; }
      var n = Number(v), ms = Math.abs(n) >= 1e11 ? n : n * 1000;
      show(ms); if(!isNaN(new Date(ms))) $('#ts-dt').value = localInput(new Date(ms));
    });
    $('#ts-dt').addEventListener('input', function(){
      if(!this.value) return; var ms = new Date(this.value).getTime();
      $('#ts-in').value = Math.floor(ms / 1000); show(ms);
    });
    $('#ts-use').addEventListener('click', function(){
      var ms = Date.now(); $('#ts-in').value = Math.floor(ms / 1000); $('#ts-dt').value = localInput(new Date(ms)); show(ms);
    });
    function tick(){ var n = Date.now(); $('#ts-now').textContent = Math.floor(n / 1000); $('#ts-now-ms').textContent = n + ' ms · ' + new Date(n).toISOString(); }
    tick(); var iv = setInterval(tick, 1000); onUnmount(body, function(){ clearInterval(iv); });
    if($('#ts-in').value) $('#ts-in').dispatchEvent(new Event('input'));
  });
}
PLAYABLES['timestamp-converter'] = mountTimestamp;

/* ==================================================================
   tools / todo-list
   ================================================================== */
// tools/todo-list.js
function mountTodo(container){
  mountEmbed(container, 'TOOL / TO-DO LIST', function(body){
    body.innerHTML =
      '<div class="tool-row"><div class="field" style="flex:1;min-width:220px"><label for="td-in">New task</label><input id="td-in" autocomplete="off" placeholder="What needs doing? Press Enter to add"></div>'+
        '<button class="game-btn" id="td-add">Add</button></div>'+
      '<div class="tool-row"><span class="seg" id="td-filter"><button type="button" data-f="all" class="on">All</button><button type="button" data-f="open">To do</button><button type="button" data-f="done">Done</button></span>'+
        '<button class="game-btn secondary" id="td-clear">Clear completed</button><span class="hint" id="td-count" style="margin:0"></span></div>'+
      '<div id="td-list" class="gd-list"></div>';
    var $ = function(s){ return body.querySelector(s); };
    var tasks = lsGet('vs-todo', []), filter = lsGet('vs-todo-filter', 'all');
    function save(){ lsSet('vs-todo', tasks); }
    function draw(){
      var shown = tasks.filter(function(t){ return filter === 'all' || (filter === 'done') === t.done; });
      Array.prototype.forEach.call(body.querySelectorAll('#td-filter button'), function(b){ b.classList.toggle('on', b.getAttribute('data-f') === filter); });
      var open = tasks.filter(function(t){ return !t.done; }).length;
      $('#td-count').textContent = open + ' to do · ' + (tasks.length - open) + ' done';
      $('#td-list').innerHTML = shown.length ? shown.map(function(t){
        return '<div class="td-row' + (t.done ? ' done' : '') + '"><label class="td-check"><input type="checkbox" data-id="' + t.id + '"' + (t.done ? ' checked' : '') + ' data-nopersist><span>' + esc(t.text) + '</span></label>'+
          '<button type="button" class="hist-clear" data-del="' + t.id + '" aria-label="Delete task">✕</button></div>';
      }).join('') : '<div class="empty-state" style="border:0">' + (tasks.length ? 'Nothing here.' : 'No tasks yet. Add one above.') + '</div>';
    }
    function add(){
      var v = $('#td-in').value.trim(); if(!v) return;
      tasks.unshift({id: Date.now() + Math.random().toString(36).slice(2, 6), text: v, done: false});
      $('#td-in').value = ''; save(); draw();
    }
    $('#td-add').addEventListener('click', add);
    $('#td-in').addEventListener('keydown', function(e){ if(e.key === 'Enter') add(); });
    $('#td-list').addEventListener('change', function(e){
      var id = e.target.getAttribute('data-id'); if(!id) return;
      tasks.forEach(function(t){ if(t.id === id) t.done = e.target.checked; }); save(); draw();
    });
    $('#td-list').addEventListener('click', function(e){
      var d = e.target.closest('[data-del]'); if(!d) return;
      var id = d.getAttribute('data-del'), gone = tasks.filter(function(t){ return t.id === id; })[0];
      tasks = tasks.filter(function(t){ return t.id !== id; }); save(); draw();
      notify('Task deleted', 'info', {action: {label: 'Undo', run: function(){ tasks.unshift(gone); save(); draw(); }}});
    });
    $('#td-filter').addEventListener('click', function(e){ var b = e.target.closest('[data-f]'); if(b){ filter = b.getAttribute('data-f'); lsSet('vs-todo-filter', filter); draw(); } });
    $('#td-clear').addEventListener('click', function(){
      var done = tasks.filter(function(t){ return t.done; }); if(!done.length) return;
      tasks = tasks.filter(function(t){ return !t.done; }); save(); draw();
      notify('Cleared ' + done.length + ' completed task' + (done.length > 1 ? 's' : ''), 'ok', {action: {label: 'Undo', run: function(){ tasks = tasks.concat(done); save(); draw(); }}});
    });
    draw();
  });
}
PLAYABLES['todo-list'] = mountTodo;

/* ==================================================================
   tools / unit-converter
   ================================================================== */
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
      '<div id="conv-grid" class="conv-grid"></div>';
    var currentCat = lsGet('vs-converter-cat', 'Length');
    if(!CATS[currentCat]) currentCat = 'Length';
    var tabs = body.querySelector('#conv-tabs'), grid = body.querySelector('#conv-grid');
    var lock = false;
    function renderTabs(){
      tabs.innerHTML = Object.keys(CATS).map(function(c){ return '<button class="game-btn'+(c===currentCat?'':' secondary')+'" data-cat="'+c+'">'+c+'</button>'; }).join('');
      Array.prototype.slice.call(tabs.querySelectorAll('[data-cat]')).forEach(function(b){ b.addEventListener('click', function(){ currentCat = b.getAttribute('data-cat'); lsSet('vs-converter-cat', currentCat); renderTabs(); buildGrid(); }); });
    }
    function buildGrid(){
      var cat = CATS[currentCat];
      grid.innerHTML = cat.units.map(function(u,i){
        return '<div><div class="tool-msg">'+u+'</div><input type="number" class="tool-textarea conv-in" data-idx="'+i+'" placeholder="0"></div>';
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
PLAYABLES['unit-converter'] = mountAdvancedConverter;

/* ==================================================================
   tools / uuid-generator
   ================================================================== */
function mountUuid(container){
  mountEmbed(container, 'TOOL / UUID GENERATOR', function(body){
    body.innerHTML =
      '<div class="tool-row"><div class="field" style="width:120px"><label for="uu-count">How many</label><input id="uu-count" type="number" min="1" max="500" value="5"></div>'+
        '<label><input type="checkbox" id="uu-upper"> Uppercase</label><label><input type="checkbox" id="uu-nodash"> No dashes</label>'+
        '<button class="game-btn" id="uu-go">Generate</button><button class="game-btn secondary" id="uu-copy">Copy all</button></div>'+
      '<textarea class="tool-textarea" id="uu-out" readonly style="min-height:200px" aria-label="Generated UUIDs"></textarea>';
    var $ = function(s){ return body.querySelector(s); };
    function uuid(){
      if(window.crypto && crypto.randomUUID) return crypto.randomUUID();
      var b = new Uint8Array(16); crypto.getRandomValues(b); b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
      var h = Array.prototype.map.call(b, function(x){ return x.toString(16).padStart(2, '0'); }).join('');
      return h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20);
    }
    function gen(){
      var n = Math.max(1, Math.min(500, parseInt($('#uu-count').value, 10) || 1)), out = [];
      for(var i = 0; i < n; i++){
        var u = uuid();
        if($('#uu-nodash').checked) u = u.replace(/-/g, '');
        out.push($('#uu-upper').checked ? u.toUpperCase() : u);
      }
      $('#uu-out').value = out.join('\n');
    }
    $('#uu-go').addEventListener('click', gen);
    $('#uu-copy').addEventListener('click', function(){ copyText($('#uu-out').value, 'UUIDs'); });
    gen();
  });
}
PLAYABLES['uuid-generator'] = mountUuid;

/* ==================================================================
   tools / watermark-tool
   ================================================================== */
/* ---------------- Watermark Tool ---------------- */
function mountWatermark(container){
  mountEmbed(container, 'TOOL / WATERMARK', function(body){
    body.innerHTML =
      '<div class="wm-layout"><div class="wm-controls">'+
        '<input type="file" accept="image/*,.heic,.heif,.avif,.ico,.bmp,.tif,.tiff,.svg,.gif,.webp,.jfif" id="wm-file" aria-label="Choose image">'+
        '<div class="wm-list-head"><strong>Watermarks</strong><button type="button" class="game-btn secondary" id="wm-add">+ Add watermark</button></div><div id="wm-items"></div>'+
        '<p class="hint">Choose a preset or drag a watermark directly on the preview. Duplicate a watermark to create another copy. Processing stays in your browser.</p>'+
        '<div class="tool-row"><button type="button" class="game-btn" id="wm-download" disabled>Download PNG</button></div></div>'+
        '<div class="wm-preview"><canvas id="wm-canvas" aria-label="Image preview with draggable watermarks"></canvas><div class="hint">Tip: drag text to reposition it.</div></div></div>';
    var $=function(s){return body.querySelector(s);};
    var canvas=$('#wm-canvas'),ctx=canvas.getContext('2d'),img=null,watermarks=[],nextId=1,dragging=null,dragMoved=false;
    var positions=[['tl','Top left'],['tc','Top centre'],['tr','Top right'],['ml','Middle left'],['mc','Centre'],['mr','Middle right'],['bl','Bottom left'],['bc','Bottom centre'],['br','Bottom right'],['custom','Custom / drag']];
    function makeWatermark(copy){
      var w=copy?Object.assign({},copy,{id:nextId++,text:copy.text+' copy'}):{id:nextId++,text:'© Velocity Systems',color:'#ffffff',opacity:70,size:4,position:'br',x:0.97,y:0.96};
      watermarks.push(w);renderControls();render();
    }
    function preset(w){var p=w.position; if(p==='custom')return; var x=p.endsWith('l')?.03:p.endsWith('r')?.97:.5; var y=p.startsWith('t')?.05:p.startsWith('b')?.96:.5; if(p==='ml'||p==='mc'||p==='mr')y=.5; w.x=x;w.y=y;}
    function renderControls(){
      $('#wm-items').innerHTML=watermarks.map(function(w,i){return '<section class="wm-item" data-wm-item="'+w.id+'"><div class="wm-item-head"><strong>Watermark '+(i+1)+'</strong><div><button type="button" class="game-btn secondary" data-wm-copy="'+w.id+'">Duplicate</button> <button type="button" class="game-btn secondary" data-wm-remove="'+w.id+'" '+(watermarks.length===1?'disabled':'')+'>Remove</button></div></div><div class="field"><label>Text</label><input type="text" data-wm-field="text" value="'+esc(w.text)+'" maxlength="180"></div><div class="wm-control-grid"><div class="field"><label>Position</label><select data-wm-field="position">'+positions.map(function(p){return '<option value="'+p[0]+'" '+(w.position===p[0]?'selected':'')+'>'+p[1]+'</option>';}).join('')+'</select></div><div class="field"><label>Colour</label><input type="color" data-wm-field="color" value="'+w.color+'"></div><div class="field"><label>Opacity <span data-wm-opacity>'+w.opacity+'%</span></label><input type="range" min="5" max="100" value="'+w.opacity+'" data-wm-field="opacity"></div><div class="field"><label>Size <span data-wm-size>'+w.size+'%</span></label><input type="range" min="1" max="12" value="'+w.size+'" data-wm-field="size"></div><div class="field"><label>Horizontal position</label><input type="range" min="0" max="100" value="'+Math.round(w.x*100)+'" data-wm-field="x"></div><div class="field"><label>Vertical position</label><input type="range" min="0" max="100" value="'+Math.round(w.y*100)+'" data-wm-field="y"></div></div></section>';}).join('');
    }
    function drawWatermark(w){if(!w.text.trim())return;var size=Math.max(10,img.width*w.size/100);ctx.font='700 '+size+'px system-ui,sans-serif';ctx.textBaseline='middle';ctx.textAlign=w.x<.34?'left':w.x>.66?'right':'center';ctx.fillStyle=w.color;ctx.globalAlpha=w.opacity/100;var x=w.x*img.width,y=w.y*img.height;ctx.shadowColor='rgba(0,0,0,.35)';ctx.shadowBlur=Math.max(1,size*.08);ctx.fillText(w.text,x,y,Math.max(1,img.width-24));ctx.shadowBlur=0;ctx.globalAlpha=1;}
    function render(){if(!img)return;canvas.width=img.naturalWidth||img.width;canvas.height=img.naturalHeight||img.height;ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0);watermarks.forEach(drawWatermark);$('#wm-download').disabled=false;}
    function pointerPoint(e){var r=canvas.getBoundingClientRect();return {x:Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),y:Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))};}
    function hitWatermark(pt){if(!img)return null;for(var i=watermarks.length-1;i>=0;i--){var w=watermarks[i],size=Math.max(10,img.width*w.size/100);ctx.font='700 '+size+'px system-ui,sans-serif';var width=ctx.measureText(w.text).width/ img.width; if(Math.abs(pt.y-w.y)<Math.max(.025,size/img.height*.8)&&Math.abs(pt.x-w.x)<Math.max(.04,width*.55))return w;}return null;}
    $('#wm-file').addEventListener('change',function(e){var file=e.target.files[0];if(!file)return;var reader=new FileReader();reader.onload=function(ev){var candidate=new Image();candidate.onload=function(){img=candidate;render();};candidate.onerror=function(){notify('This image format could not be previewed in your browser.','warn');};candidate.src=ev.target.result;};reader.readAsDataURL(file);});
    $('#wm-add').addEventListener('click',function(){makeWatermark();});
    $('#wm-items').addEventListener('input',function(e){var field=e.target.getAttribute('data-wm-field');if(!field)return;var item=e.target.closest('[data-wm-item]'),w=watermarks.find(function(x){return String(x.id)===item.getAttribute('data-wm-item');});if(!w)return;if(field==='x'||field==='y')w[field]=Number(e.target.value)/100;else if(field==='opacity'||field==='size')w[field]=Number(e.target.value);else w[field]=e.target.value;if(field==='position')preset(w);var o=item.querySelector('[data-wm-opacity]'),z=item.querySelector('[data-wm-size]');if(o)o.textContent=w.opacity+'%';if(z)z.textContent=w.size+'%';if(field==='position'){item.querySelector('[data-wm-field="x"]').value=Math.round(w.x*100);item.querySelector('[data-wm-field="y"]').value=Math.round(w.y*100);}render();});
    $('#wm-items').addEventListener('change',function(e){if(e.target.matches('select[data-wm-field="position"]'))e.target.dispatchEvent(new Event('input',{bubbles:true}));});
    $('#wm-items').addEventListener('click',function(e){var copy=e.target.closest('[data-wm-copy]'),remove=e.target.closest('[data-wm-remove]');if(copy){var w=watermarks.find(function(x){return String(x.id)===copy.getAttribute('data-wm-copy');});if(w)makeWatermark(w);}if(remove){watermarks=watermarks.filter(function(x){return String(x.id)!==remove.getAttribute('data-wm-remove');});renderControls();render();}});
    canvas.addEventListener('pointerdown',function(e){var pt=pointerPoint(e);dragging=hitWatermark(pt);if(dragging){dragMoved=true;canvas.setPointerCapture(e.pointerId);}});
    canvas.addEventListener('pointermove',function(e){if(!dragging)return;var pt=pointerPoint(e);dragging.x=pt.x;dragging.y=pt.y;dragging.position='custom';render();});
    canvas.addEventListener('pointerup',function(){if(!dragging)return;dragging=null;renderControls();});canvas.addEventListener('pointercancel',function(){dragging=null;});
    $('#wm-download').addEventListener('click',function(){if(!img)return;var a=document.createElement('a');a.download='watermarked.png';a.href=canvas.toDataURL('image/png');a.click();});
    makeWatermark();
  });
}
PLAYABLES['watermark-tool'] = mountWatermark;

/* ==================================================================
   tools / wheel-spinner
   ================================================================== */
/* ---------------- Wheel Spinner ---------------- */
function mountSpinner(container){
  mountEmbed(container, 'TOOL / WHEEL SPINNER', function(body){
    body.innerHTML =
      '<div class="sp-layout">'+
        '<div class="sp-stage" id="sp-stage"><canvas id="sp-canvas" aria-label="Wheel"></canvas><div class="sp-pointer" aria-hidden="true"></div>'+
          '<button type="button" class="sp-hub" id="sp-hub" aria-label="Spin the wheel"><span id="sp-result" class="sp-result">SPIN</span></button></div>'+
        '<div class="sp-panel">'+
          '<div class="field"><label for="sp-options">Options — one per line</label><textarea id="sp-options" spellcheck="false" rows="10">Pizza\nBurgers\nSushi\nTacos\nCurry\nPasta</textarea></div>'+
          '<div class="tool-row"><button class="game-btn" id="sp-spin">Spin</button><button class="game-btn secondary" id="sp-shuffle">Shuffle</button></div>'+
          '<label><input type="checkbox" id="sp-elim"> Remove the winner after each spin</label>'+
          '<p class="hint" id="sp-count"></p>'+
        '</div>'+
      '</div>';
    var $ = function(s){ return body.querySelector(s); };
    var canvas = $('#sp-canvas'), ctx = canvas.getContext('2d'), stage = $('#sp-stage'), resultEl = $('#sp-result'), hub = $('#sp-hub');
    var COLORS = ['#3b82f6','#36c979','#ff535e','#fbbf24','#9b7bff','#22d3ee','#f97316','#ec4899','#84cc16','#14b8a6'];
    var segs = [], angle = 0, spinning = false, size = 400, dpr = Math.min(window.devicePixelRatio || 1, 3), raf = null, winIdx = -1;
    var hist = toolHistory('wheel-spinner');
    function css(v, fb){ return getComputedStyle(document.documentElement).getPropertyValue(v).trim() || fb; }

    function readSegs(){
      segs = $('#sp-options').value.split('\n').map(function(s){ return s.trim(); }).filter(Boolean).slice(0, 60);
      if(segs.length < 2) segs = segs.length ? segs.concat(['—']) : ['Add options', '—'];
      $('#sp-count').textContent = segs.length + ' options';
    }
    function fit(){
      size = Math.max(240, Math.min(stage.clientWidth || 400, 640));
      canvas.width = size * dpr; canvas.height = size * dpr; canvas.style.width = canvas.style.height = size + 'px';
      draw();
    }
    function fitText(el, text, maxPx){
      el.textContent = text;
      var fs = maxPx;
      el.style.fontSize = fs + 'px';
      var box = hub, max = box.clientWidth - 24, maxH = box.clientHeight - 16, guard = 0;
      while((el.scrollWidth > max || el.scrollHeight > maxH) && fs > 11 && guard++ < 40){ fs -= 2; el.style.fontSize = fs + 'px'; }
    }
    function draw(){
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var c = size / 2, r = c - 6, n = segs.length, arc = Math.PI * 2 / n;
      ctx.clearRect(0, 0, size, size);
      segs.forEach(function(seg, i){
        var a0 = angle + i * arc - Math.PI / 2, a1 = a0 + arc;
        ctx.beginPath(); ctx.moveTo(c, c); ctx.arc(c, c, r, a0, a1); ctx.closePath();
        ctx.fillStyle = COLORS[i % COLORS.length]; ctx.fill();
        if(i === winIdx && !spinning){ ctx.fillStyle = 'rgba(255,255,255,.38)'; ctx.fill(); }
        ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.save(); ctx.translate(c, c); ctx.rotate(a0 + arc / 2); ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        var fs = Math.max(11, Math.min(26, Math.floor(r * Math.sin(Math.min(arc / 2, 1.2)) * .8), Math.floor(r / 10)));
        ctx.font = '700 ' + fs + 'px ' + css('--font-ui', 'sans-serif'); ctx.fillStyle = '#0b0c0f';
        var label = seg, maxW = r * .62; while(label.length > 2 && ctx.measureText(label).width > maxW) label = label.slice(0, -2);
        if(label !== seg) label += '…';
        ctx.fillText(label, r - 14, 0); ctx.restore();
      });
      ctx.beginPath(); ctx.arc(c, c, r, 0, Math.PI * 2); ctx.strokeStyle = css('--text', '#fff'); ctx.lineWidth = 4; ctx.globalAlpha = .85; ctx.stroke(); ctx.globalAlpha = 1;
    }
    function under(a){ var arc = Math.PI * 2 / segs.length, x = ((-a) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2); return Math.floor(x / arc) % segs.length; }
    function spin(){
      if(spinning) return;
      readSegs(); winIdx = -1; hub.classList.remove('win'); spinning = true;
      var from = angle, turns = 5 + Math.random() * 3, to = from + turns * Math.PI * 2 + Math.random() * Math.PI * 2, dur = 3800 + Math.random() * 1600, t0 = performance.now(), shown = -1;
      function frame(now){
        var t = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - t, 3.2);
        angle = from + (to - from) * e; draw();
        var i = under(angle); if(i !== shown){ shown = i; fitText(resultEl, segs[i], 34); }
        if(t < 1){ raf = requestAnimationFrame(frame); return; }
        spinning = false; winIdx = under(angle); draw();
        hub.classList.add('win'); fitText(resultEl, segs[winIdx], 44);
        hist.add({text: segs[winIdx]});
        if($('#sp-elim').checked && segs.length > 2){
          var rest = $('#sp-options').value.split('\n').map(function(s){ return s.trim(); }).filter(Boolean), k = rest.indexOf(segs[winIdx]);
          if(k > -1){ rest.splice(k, 1); setTimeout(function(){ $('#sp-options').value = rest.join('\n'); $('#sp-options').dispatchEvent(new Event('input', {bubbles: true})); }, 1200); }
        }
      }
      raf = requestAnimationFrame(frame);
    }
    $('#sp-options').addEventListener('input', function(){ if(spinning) return; readSegs(); winIdx = -1; hub.classList.remove('win'); fitText(resultEl, 'SPIN', 34); draw(); });
    $('#sp-spin').addEventListener('click', spin); hub.addEventListener('click', spin);
    $('#sp-shuffle').addEventListener('click', function(){
      var a = $('#sp-options').value.split('\n').map(function(s){ return s.trim(); }).filter(Boolean);
      for(var i = a.length - 1; i > 0; i--){ var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; }
      $('#sp-options').value = a.join('\n'); $('#sp-options').dispatchEvent(new Event('input', {bubbles: true}));
    });
    window.addEventListener('resize', fit);
    onUnmount(canvas, function(){ if(raf) cancelAnimationFrame(raf); });
    hist.mount($('.sp-panel'), {title: 'Past results', format: function(e){ return {main: e.text}; }});
    readSegs(); fit(); fitText(resultEl, 'SPIN', 34);
    setTimeout(function(){ readSegs(); draw(); }, 60);   // pick up options restored from the last visit
  });
}
PLAYABLES['wheel-spinner'] = mountSpinner;

/* ==================================================================
   tools / word-counter
   ================================================================== */
/* ---------------- Word Counter ---------------- */
function mountWordCounter(container){
  mountEmbed(container, 'TOOL / WORD COUNTER', function(body){
    body.innerHTML =
      '<div class="tl-split wc-split"><div class="tl-main"><textarea class="tool-textarea" id="wc-in" placeholder="Paste or type text..."></textarea></div>'+
      '<div class="tl-side"><h3 class="tl-h">'+icon('hash',{size:14})+' Stats</h3><div class="stat-cards">'+
        '<div class="stat-card"><span>Words</span><b id="wc-words">0</b></div><div class="stat-card"><span>Characters</span><b id="wc-chars">0</b></div><div class="stat-card"><span>Sentences</span><b id="wc-sent">0</b></div>'+
        '<div class="stat-card"><span>Paragraphs</span><b id="wc-para">0</b></div><div class="stat-card"><span>Reading time</span><b id="wc-read">0s</b></div><div class="stat-card"><span>Avg word length</span><b id="wc-avg">—</b></div>'+
      '</div></div></div>';
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
PLAYABLES['word-counter'] = mountWordCounter;

/* ==================================================================
   tools / world-clock
   ================================================================== */
// tools/world-clock.js
function mountWorldClock(container){
  mountEmbed(container, 'TOOL / WORLD CLOCK', function(body){
    var local = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    var zones = [];
    try { zones = Intl.supportedValuesOf('timeZone'); } catch(e){}
    if(zones.length < 10) zones = ['UTC','Australia/Brisbane','Australia/Sydney','Pacific/Auckland','Asia/Tokyo','Asia/Singapore','Asia/Kolkata','Asia/Dubai','Europe/London','Europe/Paris','America/New_York','America/Chicago','America/Los_Angeles'];
    if(zones.indexOf('UTC') < 0) zones.unshift('UTC');
    var picked = lsGet('vs-clocks', null) || [local, 'UTC', 'Europe/London', 'America/New_York'];
    var opts = zones.map(function(z){ return '<option value="' + z + '"></option>'; }).join('');
    body.innerHTML =
      '<div class="tool-row"><div class="field" style="flex:1;min-width:220px"><label for="wc-add">Add a place (type a city or timezone)</label><input id="wc-add" list="wc-zones" autocomplete="off" data-nopersist placeholder="e.g. Tokyo or America/Denver"><datalist id="wc-zones">' + opts + '</datalist></div>'+
        '<button class="game-btn" id="wc-addbtn">Add</button></div>'+
      '<div id="wc-grid" class="tool-grid"></div>'+
      '<div class="result-card"><div class="field-label" style="margin-bottom:10px">Plan a meeting</div>'+
        '<div class="tool-grid"><div class="field"><label for="wc-dt">Date &amp; time</label><input id="wc-dt" type="datetime-local"></div>'+
        '<div class="field"><label for="wc-from">In this timezone</label><select id="wc-from"></select></div></div><dl class="kv" id="wc-plan"></dl></div>';
    var $ = function(s){ return body.querySelector(s); };
    function label(z){ return z === 'UTC' ? 'UTC' : z.split('/').pop().replace(/_/g, ' '); }
    function parts(date, tz){
      var o = {}; new Intl.DateTimeFormat('en-GB', {timeZone: tz, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'})
        .formatToParts(date).forEach(function(p){ o[p.type] = p.value; });
      if(o.hour === '24') o.hour = '00';
      return o;
    }
    function offsetMin(date, tz){
      var p = parts(date, tz);
      return Math.round((Date.UTC(+p.year, p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - Math.floor(date.getTime() / 1000) * 1000) / 60000);
    }
    function fmtOff(m){ var s = m < 0 ? '-' : '+', a = Math.abs(m); return 'UTC' + s + Math.floor(a / 60) + (a % 60 ? ':' + String(a % 60).padStart(2, '0') : ''); }
    function draw(){
      var now = new Date(), lo = offsetMin(now, local);
      $('#wc-grid').innerHTML = picked.map(function(z){
        var p = parts(now, z), off = offsetMin(now, z), diff = (off - lo) / 60, h = +p.hour;
        return '<div class="result-card" style="margin:0"><div class="tool-row" style="justify-content:space-between;margin:0 0 6px"><span class="field-label">' + esc(label(z)) + (z === local ? ' · you' : '') + '</span>'+
          '<button type="button" class="hist-clear" data-rm="' + esc(z) + '" aria-label="Remove ' + esc(label(z)) + '">✕</button></div>'+
          '<div class="result-big" style="font-size:32px">' + p.hour + ':' + p.minute + '<span style="font-size:16px;color:var(--muted)">:' + p.second + '</span></div>'+
          '<div class="result-sub">' + p.day + '/' + p.month + '/' + p.year + ' · ' + fmtOff(off) + (z === local ? '' : ' · ' + (diff === 0 ? 'same time' : (diff > 0 ? '+' : '') + diff + 'h from you')) + ' · ' + (h >= 7 && h < 19 ? 'day' : 'night') + '</div></div>';
      }).join('') || '<div class="empty-state">Add a place to start.</div>';
    }
    function utcFrom(dtLocal, tz){
      var m = /^(\d+)-(\d+)-(\d+)T(\d+):(\d+)/.exec(dtLocal); if(!m) return null;
      var guess = Date.UTC(+m[1], m[2] - 1, +m[3], +m[4], +m[5]);
      var d1 = new Date(guess - offsetMin(new Date(guess), tz) * 60000);
      return new Date(guess - offsetMin(d1, tz) * 60000);   // second pass settles daylight-saving edges
    }
    function plan(){
      var v = $('#wc-dt').value;
      if(!v){ $('#wc-plan').innerHTML = ''; return; }
      var at = utcFrom(v, $('#wc-from').value);
      if(!at || isNaN(at)){ $('#wc-plan').innerHTML = ''; return; }
      $('#wc-plan').innerHTML = picked.map(function(z){
        var p = parts(at, z);
        return '<dt>' + esc(label(z)) + '</dt><dd>' + p.day + '/' + p.month + '/' + p.year + ' ' + p.hour + ':' + p.minute + '</dd>';
      }).join('');
    }
    function save(){ lsSet('vs-clocks', picked); fillFrom(); draw(); plan(); }
    function fillFrom(){
      var keep = $('#wc-from').value || local;
      $('#wc-from').innerHTML = [local].concat(picked.filter(function(z){ return z !== local; })).map(function(z){ return '<option value="' + esc(z) + '">' + esc(label(z)) + '</option>'; }).join('');
      $('#wc-from').value = keep; if(!$('#wc-from').value) $('#wc-from').selectedIndex = 0;
    }
    function add(){
      var v = $('#wc-add').value.trim(); if(!v) return;
      var hit = zones.filter(function(z){ return z.toLowerCase() === v.toLowerCase(); })[0] ||
                zones.filter(function(z){ return label(z).toLowerCase() === v.toLowerCase(); })[0] ||
                zones.filter(function(z){ return z.toLowerCase().indexOf(v.toLowerCase().replace(/ /g, '_')) > -1; })[0];
      if(!hit){ notify('No timezone found for “' + v + '”', 'warn'); return; }
      if(picked.indexOf(hit) > -1){ notify(label(hit) + ' is already on the list', 'info'); return; }
      picked.push(hit); $('#wc-add').value = ''; save();
    }
    $('#wc-addbtn').addEventListener('click', add);
    $('#wc-add').addEventListener('keydown', function(e){ if(e.key === 'Enter') add(); });
    $('#wc-grid').addEventListener('click', function(e){
      var b = e.target.closest('[data-rm]'); if(!b) return;
      picked = picked.filter(function(z){ return z !== b.getAttribute('data-rm'); }); save();
    });
    body.addEventListener('input', function(e){ if(e.target.id === 'wc-dt') plan(); });
    body.addEventListener('change', function(e){ if(e.target.id === 'wc-from' || e.target.id === 'wc-dt') plan(); });
    var iv = setInterval(draw, 1000); onUnmount(body, function(){ clearInterval(iv); });
    fillFrom(); draw();
  });
}
PLAYABLES['world-clock'] = mountWorldClock;

/* ==================================================================
   tools / typing-test
   ================================================================== */
function mountTypingTest(container){
  mountEmbed(container, 'TOOL / TYPING SPEED TEST', function(body){
    var WORDS = ('the of and to in is you that it he was for on are as with his they at be this from I have or by one had not but what all were when we there can an your which their said if do will each about how up out them then she many some so these would other into has more her two like him see time could no make than first been its who now people my made over did down only way find use may water long little very after words called just where most know get through back much before go good new write our used me man too any day same right look think also around another came come work three word must because does part even place well such here take why things help put years different away again off went old number great tell men say small every found still between name should home big give air line set own under read last never us left end along while might next sound below saw something thought both few those always looked show large often together asked house don\'t world going want school important until form food keep children feet land side without boy once animals life enough took sometimes four head above kind began almost live page got earth need far hand high year mother light country father let night picture being study second soon story since white ever paper hard near sentence better best across during today however sure knew try told young sun thing whole hear example heard several change answer room sea against top turned learn point city play toward five using himself usually').replace(/don\\'t/g, 'don\'t').split(' ');
    body.innerHTML =
      '<div class="tool-row"><div class="field" style="width:150px"><label for="ty-time">Duration</label><select id="ty-time"><option value="15">15 seconds</option><option value="30" selected>30 seconds</option><option value="60">60 seconds</option><option value="120">2 minutes</option></select></div>'+
        '<label><input type="checkbox" id="ty-punct"> Capitals &amp; punctuation</label><button class="game-btn secondary" id="ty-new">New text (Esc)</button></div>'+
      '<div class="snake-hud"><span id="ty-wpm">WPM 0</span><span id="ty-acc">ACC 100%</span><span id="ty-left">30s</span><span id="ty-best">BEST 0</span></div>'+
      '<div class="ty-box" id="ty-box" tabindex="-1"><div class="ty-text" id="ty-text" aria-label="Text to type"></div>'+
        '<input id="ty-input" class="ty-input" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" data-nopersist aria-label="Type here"></div>'+
      '<p class="hint" id="ty-msg">Click the text and start typing. The clock starts on your first key.</p>'+
      '<div class="result-card" id="ty-result" hidden></div>';
    var $ = function(s){ return body.querySelector(s); };
    var hist = toolHistory('typing-test');
    var target = '', startT = 0, timer = null, secs = 30, done = false;
    function rnd(n){ return Math.floor(Math.random() * n); }
    function gen(n){
      var out = [], punct = $('#ty-punct').checked;
      for(var i = 0; i < n; i++){
        var w = WORDS[rnd(WORDS.length)];
        if(punct){ if(i === 0 || /[.!?]$/.test(out[i - 1])) w = w[0].toUpperCase() + w.slice(1); if(Math.random() < .12) w += [',', '.', '.', '?', '!'][rnd(5)]; }
        out.push(w);
      }
      return out.join(' ');
    }
    function bestKey(){ return 'vs-typing-best-' + secs; }
    function render(){
      var typed = $('#ty-input').value, html = '';
      for(var i = 0; i < target.length; i++){
        var c = target[i], cls = i < typed.length ? (typed[i] === c ? 'ok' : 'bad') : (i === typed.length ? 'cur' : '');
        html += '<span class="' + cls + '">' + (c === ' ' ? '&nbsp;' : esc(c)) + '</span>';
      }
      $('#ty-text').innerHTML = html;
      var cur = $('#ty-text .cur'); if(cur){ var top = cur.offsetTop; $('#ty-text').scrollTop = Math.max(0, top - 40); }
    }
    function stats(){
      var typed = $('#ty-input').value, ok = 0;
      for(var i = 0; i < typed.length; i++) if(typed[i] === target[i]) ok++;
      var mins = Math.max((Date.now() - startT) / 60000, .0001);
      return {wpm: Math.round(ok / 5 / mins), raw: Math.round(typed.length / 5 / mins), acc: typed.length ? Math.round(ok / typed.length * 100) : 100, chars: typed.length, wrong: typed.length - ok};
    }
    function tick(){
      var left = Math.max(0, secs - (Date.now() - startT) / 1000), s = stats();
      $('#ty-left').textContent = Math.ceil(left) + 's'; $('#ty-wpm').textContent = 'WPM ' + s.wpm; $('#ty-acc').textContent = 'ACC ' + s.acc + '%';
      if(left <= 0) finish();
    }
    function finish(){
      if(done) return; done = true; clearInterval(timer); timer = null;
      var s = stats(); $('#ty-input').disabled = true;
      var best = lsGet(bestKey(), 0), newBest = s.wpm > best; if(newBest){ lsSet(bestKey(), s.wpm); $('#ty-best').textContent = 'BEST ' + s.wpm; }
      $('#ty-result').hidden = false;
      $('#ty-result').innerHTML = '<div class="result-big">' + s.wpm + ' WPM</div><div class="result-sub">' + s.acc + '% accuracy · ' + s.raw + ' raw WPM · ' + s.wrong + ' mistakes · ' + secs + ' seconds' + (newBest ? ' · new best!' : '') + '</div>'+
        '<div class="tool-row"><button class="game-btn" id="ty-again">Try again</button></div>';
      hist.add({wpm: s.wpm, acc: s.acc, secs: secs});
    }
    function reset(){
      clearInterval(timer); timer = null; done = false; startT = 0; secs = +$('#ty-time').value;
      target = gen(Math.max(60, secs * 3)); $('#ty-input').value = ''; $('#ty-input').disabled = false;
      $('#ty-result').hidden = true; $('#ty-left').textContent = secs + 's'; $('#ty-wpm').textContent = 'WPM 0'; $('#ty-acc').textContent = 'ACC 100%';
      $('#ty-best').textContent = 'BEST ' + lsGet(bestKey(), 0); $('#ty-msg').textContent = 'Click the text and start typing. The clock starts on your first key.';
      render(); $('#ty-input').focus({preventScroll: true});
    }
    $('#ty-input').addEventListener('input', function(){
      if(done) return;
      if(!startT){ startT = Date.now(); timer = setInterval(tick, 100); $('#ty-msg').textContent = 'Go!'; }
      if(this.value.length >= target.length - 20) target += ' ' + gen(40);
      render(); tick();
    });
    $('#ty-input').addEventListener('keydown', function(e){ if(e.key === 'Escape'){ e.preventDefault(); reset(); } });
    $('#ty-box').addEventListener('click', function(){ $('#ty-input').focus(); });
    body.addEventListener('click', function(e){ if(e.target.id === 'ty-again') reset(); });
    $('#ty-new').addEventListener('click', reset);
    $('#ty-time').addEventListener('change', reset); $('#ty-punct').addEventListener('change', reset);
    onUnmount(body, function(){ clearInterval(timer); });
    hist.mount(body, {title: 'Past runs', format: function(e){ return {main: e.wpm + ' WPM · ' + e.acc + '%', sub: e.secs + ' seconds'}; }});
    reset();
  });
}
PLAYABLES['typing-test'] = mountTypingTest;

/* ==================================================================
   tools / image-editor
   ================================================================== */
function mountImageEditor(container){
  mountEmbed(container, 'TOOL / IMAGE EDITOR', function(body){
    body.innerHTML =
      '<input type="file" id="ie-file" accept="image/*,.heic,.heif,.avif,.ico,.bmp,.tif,.tiff,.svg,.gif,.webp,.jfif">'+
      '<div class="ie-layout"><div class="ie-stage"><canvas id="ie-canvas"></canvas><p class="hint" id="ie-info">Choose an image to start.</p></div>'+
      '<div class="ie-panel">'+
        '<div class="tool-row"><button class="game-btn secondary" data-op="rl">⟲ Rotate</button><button class="game-btn secondary" data-op="rr">⟳ Rotate</button><button class="game-btn secondary" data-op="fh">⇋ Flip</button><button class="game-btn secondary" data-op="fv">⇅ Flip</button></div>'+
        ['brightness:Brightness:-100:100:0','contrast:Contrast:-100:100:0','saturation:Saturation:-100:100:0','blur:Blur:0:12:0'].map(function(a){ a = a.split(':'); return '<div class="field"><label for="ie-'+a[0]+'">'+a[1]+' <span id="ie-'+a[0]+'-v">'+a[4]+'</span></label><input id="ie-'+a[0]+'" type="range" min="'+a[2]+'" max="'+a[3]+'" value="'+a[4]+'"></div>'; }).join('')+
        '<div class="tool-row"><label><input type="checkbox" id="ie-gray"> Greyscale</label><label><input type="checkbox" id="ie-sepia"> Sepia</label><label><input type="checkbox" id="ie-invert"> Invert</label></div>'+
        '<div class="field"><span class="field-label">Crop (% removed from each side)</span><div class="tool-grid two">'+['top:Top','bottom:Bottom','left:Left','right:Right'].map(function(a){ a = a.split(':'); return '<div class="field"><label for="ie-c'+a[0]+'">'+a[1]+' <span id="ie-c'+a[0]+'-v">0</span></label><input id="ie-c'+a[0]+'" type="range" min="0" max="45" value="0"></div>'; }).join('')+'</div></div>'+
        '<div class="tool-row"><select id="ie-fmt"><option value="image/png">PNG</option><option value="image/jpeg">JPEG</option><option value="image/webp">WebP</option></select>'+
          '<button class="game-btn" id="ie-save" disabled>Download</button><button class="game-btn secondary" id="ie-reset">Reset edits</button></div>'+
      '</div></div>';
    var $ = function(s){ return body.querySelector(s); };
    var im = null, name = 'image', rot = 0, fh = false, fv = false, canBlur = (function(){ try { return 'filter' in document.createElement('canvas').getContext('2d'); } catch(e){ return false; } })();
    if(!canBlur) $('#ie-blur').closest('.field').hidden = true;
    function val(id){ return +$('#ie-' + id).value; }
    function render(cv, maxDim){
      var cl = val('cleft') / 100, cr = val('cright') / 100, ct = val('ctop') / 100, cb = val('cbottom') / 100;
      var sx = im.naturalWidth * cl, sy = im.naturalHeight * ct, sw = Math.max(2, im.naturalWidth * (1 - cl - cr)), sh = Math.max(2, im.naturalHeight * (1 - ct - cb));
      var swap = rot % 2 === 1, ow = swap ? sh : sw, oh = swap ? sw : sh, k = maxDim ? Math.min(1, maxDim / Math.max(ow, oh)) : 1;
      cv.width = Math.max(1, Math.round(ow * k)); cv.height = Math.max(1, Math.round(oh * k));
      var c = cv.getContext('2d', {willReadFrequently: true});
      c.save(); c.translate(cv.width / 2, cv.height / 2); c.rotate(rot * Math.PI / 2); c.scale(fh ? -1 : 1, fv ? -1 : 1);
      if(canBlur && val('blur')) c.filter = 'blur(' + (val('blur') * k) + 'px)';
      c.drawImage(im, sx, sy, sw, sh, -sw * k / 2, -sh * k / 2, sw * k, sh * k); c.restore();
      var b = val('brightness') * 2.55, ct2 = val('contrast') / 100 * 255, f = 259 * (ct2 + 255) / (255 * (259 - ct2)), sat = 1 + val('saturation') / 100;
      var gray = $('#ie-gray').checked, sepia = $('#ie-sepia').checked, inv = $('#ie-invert').checked;
      if(b || ct2 || sat !== 1 || gray || sepia || inv){
        var d = c.getImageData(0, 0, cv.width, cv.height), p = d.data;
        for(var i = 0; i < p.length; i += 4){
          var r = p[i], g = p[i + 1], bl = p[i + 2];
          r = f * (r + b - 128) + 128; g = f * (g + b - 128) + 128; bl = f * (bl + b - 128) + 128;
          var l = .299 * r + .587 * g + .114 * bl; r = l + (r - l) * sat; g = l + (g - l) * sat; bl = l + (bl - l) * sat;
          if(gray){ r = g = bl = .299 * r + .587 * g + .114 * bl; }
          if(sepia){ var tr = .393 * r + .769 * g + .189 * bl, tg = .349 * r + .686 * g + .168 * bl, tb = .272 * r + .534 * g + .131 * bl; r = tr; g = tg; bl = tb; }
          if(inv){ r = 255 - r; g = 255 - g; bl = 255 - bl; }
          p[i] = r < 0 ? 0 : r > 255 ? 255 : r; p[i + 1] = g < 0 ? 0 : g > 255 ? 255 : g; p[i + 2] = bl < 0 ? 0 : bl > 255 ? 255 : bl;
        }
        c.putImageData(d, 0, 0);
      }
    }
    function update(){
      ['brightness', 'contrast', 'saturation', 'blur', 'ctop', 'cbottom', 'cleft', 'cright'].forEach(function(k){ $('#ie-' + k + '-v').textContent = $('#ie-' + k).value; });
      if(!im) return;
      render($('#ie-canvas'), 1000);
      var sw = Math.round(im.naturalWidth * (1 - val('cleft') / 100 - val('cright') / 100)), sh = Math.round(im.naturalHeight * (1 - val('ctop') / 100 - val('cbottom') / 100));
      $('#ie-info').textContent = (rot % 2 ? sh + ' × ' + sw : sw + ' × ' + sh) + ' px output';
    }
    $('#ie-file').addEventListener('change', function(){
      var f = this.files && this.files[0]; if(!f) return;
      var url = URL.createObjectURL(f), img = new Image();
      img.onload = function(){ im = img; name = f.name.replace(/\.[^.]+$/, ''); $('#ie-save').disabled = false; reset(); };
      img.onerror = function(){ notify('This browser can’t read that image format', 'err'); URL.revokeObjectURL(url); };
      img.src = url;
    });
    function reset(){
      rot = 0; fh = fv = false;
      body.querySelectorAll('.ie-panel input[type=range]').forEach(function(r){ r.value = r.id.indexOf('ie-c') === 0 ? 0 : 0; });
      ['gray', 'sepia', 'invert'].forEach(function(k){ $('#ie-' + k).checked = false; });
      update();
    }
    $('.ie-panel').addEventListener('input', update); $('.ie-panel').addEventListener('change', update);
    $('.ie-panel').addEventListener('click', function(e){
      var b = e.target.closest('[data-op]'); if(!b || !im) return;
      var op = b.getAttribute('data-op'); if(op === 'rl') rot = (rot + 3) % 4; else if(op === 'rr') rot = (rot + 1) % 4; else if(op === 'fh') fh = !fh; else fv = !fv; update();
    });
    $('#ie-reset').addEventListener('click', reset);
    $('#ie-save').addEventListener('click', function(){
      if(!im) return; var cv = document.createElement('canvas'), t = $('#ie-fmt').value; render(cv, 0);
      var ext = t === 'image/jpeg' ? 'jpg' : t === 'image/webp' ? 'webp' : 'png';
      cv.toBlob(function(b){ saveBlob(name + '-edited.' + ext, b); }, t, .92);
    });
  });
}
PLAYABLES['image-editor'] = mountImageEditor;


/* ==================================================================
   tools / speed-test
   Browser-only throughput check using Cloudflare's public speed-test endpoints.
   ================================================================== */
function mountSpeedTest(container){
  mountEmbed(container, 'TOOL / INTERNET SPEED TEST', function(body){
    body.innerHTML = '<div class="st-wrap"><div class="st-metrics"><div class="st-metric"><span>LATENCY</span><b id="st-ping">—</b><small>ms</small></div><div class="st-metric"><span>DOWNLOAD</span><b id="st-down">—</b><small>Mbps</small></div><div class="st-metric"><span>UPLOAD</span><b id="st-up">—</b><small>Mbps</small></div></div><div class="tool-row"><button class="game-btn" id="st-run">Run speed test</button></div><p class="tool-msg" id="st-msg">Uses a small amount of data. Results vary with Wi-Fi, other traffic and your connection.</p></div>';
    var $ = function(s){return body.querySelector(s);}, running=false;
    async function timedFetch(url, opts, timeout){
      var ctl = typeof AbortController === 'function' ? new AbortController() : null;
      var timer = setTimeout(function(){if(ctl)ctl.abort();}, timeout || 15000);
      var start = performance.now();
      try { var r = await fetch(url, Object.assign({}, opts || {}, ctl ? {signal:ctl.signal} : {})); if(!r.ok) throw new Error('HTTP '+r.status); return {response:r,ms:performance.now()-start}; }
      finally { clearTimeout(timer); }
    }
    $('#st-run').addEventListener('click', async function(){
      if(running)return; running=true; $('#st-run').disabled=true;
      ['#st-ping','#st-down','#st-up'].forEach(function(s){$(s).textContent='…';});
      $('#st-msg').textContent='Checking latency…';
      try{
        var pings=[];
        for(var i=0;i<3;i++){var p=await timedFetch('https://speed.cloudflare.com/__down?bytes=1000&cache='+Date.now()+'-'+i, {cache:'no-store'}, 10000); await p.response.arrayBuffer(); pings.push(p.ms);}
        pings.sort(function(a,b){return a-b;}); $('#st-ping').textContent=Math.round(pings[1]);
        $('#st-msg').textContent='Measuring download…';
        var downBytes=5000000, d=await timedFetch('https://speed.cloudflare.com/__down?bytes='+downBytes+'&cache='+Date.now(), {cache:'no-store'}, 20000);
        var data=await d.response.arrayBuffer(); var down=data.byteLength*8/(d.ms/1000)/1000000;
        $('#st-down').textContent=down.toFixed(1);
        $('#st-msg').textContent='Measuring upload…';
        var upBytes=1000000, payload=new Uint8Array(upBytes);
        if(window.crypto && crypto.getRandomValues){ for(var off=0;off<payload.length;off+=65536) crypto.getRandomValues(payload.subarray(off,Math.min(off+65536,payload.length))); }
        var u=await timedFetch('https://speed.cloudflare.com/__up', {method:'POST',body:payload,headers:{'Content-Type':'application/octet-stream'},cache:'no-store'}, 20000);
        await u.response.arrayBuffer(); var up=upBytes*8/(u.ms/1000)/1000000;
        $('#st-up').textContent=up.toFixed(1);
        $('#st-msg').textContent='Test complete. Approximate browser measurements, not a certified ISP speed test.';
      }catch(e){
        ['#st-ping','#st-down','#st-up'].forEach(function(s){if($(s).textContent==='…')$(s).textContent='—';});
        $('#st-msg').textContent='The test could not reach the measurement service. Check your connection, disable blocking extensions for this page, or try again later.';
      }finally{running=false;$('#st-run').disabled=false;}
    });
  });
}
PLAYABLES['speed-test'] = mountSpeedTest;

/* ==================================================================
   tools / qr-scanner
   Camera scanning when supported, plus local image upload fallback.
   ================================================================== */
function mountQrScanner(container){
  mountEmbed(container, 'TOOL / QR CODE SCANNER', function(body){
    body.innerHTML = '<div class="qrscan-layout"><div><div class="tool-row"><button type="button" class="game-btn" id="qr-camera">Start camera</button><button type="button" class="game-btn secondary" id="qr-stop" disabled>Stop camera</button></div><video id="qr-video" playsinline muted hidden></video><canvas id="qr-canvas" hidden></canvas><p class="tool-msg" id="qr-status">Use the camera or choose a picture containing a QR code.</p></div><div><label class="field"><span class="field-label">Scan an image</span><input type="file" id="qr-file" accept="image/*"></label><label class="field"><span class="field-label">Decoded content</span><textarea id="qr-result" class="tool-textarea" rows="4" readonly placeholder="Scanned text or link appears here"></textarea></label><div class="tool-row"><button type="button" class="game-btn secondary" id="qr-copy" disabled>Copy result</button></div></div></div>';
    var $=function(s){return body.querySelector(s);}, stream=null, scanTimer=null, detector=null, useJsQr=false, fallbackLoading=null;
    function stop(){if(scanTimer){clearTimeout(scanTimer);scanTimer=null;}if(stream){stream.getTracks().forEach(function(t){t.stop();});stream=null;}$('#qr-video').srcObject=null;$('#qr-video').hidden=true;$('#qr-stop').disabled=true;$('#qr-camera').disabled=false;}
    function result(value){if(!value)return;$('#qr-result').value=value;$('#qr-copy').disabled=false;$('#qr-status').textContent='QR code detected.';}
    function ensureScanner(){
      if('BarcodeDetector' in window){try{detector=new BarcodeDetector({formats:['qr_code']});return Promise.resolve();}catch(e){}}
      useJsQr=true;
      if(window.jsQR)return Promise.resolve();
      if(fallbackLoading)return fallbackLoading;
      fallbackLoading=new Promise(function(resolve,reject){var s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';s.onload=function(){window.jsQR?resolve():reject(new Error('QR fallback library did not load.'));};s.onerror=function(){reject(new Error('Native QR detection is unavailable and the fallback library could not load. Check your connection.'));};document.head.appendChild(s);});
      return fallbackLoading;
    }
    async function decodeImageSource(source,w,h){
      if(detector){var found=await detector.detect(source);return found&&found.length?found[0].rawValue:null;}
      var canvas=$('#qr-canvas'),ctx=canvas.getContext('2d');canvas.width=w;canvas.height=h;ctx.drawImage(source,0,0,w,h);
      var pixels=ctx.getImageData(0,0,w,h);var hit=window.jsQR(pixels.data,w,h,{inversionAttempts:'attemptBoth'});return hit?hit.data:null;
    }
    async function scanVideo(){
      if(!stream)return;
      try{var video=$('#qr-video'),value=await decodeImageSource(video,video.videoWidth,video.videoHeight);if(value){result(value);stop();return;}}
      catch(e){}
      if(stream)scanTimer=setTimeout(scanVideo,250);
    }
    $('#qr-camera').addEventListener('click',async function(){
      try{
        await ensureScanner();
        if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia)throw new Error('Camera access is unavailable. Open this page on HTTPS or localhost, or upload an image instead.');
        stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});
        $('#qr-video').srcObject=stream;$('#qr-video').hidden=false;$('#qr-video').style.width='100%';$('#qr-video').style.maxWidth='480px';
        await $('#qr-video').play();$('#qr-stop').disabled=false;$('#qr-camera').disabled=true;$('#qr-status').textContent='Point the camera at a QR code…';scanVideo();
      }catch(e){stop();$('#qr-status').textContent=e.message||'Could not start camera. Upload an image containing the QR code instead.';}
    });
    $('#qr-stop').addEventListener('click',stop);
    $('#qr-file').addEventListener('change',async function(){
      var f=this.files&&this.files[0];if(!f)return;
      try{
        await ensureScanner();
        var bitmap=await createImageBitmap(f);
        var value=await decodeImageSource(bitmap,bitmap.width,bitmap.height);bitmap.close&&bitmap.close();
        if(value)result(value);else $('#qr-status').textContent='No QR code found in that image.';
      }catch(e){$('#qr-status').textContent=e.message||'Could not decode this image in the current browser.';}
      this.value='';
    });
    $('#qr-copy').addEventListener('click',function(){copyText($('#qr-result').value);});
    onUnmount(body,function(){stop();});
  });
}
PLAYABLES['qr-scanner'] = mountQrScanner;

/* ==================================================================
   tools / pdf-tools
   PDF merge and page-range extraction using pdf-lib in the browser.
   ================================================================== */
function mountPdfTools(container){
  mountEmbed(container, 'TOOL / PDF MERGE & SPLIT', function(body){
    body.innerHTML = '<p class="tool-msg">Files are processed in your browser. PDF features load the open-source pdf-lib library from a CDN when first used.</p><div class="tool-row"><label class="field"><span class="field-label">Mode</span><select id="pdf-mode"><option value="merge">Merge PDFs</option><option value="split">Extract page range</option></select></label><label class="field"><span class="field-label">PDF files</span><input type="file" id="pdf-files" accept="application/pdf,.pdf" multiple></label></div><div id="pdf-file-list" class="tool-output">Choose one or more PDF files.</div><div class="tool-row" id="pdf-range-wrap" hidden><label class="field"><span class="field-label">Pages (e.g. 1-3, 5, 8-10)</span><input type="text" id="pdf-range" placeholder="1-3, 5"></label></div><div class="tool-row"><button type="button" class="game-btn" id="pdf-run">Create PDF</button></div><p class="tool-msg" id="pdf-status" role="status"></p>';
    var $=function(s){return body.querySelector(s);}, files=[];
    $('#pdf-mode').addEventListener('change',function(){$('#pdf-range-wrap').hidden=this.value!=='split';});
    $('#pdf-files').addEventListener('change',function(){files=Array.from(this.files||[]);$('#pdf-file-list').textContent=files.length?files.map(function(f,i){return (i+1)+'. '+f.name+' ('+Math.round(f.size/1024)+' KB)';}).join('\n'):'Choose one or more PDF files.';});
    function loadLib(){if(window.PDFLib)return Promise.resolve(window.PDFLib);return new Promise(function(resolve,reject){var s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js';s.onload=function(){window.PDFLib?resolve(window.PDFLib):reject(new Error('PDF library did not load.'));};s.onerror=function(){reject(new Error('Could not load the PDF library. Check your connection or content blocker.'));};document.head.appendChild(s);});}
    $('#pdf-run').addEventListener('click',async function(){
      if(!files.length){$('#pdf-status').textContent='Choose at least one PDF first.';return;}
      var mode=$('#pdf-mode').value;$('#pdf-run').disabled=true;$('#pdf-status').textContent='Processing…';
      try{
        var lib=await loadLib(), out=await lib.PDFDocument.create();
        if(mode==='merge'){
          for(var f of files){var src=await lib.PDFDocument.load(await f.arrayBuffer());var pages=await out.copyPages(src,src.getPageIndices());pages.forEach(function(pg){out.addPage(pg);});}
          if(!out.getPageCount())throw new Error('No pages were found in the selected PDFs.');
        }else{
          if(files.length!==1)throw new Error('Choose exactly one PDF when extracting a page range.');
          var src2=await lib.PDFDocument.load(await files[0].arrayBuffer()), count=src2.getPageCount(), indexes=new Set(), parts=$('#pdf-range').value.split(',');
          parts.forEach(function(part){var m=part.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);if(!m)throw new Error('Use page numbers and ranges such as 1-3, 5.');var a=Number(m[1]),b=Number(m[2]||m[1]);if(a<1||b<a||b>count)throw new Error('Page range is outside this PDF (1–'+count+').');for(var n=a;n<=b;n++)indexes.add(n-1);});
          var selected=Array.from(indexes).sort(function(a,b){return a-b;});if(!selected.length)throw new Error('Enter at least one page.');
          (await out.copyPages(src2,selected)).forEach(function(pg){out.addPage(pg);});
        }
        var bytes=await out.save(), base=mode==='merge'?'merged.pdf':(files[0].name.replace(/\.pdf$/i,'')+'-pages.pdf');
        saveBlob(base,new Blob([bytes],{type:'application/pdf'}));$('#pdf-status').textContent='Created '+base+' ('+out.getPageCount()+' pages).';
      }catch(e){$('#pdf-status').textContent=e.message||'Could not process these PDFs.';}
      finally{$('#pdf-run').disabled=false;}
    });
  });
}
PLAYABLES['pdf-tools'] = mountPdfTools;

/* ==================================================================
   tools / text-to-image
   Render text at exact pixel dimensions to a downloadable PNG.
   ================================================================== */
function mountTextToImage(container){
  mountEmbed(container, 'TOOL / TEXT TO IMAGE SIZE', function(body){
    body.innerHTML = '<div class="tl-split"><div class="tl-main"><label class="field"><span class="field-label">Text</span><textarea id="ti-text" class="tool-textarea" rows="5" placeholder="Type or paste text to render…">Velocity Systems</textarea></label><div class="tool-row"><label class="field"><span class="field-label">Width (px)</span><input type="number" id="ti-w" min="1" max="6000" value="1200"></label><label class="field"><span class="field-label">Height (px)</span><input type="number" id="ti-h" min="1" max="6000" value="630"></label></div><div class="tool-row"><label class="field"><span class="field-label">Font size (px)</span><input type="number" id="ti-size" min="1" max="500" value="64"></label><label class="field"><span class="field-label">Alignment</span><select id="ti-align"><option value="center">Center</option><option value="left">Left</option><option value="right">Right</option></select></label></div><div class="tool-row"><label class="field"><span class="field-label">Text colour</span><input type="color" id="ti-color" value="#ffffff"></label><label class="field"><span class="field-label">Background</span><input type="color" id="ti-bg" value="#17191f"></label></div><label class="field"><span class="field-label">Font family</span><select id="ti-font"><option value="Arial">Arial</option><option value="Georgia">Georgia</option><option value="monospace">Monospace</option><option value="sans-serif">Sans serif</option></select></label><div class="tool-row"><button type="button" class="game-btn" id="ti-download">Download PNG</button></div></div><div class="tl-side"><h3 class="tl-h">Preview</h3><canvas id="ti-canvas" style="width:100%;height:auto;border:1px solid var(--line);border-radius:var(--rad)"></canvas><p class="tool-msg" id="ti-meta"></p></div></div>';
    var $=function(s){return body.querySelector(s);}, canvas=$('#ti-canvas'),ctx=canvas.getContext('2d');
    function draw(){
      var w=Math.max(1,Math.min(6000,parseInt($('#ti-w').value,10)||1)),h=Math.max(1,Math.min(6000,parseInt($('#ti-h').value,10)||1)),size=Math.max(1,Math.min(500,parseInt($('#ti-size').value,10)||1));
      canvas.width=w;canvas.height=h;ctx.fillStyle=$('#ti-bg').value;ctx.fillRect(0,0,w,h);ctx.fillStyle=$('#ti-color').value;ctx.font=size+'px "'+$('#ti-font').value+'"';ctx.textBaseline='middle';ctx.textAlign=$('#ti-align').value;
      var x=ctx.textAlign==='left'?Math.min(w-1,Math.round(size*.35)):ctx.textAlign==='right'?Math.max(1,w-Math.round(size*.35)):w/2;
      var lines=$('#ti-text').value.split('\n'),lineH=size*1.25,total=lineH*lines.length,y=(h-total)/2+lineH/2;
      lines.forEach(function(line,i){ctx.fillText(line,x,y+i*lineH,Math.max(1,w-size*.7));});
      $('#ti-meta').textContent=w+' × '+h+' px · PNG';
    }
    ['#ti-text','#ti-w','#ti-h','#ti-size','#ti-align','#ti-color','#ti-bg','#ti-font'].forEach(function(s){$(s).addEventListener('input',draw);$(s).addEventListener('change',draw);});
    $('#ti-download').addEventListener('click',function(){canvas.toBlob(function(b){if(b)saveBlob('text-image.png',b);},'image/png');});
    draw();
  });
}
PLAYABLES['text-to-image'] = mountTextToImage;

/* ==================================================================
   tools / URL encoder and decoder
   ================================================================== */
function mountUrlEncoder(container){
  mountEmbed(container, 'TOOL / URL ENCODER & DECODER', function(body){
    body.innerHTML='<div class="tool-row"><label class="field"><span class="field-label">Operation</span><select id="ue-mode"><option value="component-encode">Encode component</option><option value="component-decode">Decode component</option><option value="url-encode">Encode full URL</option><option value="url-decode">Decode full URL</option></select></label></div><div class="tool-grid"><label class="field"><span class="field-label">Input</span><textarea id="ue-in" class="tool-textarea" rows="7" placeholder="Paste a URL or query parameter…"></textarea></label><label class="field"><span class="field-label">Output</span><textarea id="ue-out" class="tool-textarea" rows="7" readonly placeholder="Encoded or decoded result appears here"></textarea></label></div><div class="tool-row"><button type="button" class="game-btn" id="ue-run">Convert</button><button type="button" class="game-btn secondary" id="ue-copy">Copy output</button><button type="button" class="game-btn secondary" id="ue-clear">Clear</button><span class="hint" id="ue-status" aria-live="polite"></span></div><p class="tool-msg">Use <b>Encode component</b> for individual query values. Use <b>Encode full URL</b> when you need to preserve URL separators such as <code>https://</code>, <code>/</code> and <code>&amp;</code>.</p>';
    var $=function(s){return body.querySelector(s);};
    function run(){try{var v=$('#ue-in').value,m=$('#ue-mode').value;$('#ue-out').value=m==='component-encode'?encodeURIComponent(v):m==='component-decode'?decodeURIComponent(v):m==='url-encode'?encodeURI(v):decodeURI(v);$('#ue-status').textContent='Converted';}catch(e){$('#ue-out').value='';$('#ue-status').textContent='Invalid encoded input: '+(e.message||'decode failed');}}
    $('#ue-run').addEventListener('click',run);$('#ue-in').addEventListener('input',run);$('#ue-mode').addEventListener('change',run);
    $('#ue-copy').addEventListener('click',function(){copyText($('#ue-out').value);$('#ue-status').textContent='Copied output';});
    $('#ue-clear').addEventListener('click',function(){$('#ue-in').value='';$('#ue-out').value='';$('#ue-status').textContent='';$('#ue-in').focus();});
  });
}
PLAYABLES['url-encoder'] = mountUrlEncoder;

/* ==================================================================
   tools / file checksum verifier
   ================================================================== */
function mountChecksumVerifier(container){
  mountEmbed(container, 'TOOL / FILE CHECKSUM VERIFIER', function(body){
    body.innerHTML='<div class="field"><span class="field-label">Choose file</span><input id="cv-file" type="file" data-nopersist></div><div class="tool-row"><label class="field"><span class="field-label">Algorithm</span><select id="cv-algo"><option>SHA-256</option><option>SHA-384</option><option>SHA-512</option><option>SHA-1</option></select></label></div><label class="field"><span class="field-label">Expected checksum (optional)</span><input id="cv-expected" spellcheck="false" autocomplete="off" placeholder="Paste a checksum to verify against"></label><div class="tool-row"><button type="button" class="game-btn" id="cv-run">Calculate checksum</button><button type="button" class="game-btn secondary" id="cv-copy" disabled>Copy checksum</button></div><div class="tool-output" id="cv-out" aria-live="polite">Select a file to calculate its checksum.</div><p class="tool-msg">The file is read locally in your browser. SHA-1 is provided for compatibility, not for security-sensitive use. Large files may use significant memory.</p>';
    var $=function(s){return body.querySelector(s);}, digest='';
    $('#cv-run').addEventListener('click',async function(){var f=$('#cv-file').files[0];if(!f){$('#cv-out').textContent='Choose a file first.';return;}if(!window.crypto||!crypto.subtle){$('#cv-out').textContent='Web Crypto is unavailable. Open this page over HTTPS or localhost and try again.';return;}var btn=$('#cv-run');btn.disabled=true;btn.textContent='Calculating…';$('#cv-copy').disabled=true;try{var buf=await f.arrayBuffer(),hash=await crypto.subtle.digest($('#cv-algo').value,buf);digest=Array.from(new Uint8Array(hash)).map(function(b){return b.toString(16).padStart(2,'0');}).join('');var expected=$('#cv-expected').value.trim().replace(/\s+/g,'').toLowerCase();var verdict=expected?(expected===digest?'MATCH — checksum verified':'NO MATCH — checksums differ'):'No expected checksum supplied.';$('#cv-out').innerHTML='<div class="tool-msg">'+esc(f.name)+' · '+fmtSize(f.size)+' · '+esc($('#cv-algo').value)+'</div><code class="checksum-value">'+digest+'</code><div class="checksum-verdict '+(expected?(expected===digest?'ok':'bad'):'')+'">'+esc(verdict)+'</div>';$('#cv-copy').disabled=false;}catch(e){$('#cv-out').textContent='Could not read or hash this file: '+(e.message||'unknown error');}finally{btn.disabled=false;btn.textContent='Calculate checksum';}});
    $('#cv-copy').addEventListener('click',function(){if(digest)copyText(digest);});
  });
}
PLAYABLES['checksum-verifier'] = mountChecksumVerifier;

/* ==================================================================
   tools / batch filename cleaner
   ================================================================== */
function mountFilenameCleaner(container){
  mountEmbed(container, 'TOOL / BATCH FILENAME CLEANER', function(body){
    body.innerHTML='<div class="field"><span class="field-label">Choose files</span><input id="fn-files" type="file" multiple data-nopersist></div><div class="tool-grid"><label class="field"><span class="field-label">Replace spaces with</span><select id="fn-spaces"><option value="-">Hyphen (-)</option><option value="_">Underscore (_)</option><option value="">Remove spaces</option><option value=" ">Keep spaces</option></select></label><label class="field"><span class="field-label">Letter case</span><select id="fn-case"><option value="keep">Keep original</option><option value="lower">lowercase</option><option value="upper">UPPERCASE</option></select></label><label class="field"><span class="field-label">Prefix</span><input id="fn-prefix" placeholder="e.g. project-"></label><label class="field"><span class="field-label">Suffix (before extension)</span><input id="fn-suffix" placeholder="e.g. -final"></label></div><div class="tool-row"><label><input type="checkbox" id="fn-safe" checked> Remove unsupported filename characters</label><label><input type="checkbox" id="fn-number"> Add sequence numbers</label></div><div class="tool-row"><button type="button" class="game-btn" id="fn-preview">Preview names</button><button type="button" class="game-btn secondary" id="fn-download" disabled>Download renamed files (.zip)</button></div><div id="fn-status" class="tool-msg">Choose files to preview the new names. Files stay on your device.</div><div id="fn-list" class="gd-list"></div>';
    var $=function(s){return body.querySelector(s);}, selected=[];
    function cleanedName(name,i){var dot=name.lastIndexOf('.'),base=dot>0?name.slice(0,dot):name,ext=dot>0?name.slice(dot):'';var sp=$('#fn-spaces').value;base=base.replace(/\s+/g,sp);if($('#fn-safe').checked)base=base.replace(/[<>:"/\\|?*\x00-\x1F]/g,'').replace(/[. ]+$/g,'').replace(/^\.+/g,'');var cs=$('#fn-case').value;if(cs==='lower'){base=base.toLowerCase();ext=ext.toLowerCase();}if(cs==='upper'){base=base.toUpperCase();ext=ext.toUpperCase();}base=$('#fn-prefix').value+base+$('#fn-suffix').value;if($('#fn-number').checked)base=String(i+1).padStart(2,'0')+'-'+base;if(!base)base='file-'+(i+1);return base+ext;}
    function preview(){selected=Array.from($('#fn-files').files||[]);if(!selected.length){$('#fn-status').textContent='Choose at least one file first.';$('#fn-list').innerHTML='';$('#fn-download').disabled=true;return;}var seen={};var entries=selected.map(function(f,i){var name=cleanedName(f.name,i),unique=name,n=2;while(seen[unique.toLowerCase()]){var dot=name.lastIndexOf('.');unique=(dot>0?name.slice(0,dot):name)+'-'+n+(dot>0?name.slice(dot):'');n++;}seen[unique.toLowerCase()]=true;return {file:f,name:unique};});selected=entries;$('#fn-list').innerHTML=entries.map(function(it){return '<div class="gd-row"><div class="gd-main"><div class="gd-title">'+esc(it.name)+'</div><div class="gd-sub">'+esc(it.file.name)+' · '+fmtSize(it.file.size)+'</div></div></div>';}).join('');$('#fn-status').textContent=entries.length+' file'+(entries.length===1?'':'s')+' ready. Duplicate output names have been made unique.';$('#fn-download').disabled=false;}
    $('#fn-preview').addEventListener('click',preview);['#fn-spaces','#fn-case','#fn-prefix','#fn-suffix','#fn-safe','#fn-number'].forEach(function(sel){$(sel).addEventListener('change',function(){if($('#fn-files').files.length)preview();});});$('#fn-files').addEventListener('change',preview);
    $('#fn-download').addEventListener('click',async function(){if(!selected.length)return;var btn=$('#fn-download');btn.disabled=true;btn.textContent='Preparing ZIP…';try{var files=[];for(var i=0;i<selected.length;i++){files.push({name:selected[i].name,data:new Uint8Array(await selected[i].file.arrayBuffer())});}saveBlob('cleaned-filenames.zip',makeZip(files));$('#fn-status').textContent='ZIP ready with '+files.length+' renamed files.';}catch(e){$('#fn-status').textContent='Could not package files: '+(e.message||'unknown error');}finally{btn.disabled=false;btn.textContent='Download renamed files (.zip)';}});
  });
}
PLAYABLES['filename-cleaner'] = mountFilenameCleaner;

/* ==================================================================
   tools / image metadata viewer and remover
   ================================================================== */
function mountImageMetadata(container){
  mountEmbed(container, 'TOOL / IMAGE METADATA', function(body){
    body.innerHTML='<div class="field"><span class="field-label">Choose an image</span><input type="file" id="im-file" accept="image/*" data-nopersist></div><div class="tool-row"><label class="field"><span class="field-label">Clean export format</span><select id="im-format"><option value="image/png">PNG (lossless)</option><option value="image/jpeg">JPEG</option><option value="image/webp">WebP</option></select></label><label class="field"><span class="field-label">Quality (JPEG / WebP)</span><input type="range" id="im-quality" min="40" max="100" value="92"><span id="im-qv" class="hint">92%</span></label></div><div class="tool-row"><button type="button" class="game-btn" id="im-inspect">Inspect image</button><button type="button" class="game-btn secondary" id="im-clean" disabled>Export without embedded metadata</button></div><div id="im-status" class="tool-output" aria-live="polite">Choose an image to inspect its dimensions and basic file metadata.</div><canvas id="im-canvas" hidden></canvas><p class="tool-msg">Everything runs locally. Clean export redraws the image through a canvas, which strips embedded EXIF/IPTC/XMP metadata supported by the browser decoder. This tool reports basic file metadata, not every camera-specific EXIF field.</p>';
    var $=function(s){return body.querySelector(s);}, file=null, image=null;
    $('#im-quality').addEventListener('input',function(){$('#im-qv').textContent=this.value+'%';});
    function load(){file=$('#im-file').files[0]||null;image=null;$('#im-clean').disabled=true;if(!file){$('#im-status').textContent='Choose an image first.';return;}if(!file.type.startsWith('image/')){$('#im-status').textContent='That file is not recognised as an image.';return;}var url=URL.createObjectURL(file),img=new Image();img.onload=function(){image=img;$('#im-clean').disabled=false;$('#im-status').innerHTML='<dl class="metadata-list"><dt>File name</dt><dd>'+esc(file.name)+'</dd><dt>Format</dt><dd>'+esc(file.type||'Unknown')+'</dd><dt>File size</dt><dd>'+esc(fmtSize(file.size))+'</dd><dt>Dimensions</dt><dd>'+img.naturalWidth+' × '+img.naturalHeight+' px</dd><dt>Last modified</dt><dd>'+esc(file.lastModified?new Date(file.lastModified).toLocaleString():'Not available')+'</dd><dt>Embedded metadata</dt><dd>May be present; clean export removes supported embedded metadata</dd></dl>';URL.revokeObjectURL(url);};img.onerror=function(){URL.revokeObjectURL(url);$('#im-status').textContent='The browser could not decode this image format.';};img.src=url;}
    $('#im-file').addEventListener('change',load);$('#im-inspect').addEventListener('click',load);
    $('#im-clean').addEventListener('click',function(){if(!image||!file)return;var canvas=$('#im-canvas'),ctx=canvas.getContext('2d'),type=$('#im-format').value;canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;if(type==='image/jpeg'){ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);}ctx.drawImage(image,0,0);canvas.toBlob(function(blob){if(!blob){$('#im-status').textContent='Could not export this image in the selected format.';return;}var ext=type==='image/jpeg'?'jpg':type==='image/webp'?'webp':'png',base=file.name.replace(/\.[^.]+$/,'');saveBlob(base+'-clean.'+ext,blob);$('#im-status').insertAdjacentHTML('beforeend','<p class="tool-msg">Clean copy exported as '+esc(ext.toUpperCase())+'. The original file was not changed.</p>');},type,Number($('#im-quality').value)/100);});
  });
}
PLAYABLES['image-metadata'] = mountImageMetadata;

/* ==================================================================
   tools / network diagnostics
   ================================================================== */
function mountNetworkDiagnostics(container){
  mountEmbed(container, 'TOOL / NETWORK DIAGNOSTICS', function(body){
    body.innerHTML='<div class="tool-row"><label class="field"><span class="field-label">Domain for DNS lookup</span><input id="nd-domain" placeholder="example.com" autocomplete="url" spellcheck="false"></label><button type="button" class="game-btn" id="nd-run">Run checks</button></div><div class="tool-grid" id="nd-cards"><div class="tool-output"><strong>Public IP</strong><p>Not checked</p></div><div class="tool-output"><strong>DNS lookup</strong><p>Not checked</p></div><div class="tool-output"><strong>Connectivity</strong><p>Not checked</p></div></div><p class="tool-msg" id="nd-note" aria-live="polite">Checks use public HTTPS endpoints (ipify for public IP, Cloudflare DNS for lookups and CheapShark for connectivity). A browser cannot perform raw ping/ICMP; latency here is an HTTPS round-trip estimate.</p>';
    var $=function(s){return body.querySelector(s);};
    if(location.protocol==='file:') $('#nd-note').textContent='Opened as file://. Some browser policies block these API requests; use the hosted HTTPS page or localhost. Checks contact ipify (public IP), Cloudflare DNS (entered domain) and CheapShark (connectivity).';
    function safeDomain(v){v=String(v||'').trim().replace(/^https?:\/\//i,'').split(/[/?#]/)[0];return /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(v)?v:'';}
    function card(title,content,state){return '<div class="tool-output nd-result '+(state||'')+'"><strong>'+esc(title)+'</strong><div>'+content+'</div></div>';}
    async function timed(url,opts){var start=performance.now(),ctl=typeof AbortController==='function'?new AbortController():null,t=setTimeout(function(){if(ctl)ctl.abort();},8000);try{var r=await fetch(url,Object.assign({},opts||{},ctl?{signal:ctl.signal}:{}));if(!r.ok)throw new Error('HTTP '+r.status);return {response:r,ms:Math.round(performance.now()-start)};}finally{clearTimeout(t);}}
    $('#nd-run').addEventListener('click',async function(){var btn=$('#nd-run'),domain=safeDomain($('#nd-domain').value);if($('#nd-domain').value.trim()&&!domain){$('#nd-note').textContent='Enter a valid domain such as example.com.';$('#nd-domain').focus();return;}btn.disabled=true;btn.textContent='Checking…';$('#nd-cards').innerHTML=card('Public IP','Checking…')+card('DNS lookup','Checking…')+card('Connectivity','Checking…');var results=[];
      var jobs=[(async function(){try{var x=await timed('https://api.ipify.org?format=json');var d=await x.response.json();return card('Public IP','<code>'+esc(d.ip||'Unavailable')+'</code><p>'+x.ms+' ms HTTPS response</p>','ok');}catch(e){return card('Public IP','Unavailable. The request may be blocked by a network, extension or browser origin policy.','bad');}})(),
      (async function(){if(!domain)return card('DNS lookup','Enter a domain to run this check.');try{var x=await timed('https://cloudflare-dns.com/dns-query?name='+encodeURIComponent(domain)+'&type=A',{headers:{accept:'application/dns-json'}}),d=await x.response.json(),answers=(d.Answer||[]).filter(function(a){return a.type===1||a.type===5;});if(!answers.length)return card('DNS lookup','No A/alias answer found for '+esc(domain)+'. This can be valid for some domains.','bad');return card('DNS lookup','<p>'+esc(domain)+'</p><ul>'+answers.map(function(a){return '<li><code>'+esc(a.data)+'</code></li>';}).join('')+'</ul><p>'+x.ms+' ms HTTPS response</p>','ok');}catch(e){return card('DNS lookup','Could not query DNS-over-HTTPS. Check the domain, connection or browser restrictions.','bad');}})(),
      (async function(){try{var x=await timed('https://www.cheapshark.com/api/1.0/stores');var d=await x.response.json();return card('Connectivity','CheapShark API reachable · '+(Array.isArray(d)?d.length:0)+' stores returned · '+x.ms+' ms','ok');}catch(e){return card('Connectivity','Could not reach the CheapShark API from this browser. A VPN, DNS filter, extension, file:// origin or network policy may block it.','bad');}})()];
      results=await Promise.all(jobs);$('#nd-cards').innerHTML=results.join('');$('#nd-note').textContent=location.protocol==='file:'?'You opened this page as file://. Browser origin restrictions can block API requests; use the hosted HTTPS page or localhost for testing.':'Results are approximate HTTPS checks, not ICMP ping or a complete network diagnosis.';btn.disabled=false;btn.textContent='Run checks';
    });
  });
}
PLAYABLES['network-diagnostics'] = mountNetworkDiagnostics;

/* ==================================================================
   tools / IPv4 subnet calculator
   ================================================================== */
function mountSubnetCalculator(container){
  mountEmbed(container, 'TOOL / IPV4 SUBNET CALCULATOR', function(body){
    body.innerHTML='<div class="tool-row"><label class="field"><span class="field-label">IPv4 address / CIDR</span><input id="sc-cidr" value="192.168.1.10/24" placeholder="192.168.1.10/24" spellcheck="false" autocomplete="off"></label><button type="button" class="game-btn" id="sc-calc">Calculate subnet</button></div><div id="sc-output" class="tool-output" aria-live="polite">Enter an IPv4 address and prefix, for example 192.168.1.10/24.</div><p class="tool-msg">Calculates IPv4 subnet values locally in your browser. /31 subnets are treated as point-to-point links; /32 represents a single address.</p>';
    var $=function(s){return body.querySelector(s);};
    function ipNum(parts){return (((parts[0]<<24)>>>0)+(parts[1]<<16)+(parts[2]<<8)+parts[3])>>>0;}
    function ipText(n){n=n>>>0;return [(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255].join('.');}
    function calc(){
      var raw=$('#sc-cidr').value.trim(),m=/^\s*(\d{1,3}(?:\.\d{1,3}){3})(?:\/(\d{1,2}))?\s*$/.exec(raw);
      if(!m){$('#sc-output').textContent='Enter an IPv4 address such as 192.168.1.10/24.';return;}
      var parts=m[1].split('.').map(Number),prefix=m[2]===undefined?24:Number(m[2]);
      if(parts.some(function(x){return x<0||x>255;})||prefix<0||prefix>32){$('#sc-output').textContent='Invalid IPv4 address or prefix. Each octet must be 0–255 and the prefix must be /0 to /32.';return;}
      var ip=ipNum(parts),mask=prefix===0?0:(0xffffffff << (32-prefix))>>>0,network=(ip&mask)>>>0,broadcast=(network|(~mask))>>>0,wildcard=(~mask)>>>0,total=Math.pow(2,32-prefix),first,last,usable;
      if(prefix<=30){first=network+1;last=broadcast-1;usable=total-2;}
      else if(prefix===31){first=network;last=broadcast;usable=2;}
      else{first=network;last=network;usable=1;}
      var rows=[['IP address',ipText(ip)],['CIDR prefix','/'+prefix],['Subnet mask',ipText(mask)],['Wildcard mask',ipText(wildcard)],['Network address',ipText(network)],['Broadcast address',ipText(broadcast)],['Usable address range',prefix===32?ipText(ip):ipText(first)+' – '+ipText(last)],['Total addresses',total.toLocaleString()],['Usable addresses',usable.toLocaleString()]];
      $('#sc-output').innerHTML='<dl class="metadata-list">'+rows.map(function(r){return '<dt>'+esc(r[0])+'</dt><dd><code>'+esc(r[1])+'</code></dd>';}).join('')+'</dl>';
    }
    $('#sc-calc').addEventListener('click',calc);$('#sc-cidr').addEventListener('keydown',function(e){if(e.key==='Enter')calc();});calc();
  });
}
PLAYABLES['subnet-calculator'] = mountSubnetCalculator;

/* ---------- start the one this page is for ---------- */
(function(){
  var id = document.body.getAttribute('data-id'), slot = document.getElementById('embed-slot');
  if(slot && PLAYABLES[id]) PLAYABLES[id](slot);
})();
