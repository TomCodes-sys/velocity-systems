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
// tools/currency-converter.js
function mountCurrencyConverter(container){
  mountEmbed(container, 'TOOL / CURRENCY CONVERTER', function(body){
    var cur = getCurrency(), fx = null;
    body.innerHTML =
      '<div class="tool-grid"><div class="field"><label for="cv-amt">Amount</label><input id="cv-amt" inputmode="decimal" value="100" autocomplete="off"></div>'+
      '<div class="field"><label for="cv-from">From</label><select id="cv-from" data-nopersist></select></div>'+
      '<div class="field"><label for="cv-to">To</label><select id="cv-to" data-nopersist></select></div></div>'+
      '<div class="tool-row"><button class="game-btn secondary" id="cv-swap">⇄ Swap</button><button class="game-btn secondary" id="cv-save">Save to history</button></div>'+
      '<div class="err-text" id="cv-err" role="alert"></div>'+
      '<div class="result-card"><div class="result-big" id="cv-out">—</div><div class="result-sub" id="cv-rate"></div></div>'+
      '<div class="result-card"><div class="field-label" style="margin-bottom:8px">The same amount in other currencies</div><dl class="kv" id="cv-more"></dl></div>';
    var $ = function(s){ return body.querySelector(s); };
    var hist = toolHistory('currency-converter', {same: function(a, b){ return a.text === b.text; }});
    var from = lsGet('vs-cv-from', 'USD'), to = lsGet('vs-cv-to', cur.code === 'USD' ? 'AUD' : cur.code);

    function fill(){
      var rates = fx && fx.rates;
      $('#cv-from').innerHTML = currencyOptionsHtml(rates, from); $('#cv-to').innerHTML = currencyOptionsHtml(rates, to);
    }
    function convert(amount, a, b){ return amount / fx.rates[a] * fx.rates[b]; }
    function run(){
      if(!fx){ return; }
      var amt = parseFloat(String($('#cv-amt').value).replace(/,/g, ''));
      from = $('#cv-from').value; to = $('#cv-to').value;
      lsSet('vs-cv-from', from); lsSet('vs-cv-to', to);
      if(isNaN(amt)){ $('#cv-out').textContent = '—'; $('#cv-more').innerHTML = ''; return; }
      var r = convert(1, from, to);
      $('#cv-out').textContent = fmtMoney(convert(amt, from, to), to);
      $('#cv-rate').textContent = '1 ' + from + ' = ' + r.toLocaleString(undefined, {maximumFractionDigits: 6}) + ' ' + to + '  ·  1 ' + to + ' = ' + (1 / r).toLocaleString(undefined, {maximumFractionDigits: 6}) + ' ' + from +
        '  ·  rates ' + (fx.date || 'today') + (fx.stale ? ' (offline copy)' : '');
      $('#cv-more').innerHTML = ['USD', 'AUD', 'EUR', 'GBP', 'NZD', 'CAD', 'JPY'].filter(function(c){ return c !== from && fx.rates[c]; })
        .map(function(c){ return '<dt>' + c + '</dt><dd>' + esc(fmtMoney(convert(amt, from, c), c)) + '</dd>'; }).join('');
    }
    function save(){
      var amt = parseFloat(String($('#cv-amt').value).replace(/,/g, ''));
      if(!fx || isNaN(amt)) return;
      hist.add({text: amt + ' ' + from + ' → ' + to, result: fmtMoney(convert(amt, from, to), to)});
      notify('Saved to history', 'ok');
    }
    body.addEventListener('input', run); body.addEventListener('change', function(e){ if(e.target.id === 'cv-amt') save(); run(); });
    $('#cv-swap').addEventListener('click', function(){ var t = from; from = to; to = t; fill(); run(); });
    $('#cv-save').addEventListener('click', save);
    hist.mount(body, {title: 'History', format: function(e){ return {main: e.text, sub: e.result}; }});
    fxLoad().then(function(c){ fx = c; fill(); run(); }).catch(function(e){ $('#cv-err').textContent = 'Exchange rates couldn’t be loaded. Check your connection and reload.'; });
    fill();
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
      body.innerHTML = '<div style="font:11px monospace">'+
        (publicIp ? '<div style="margin-bottom:8px"><b>Public IP:</b> '+esc(publicIp)+'</div>' : '<div class="tool-msg">Public IP unavailable (offline or blocked)</div>')+
        rows.map(function(r){ return '<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--line)"><span style="color:var(--muted)">'+r[0]+'</span><b>'+esc(String(r[1]))+'</b></div>'; }).join('')+
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

function mountFileConverter(container){
  mountEmbed(container, 'TOOL / FILE CONVERTER', function(body){
    var MODES = {
      img: {label: 'Images', accept: 'image/*,.heic,.avif', hint: 'PNG, JPG, WebP, GIF, BMP, SVG, AVIF and ICO can be read. HEIC only works in Safari.'},
      aud: {label: 'Audio → WAV', accept: 'audio/*,video/*', hint: 'Any audio file, or the soundtrack of a video, that your browser can play.'},
      txt: {label: 'Text → PDF', accept: '.txt,.md,.csv,.json,.log,.xml,.html,.js,.css,.py,text/*', hint: 'Plain text files. Output uses a fixed-width font and Latin characters.'},
    };
    body.innerHTML =
      '<div class="tool-row"><span class="seg" id="fv-seg">' + Object.keys(MODES).map(function(k, i){ return '<button type="button" data-m="' + k + '"' + (i ? '' : ' class="on"') + '>' + MODES[k].label + '</button>'; }).join('') + '</span>'+
        '<select id="fv-mode" style="display:none">' + Object.keys(MODES).map(function(k){ return '<option value="' + k + '">' + k + '</option>'; }).join('') + '</select></div>'+
      '<label class="fv-drop" id="fv-drop" for="fv-file"><b>Drop files here</b> or click to choose<span id="fv-hint"></span></label>'+
      '<input type="file" id="fv-file" multiple hidden data-nopersist>'+
      '<div id="fv-opts"></div>'+
      '<div class="tool-row"><button class="game-btn" id="fv-go" disabled>Convert</button><button class="game-btn secondary" id="fv-zip" disabled>Download all (.zip)</button><button class="game-btn secondary" id="fv-clear" disabled>Clear</button><span class="hint" id="fv-sum" style="margin:0"></span></div>'+
      '<div class="gd-list" id="fv-list" hidden></div>';
    var $ = function(s){ return body.querySelector(s); };
    var items = [], busy = false, seq = 0;

    /* ---------- options per mode ---------- */
    function optsHtml(mode){
      if(mode === 'img') return '<div class="tool-grid">'+
        '<div class="field"><label for="fv-fmt">Convert to</label><select id="fv-fmt"><option value="png">PNG</option><option value="jpeg">JPEG</option><option value="webp">WebP</option><option value="bmp">BMP</option><option value="ico">ICO (icon)</option><option value="pdf">PDF</option></select></div>'+
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
      $('#fv-qf').hidden = ['jpeg', 'webp', 'pdf'].indexOf(v) < 0;
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
        var type = f === 'jpeg' ? 'image/jpeg' : f === 'webp' ? 'image/webp' : 'image/png';
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
// tools/game-deals.js
// Game Deals & Freebies. Prices come from CheapShark (USD) and giveaways from GamerPower;
// both are read straight from your browser. Prices are converted from USD with a daily
// exchange rate, so treat them as estimates: stores can charge differently in your region.

function mountGameDeals(container){
  mountEmbed(container, 'TOOL / GAME DEALS & FREEBIES', function(body){
    var CS = 'https://www.cheapshark.com/api/1.0', GP = 'https://www.gamerpower.com/api';
    var PLATFORMS = [['', 'All platforms'], ['pc', 'PC'], ['steam', 'Steam'], ['epic-games-store', 'Epic Games'], ['gog', 'GOG'], ['ubisoft', 'Ubisoft'], ['itchio', 'itch.io'], ['battlenet', 'Battle.net'],
      ['ps5', 'PlayStation 5'], ['ps4', 'PlayStation 4'], ['xbox-series-xs', 'Xbox Series X|S'], ['xbox-one', 'Xbox One'], ['switch', 'Nintendo Switch'], ['android', 'Android'], ['ios', 'iOS'], ['vr', 'VR']];
    var fx = null, stores = null, cur = getCurrency(), page = 0, freeLoaded = false;

    body.innerHTML =
      '<div class="tool-row"><span class="seg" id="gd-seg"><button type="button" data-t="deals" class="on">Deals</button><button type="button" data-t="free">Free stuff</button></span>'+
        '<select id="gd-tab" style="display:none"><option value="deals">deals</option><option value="free">free</option></select>'+
        '<div class="field" style="width:260px"><label for="gd-cur">Show prices in</label><select id="gd-cur" data-nopersist>'+currencyOptionsHtml(null, cur.code)+'</select></div></div>'+
      '<p class="hint" id="gd-fx">Loading exchange rates…</p>'+

      '<div id="gd-deals">'+
        '<div class="tool-grid">'+
          '<div class="field"><label for="gd-q">Search a game</label><input id="gd-q" autocomplete="off" placeholder="Leave empty for the top deals right now"></div>'+
          '<div class="field"><label for="gd-store">Store</label><select id="gd-store"><option value="">All stores</option></select></div>'+
          '<div class="field"><label for="gd-sort">Sort by</label><select id="gd-sort"><option value="Deal Rating">Best deal</option><option value="Price">Lowest price</option><option value="Savings">Biggest discount</option><option value="recent">Newest deals</option><option value="Reviews">Steam reviews</option><option value="Metacritic">Metacritic</option><option value="Title">Title A–Z</option></select></div>'+
          '<div class="field"><label for="gd-max">Max price (<span id="gd-maxc"></span>)</label><input id="gd-max" inputmode="decimal" autocomplete="off" placeholder="No limit"></div>'+
        '</div>'+
        '<div class="tool-row"><label><input type="checkbox" id="gd-sale" checked> On sale only</label><button class="game-btn" id="gd-go">Search</button></div>'+
        '<div class="gd-links" id="gd-links"></div>'+
        '<div id="gd-results"></div>'+
      '</div>'+

      '<div id="gd-free" hidden>'+
        '<div class="tool-grid">'+
          '<div class="field"><label for="gf-type">Type</label><select id="gf-type"><option value="">Everything</option><option value="game">Full games</option><option value="loot">In-game loot &amp; DLC</option><option value="beta">Beta access</option></select></div>'+
          '<div class="field"><label for="gf-plat">Platform</label><select id="gf-plat">'+PLATFORMS.map(function(p){ return '<option value="'+p[0]+'">'+p[1]+'</option>'; }).join('')+'</select></div>'+
          '<div class="field"><label for="gf-sort">Sort by</label><select id="gf-sort"><option value="date">Newest</option><option value="value">Highest value</option><option value="popularity">Most popular</option></select></div>'+
          '<div class="field"><label for="gf-q">Filter by name</label><input id="gf-q" autocomplete="off" placeholder="Type to filter"></div>'+
        '</div>'+
        '<div class="tool-row"><label><input type="checkbox" id="gf-hide"> Hide ones I’ve claimed</label><button class="game-btn secondary" id="gf-refresh">Refresh</button></div>'+
        '<div id="gf-stats" class="gd-stats"></div>'+
        '<h3 class="gd-h">Giveaways &amp; freebies</h3><div id="gf-list"></div>'+
        '<h3 class="gd-h">Free right now on official stores</h3><div id="gf-zero"></div>'+
      '</div>';

    var $ = function(s){ return body.querySelector(s); };

    /* ---- currency ---- */
    function rate(){ return fx && fx.rates[cur.code] ? fx.rates[cur.code] : 1; }
    function code(){ return fx && fx.rates[cur.code] ? cur.code : 'USD'; }
    function money(usd){ return fmtMoney(usd * rate(), code()); }
    function renderCurrency(){
      $('#gd-cur').innerHTML = currencyOptionsHtml(fx && fx.rates, cur.code);
      $('#gd-maxc').textContent = code();
      var note = fx
        ? (cur.code === 'USD' ? 'Prices shown in US dollars (' + cur.why + ')' : 'Prices converted from USD to ' + cur.code + ' (' + curName(cur.code) + ') — from ' + cur.why + (fx.stale ? ' · rates may be out of date' : '') + ' · rates ' + (fx.date || 'today') + '. Stores may charge differently in your region.')
        : 'Exchange rates unavailable — showing US dollars.';
      $('#gd-fx').textContent = note;
    }
    $('#gd-cur').addEventListener('change', function(){
      cur = {code: this.value, why: 'your saved choice'}; setCurrency(cur.code); renderCurrency(); redrawAll();
    });
    $('#gd-maxc').textContent = cur.code;

    function msg(text, retry){ return '<div class="empty-state" style="margin:14px 0">' + esc(text) + (retry ? ' <button class="game-btn secondary" data-retry="' + retry + '">Try again</button>' : '') + '</div>'; }

    /* ---- Deals tab ---- */
    var lastDeals = [];
    function storeName(id){ return (stores && stores[id]) || 'Store ' + id; }
    function shopLinks(q){
      var enc = encodeURIComponent(q || '');
      var L = [['Steam', 'https://store.steampowered.com/search/?term=' + enc], ['GOG', 'https://www.gog.com/en/games?query=' + enc], ['Epic', 'https://store.epicgames.com/en-US/browse?q=' + enc],
        ['Instant Gaming', 'https://www.instant-gaming.com/en/search/?query=' + enc], ['Eneba', 'https://www.eneba.com/store/all?text=' + enc], ['Kinguin', 'https://www.kinguin.net/listing?active=1&phrase=' + enc],
        ['G2A', 'https://www.g2a.com/search?query=' + enc], ['Gamivo', 'https://www.gamivo.com/catalogsearch/result/?q=' + enc], ['CDKeys', 'https://www.cdkeys.com/catalogsearch/result/?q=' + enc]];
      $('#gd-links').innerHTML = q
        ? '<span class="field-label">Also search</span>' + L.map(function(l, i){ return '<a class="sec-chip" target="_blank" rel="noopener" href="' + l[1] + '">' + l[0] + (i > 2 ? '' : '') + ' ↗</a>'; }).join('') +
          '<span class="hint" style="width:100%;margin:6px 0 0">Steam, GOG and Epic are official stores. The others resell keys, so check seller ratings before buying.</span>'
        : '';
    }
    function dealRow(d){
      var sale = parseFloat(d.salePrice), normal = parseFloat(d.normalPrice), save = Math.round(parseFloat(d.savings));
      return '<a class="gd-deal" target="_blank" rel="noopener" href="https://www.cheapshark.com/redirect?dealID=' + encodeURIComponent(d.dealID) + '">'+
        (d.thumb ? '<img class="gd-thumb" src="' + esc(d.thumb) + '" alt="" loading="lazy">' : '<span class="gd-thumb"></span>')+
        '<div class="gd-main"><div class="gd-title">' + esc(d.title) + '</div><div class="gd-sub">' + esc(storeName(d.storeID)) +
          (d.steamRatingPercent && d.steamRatingPercent !== '0' ? ' · ' + esc(d.steamRatingPercent) + '% positive' : '') + (d.metacriticScore && d.metacriticScore !== '0' ? ' · Metacritic ' + esc(d.metacriticScore) : '') + '</div></div>'+
        '<div class="gd-was">' + (normal > sale ? money(normal) : '') + '</div>'+
        '<div class="gd-now' + (sale === 0 ? ' free' : '') + '">' + (sale === 0 ? 'FREE' : money(sale)) + '</div>'+
        '<div class="gd-off">' + (save > 0 ? '−' + save + '%' : '') + '</div></a>';
    }
    function sortDeals(list, by){
      var n = function(x){ return parseFloat(x) || 0; };
      var fn = {'Price': function(a, b){ return n(a.salePrice) - n(b.salePrice); }, 'Savings': function(a, b){ return n(b.savings) - n(a.savings); },
        'Reviews': function(a, b){ return n(b.steamRatingPercent) - n(a.steamRatingPercent); }, 'Metacritic': function(a, b){ return n(b.metacriticScore) - n(a.metacriticScore); },
        'recent': function(a, b){ return n(b.lastChange) - n(a.lastChange); }, 'Title': function(a, b){ return a.title.localeCompare(b.title); }}[by];
      return fn ? list.slice().sort(fn) : list;
    }
    function drawDeals(heading){
      var maxUsd = parseFloat($('#gd-max').value);
      var list = lastDeals;
      if(!isNaN(maxUsd)) list = list.filter(function(d){ return parseFloat(d.salePrice) * rate() <= maxUsd; });
      list = sortDeals(list, $('#gd-sort').value);
      $('#gd-results').innerHTML = (heading ? '<h3 class="gd-h">' + esc(heading) + '</h3>' : '') +
        (list.length ? '<div class="gd-list">' + list.map(dealRow).join('') + '</div>' + (page >= 0 && lastDeals.length >= (page + 1) * 40 ? '<div class="tool-row"><button class="game-btn secondary" id="gd-more">Load more</button></div>' : '')
                     : msg('Nothing matches. Try a shorter name, another store, or untick “On sale only”.'));
    }
    var dealsHeading = '';
    function searchDeals(more){
      var q = $('#gd-q').value.trim();
      if(!more){ page = 0; lastDeals = []; }
      else page++;
      shopLinks(q);
      $('#gd-results').innerHTML = '<div class="empty-state" style="margin:14px 0">Searching stores…</div>';
      var url = CS + '/deals?pageSize=40&pageNumber=' + page + '&sortBy=' + encodeURIComponent($('#gd-sort').value === 'recent' ? 'recent' : $('#gd-sort').value);
      if(['Savings', 'Reviews', 'Metacritic'].indexOf($('#gd-sort').value) > -1) url += '&desc=1';
      if(q) url += '&title=' + encodeURIComponent(q);
      if($('#gd-store').value) url += '&storeID=' + encodeURIComponent($('#gd-store').value);
      if($('#gd-sale').checked || !q) url += '&onSale=1';
      var maxLocal = parseFloat($('#gd-max').value);
      if(!isNaN(maxLocal)) url += '&upperPrice=' + Math.ceil(maxLocal / rate());
      fetchJson(url, {ttl: 300000}).then(function(deals){
        if(!Array.isArray(deals)) throw new Error('Unexpected reply');
        lastDeals = more ? lastDeals.concat(deals) : deals;
        dealsHeading = q ? 'Results for “' + q + '”' : 'Top deals right now';
        drawDeals(dealsHeading);
      }).catch(function(){
        $('#gd-results').innerHTML = msg('Couldn’t reach CheapShark. Check your connection, then try again.', 'deals');
      });
    }
    $('#gd-go').addEventListener('click', function(){ searchDeals(false); });
    $('#gd-q').addEventListener('keydown', function(e){ if(e.key === 'Enter') searchDeals(false); });
    ['#gd-sort', '#gd-store', '#gd-sale'].forEach(function(s){ $(s).addEventListener('change', function(){ searchDeals(false); }); });
    $('#gd-max').addEventListener('input', function(){ if(lastDeals.length) drawDeals(dealsHeading); });
    $('#gd-max').addEventListener('change', function(){ searchDeals(false); });
    $('#gd-results').addEventListener('click', function(e){
      if(e.target.id === 'gd-more') searchDeals(true);
      if(e.target.getAttribute('data-retry')) searchDeals(false);
    });

    /* ---- Free stuff tab ---- */
    var claimed = lsGet('vs-gd-claimed', []), giveaways = [], zero = [];
    function endsIn(s){
      if(!s || s === 'N/A') return '';
      var t = Date.parse(String(s).replace(' ', 'T') + 'Z'); if(isNaN(t)) return '';
      var ms = t - Date.now(); if(ms <= 0) return 'Ended';
      var d = Math.floor(ms / 86400000), h = Math.floor(ms % 86400000 / 3600000);
      return 'Ends in ' + (d ? d + 'd ' : '') + h + 'h';
    }
    function worthUsd(w){ var m = /([\d.,]+)/.exec(w || ''); return m ? parseFloat(m[1].replace(/,/g, '')) || 0 : 0; }
    function giveawayCard(g){
      var isClaimed = claimed.indexOf(g.id) > -1, w = worthUsd(g.worth), end = endsIn(g.end_date);
      return '<div class="gd-card' + (isClaimed ? ' claimed' : '') + '">'+
        ((g.thumbnail || g.image) ? '<img class="gd-cimg" src="' + esc(g.thumbnail || g.image) + '" alt="" loading="lazy">' : '')+
        '<div class="gd-cbody"><div class="gd-badges"><span class="pass">' + esc((g.type || 'game').toUpperCase()) + '</span>' + (end ? '<span class="gd-end">' + esc(end) + '</span>' : '') + '</div>'+
          '<div class="gd-title">' + esc(g.title) + '</div>'+
          '<div class="gd-sub">' + esc(String(g.platforms || '').split(',').slice(0, 3).join(' · ')) + (g.users ? ' · ' + Number(g.users).toLocaleString() + ' claimed' : '') + '</div>'+
          (w ? '<div class="gd-worth"><s>' + money(w) + '</s> now free</div>' : '')+
          '<div class="tool-row" style="margin:10px 0 0"><a class="game-btn" target="_blank" rel="noopener" href="' + esc(g.open_giveaway_url || g.gamerpower_url || '#') + '">Get it ↗</a>'+
          '<button type="button" class="game-btn secondary" data-claim="' + esc(g.id) + '">' + (isClaimed ? '✓ Claimed' : 'Mark claimed') + '</button></div></div></div>';
    }
    function drawFree(){
      var q = $('#gf-q').value.trim().toLowerCase(), hide = $('#gf-hide').checked;
      var list = giveaways.filter(function(g){ return (!q || (g.title + ' ' + g.platforms).toLowerCase().indexOf(q) > -1) && !(hide && claimed.indexOf(g.id) > -1); });
      var total = giveaways.reduce(function(s, g){ return s + worthUsd(g.worth); }, 0);
      $('#gf-stats').innerHTML = giveaways.length ? '<span><b>' + giveaways.length + '</b> active</span><span><b>' + money(total) + '</b> total value</span><span><b>' + claimed.filter(function(id){ return giveaways.some(function(g){ return g.id === id; }); }).length + '</b> claimed by you</span>' : '';
      $('#gf-list').innerHTML = list.length ? '<div class="gd-grid">' + list.map(giveawayCard).join('') + '</div>' : msg(giveaways.length ? 'Nothing matches that filter.' : 'No active giveaways match those filters right now.');
      $('#gf-zero').innerHTML = zero.length ? '<div class="gd-list">' + sortDeals(zero, 'Title').filter(function(d){ return !q || d.title.toLowerCase().indexOf(q) > -1; }).map(dealRow).join('') + '</div>' : msg('Nothing is priced at zero on the tracked stores at the moment.');
    }
    function loadFree(){
      freeLoaded = true;
      $('#gf-list').innerHTML = '<div class="empty-state" style="margin:14px 0">Loading giveaways…</div>';
      $('#gf-zero').innerHTML = '<div class="empty-state" style="margin:14px 0">Loading store freebies…</div>';
      var url = GP + '/giveaways?sort-by=' + encodeURIComponent($('#gf-sort').value);
      if($('#gf-type').value) url += '&type=' + encodeURIComponent($('#gf-type').value);
      if($('#gf-plat').value) url += '&platform=' + encodeURIComponent($('#gf-plat').value);
      var a = fetchJson(url, {ttl: 300000}).then(function(d){ giveaways = Array.isArray(d) ? d : []; return true; }).catch(function(){ giveaways = []; return false; });
      var b = fetchJson(CS + '/deals?upperPrice=0&pageSize=40&sortBy=recent', {ttl: 300000}).then(function(d){ zero = Array.isArray(d) ? d : []; return true; }).catch(function(){ zero = []; return false; });
      Promise.all([a, b]).then(function(ok){
        drawFree();
        if(!ok[0]) $('#gf-list').innerHTML = msg('Couldn’t reach GamerPower. Try again in a moment.', 'free');
        if(!ok[1]) $('#gf-zero').innerHTML = msg('Couldn’t reach CheapShark. Try again in a moment.', 'free');
      });
    }
    ['#gf-type', '#gf-plat', '#gf-sort'].forEach(function(s){ $(s).addEventListener('change', loadFree); });
    $('#gf-refresh').addEventListener('click', loadFree);
    $('#gf-q').addEventListener('input', drawFree);
    $('#gf-hide').addEventListener('change', drawFree);
    $('#gd-free').addEventListener('click', function(e){
      var c = e.target.closest('[data-claim]');
      if(c){
        var id = Number(c.getAttribute('data-claim')), i = claimed.indexOf(id);
        if(i > -1) claimed.splice(i, 1); else claimed.push(id);
        lsSet('vs-gd-claimed', claimed.slice(-300)); drawFree(); return;
      }
      if(e.target.getAttribute('data-retry')) loadFree();
    });

    /* ---- tabs, images, startup ---- */
    function showTab(){
      var t = $('#gd-tab').value;
      $('#gd-deals').hidden = t !== 'deals'; $('#gd-free').hidden = t !== 'free';
      Array.prototype.forEach.call(body.querySelectorAll('#gd-seg button'), function(b){ b.classList.toggle('on', b.getAttribute('data-t') === t); });
      if(t === 'free' && !freeLoaded) loadFree();
    }
    $('#gd-seg').addEventListener('click', function(e){
      var b = e.target.closest('[data-t]'); if(!b) return;
      $('#gd-tab').value = b.getAttribute('data-t'); $('#gd-tab').dispatchEvent(new Event('change', {bubbles: true}));
    });
    $('#gd-tab').addEventListener('change', showTab);
    body.addEventListener('error', function(e){ if(e.target.tagName === 'IMG') e.target.style.visibility = 'hidden'; }, true);
    function redrawAll(){ if(lastDeals.length) drawDeals(dealsHeading); if(giveaways.length || zero.length) drawFree(); }

    fxLoad().then(function(c){ fx = c; renderCurrency(); redrawAll(); }).catch(function(){ fx = null; renderCurrency(); });
    renderCurrency();
    fetchJson(CS + '/stores', {ttl: 86400000}).then(function(list){
      stores = {}; var opts = '';
      list.forEach(function(s){ if(String(s.isActive) === '1'){ stores[s.storeID] = s.storeName; opts += '<option value="' + esc(s.storeID) + '">' + esc(s.storeName) + '</option>'; } });
      var keep = $('#gd-store').value;
      $('#gd-store').innerHTML = '<option value="">All stores</option>' + opts; $('#gd-store').value = keep;
      if(lastDeals.length) drawDeals(dealsHeading);
    }).catch(function(){});
    setTimeout(function(){ showTab(); searchDeals(false); }, 30);
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
PLAYABLES['image-converter'] = mountImageConverter;

/* ==================================================================
   tools / image-resizer
   ================================================================== */
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
PLAYABLES['image-resizer'] = mountImageResizer;

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
      '<div class="tool-row"><button class="game-btn secondary" id="jc-copy">Copy output</button><button class="game-btn secondary" id="jc-dl">Download</button></div>';
    var $ = function(s){ return body.querySelector(s); };

    function parseCsv(text, d){
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
      if(!src.trim()){ $('#jc-out').value = ''; return; }
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
      } catch(e){ err.textContent = e.message; $('#jc-out').value = ''; }
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
PLAYABLES['json-explorer'] = mountJsonExplorer;

/* ==================================================================
   tools / json-formatter
   ================================================================== */
/* JSON Formatter (tool) */
function mountJsonFormatter(container){
  mountEmbed(container, 'TOOL / JSON FORMATTER', function(body){
    body.innerHTML =
      '<textarea class="tool-textarea" id="json-in" placeholder=\'Paste JSON here, e.g. {"a":1,"b":[1,2,3]}\'></textarea>'+
      '<div class="tool-row"><button class="game-btn" id="json-format">Format</button><button class="game-btn secondary" id="json-minify">Minify</button></div>'+
      '<div class="tool-msg" id="json-msg"></div>'+
      '<div class="tool-output" id="json-out" style="display:none"></div>';
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
PLAYABLES['palette-generator'] = mountPaletteGenerator;

/* ==================================================================
   tools / password-generator
   ================================================================== */
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
PLAYABLES['pomodoro'] = mountPomodoro;

/* ==================================================================
   tools / qr-generator
   ================================================================== */
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
PLAYABLES['text-encoder'] = mountBase64;

/* ==================================================================
   tools / text-to-speech
   ================================================================== */
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
      '<div id="conv-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px"></div>';
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
PLAYABLES['watermark-tool'] = mountWatermark;

/* ==================================================================
   tools / wheel-spinner
   ================================================================== */
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
    var hist = toolHistory('wheel-spinner');
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
          hist.add({text:segments[idx]});
        }
      }
      requestAnimationFrame(frame);
    }
    body.querySelector('#sp-spin').addEventListener('click', spin);
    hist.mount(body, {title:'Past results', format:function(e){ return {main:e.text}; }});
    body.querySelector('#sp-update').addEventListener('click', function(){
      segments = body.querySelector('#sp-options').value.split('\n').map(function(s){return s.trim();}).filter(Boolean);
      if(segments.length<2) segments=['Option 1','Option 2'];
      draw(-1);
    });
    draw(-1);
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

/* ---------- start the one this page is for ---------- */
(function(){
  var id = document.body.getAttribute('data-id'), slot = document.getElementById('embed-slot');
  if(slot && PLAYABLES[id]) PLAYABLES[id](slot);
})();
