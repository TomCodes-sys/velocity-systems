/* dev-tools.js — extra developer and text tools for Velocity Systems. Everything runs locally in the browser. */
(function(){
  'use strict';
  var REG = {};
  function reg(id, label, build){ REG[id] = function(container){ mountEmbed(container, 'TOOL / ' + label, function(body){ build(body, function(s){ return body.querySelector(s); }); }); }; PLAYABLES[id] = REG[id]; }
  function ta(id, label, rows, ph, attrs){ return '<div class="field"><label for="' + id + '">' + label + '</label><textarea id="' + id + '" rows="' + (rows || 8) + '" spellcheck="false" placeholder="' + (ph || '') + '" ' + (attrs || '') + '></textarea></div>'; }
  function sel(id, label, opts){ return '<div class="field"><label for="' + id + '">' + label + '</label><select id="' + id + '">' + opts.map(function(o){ return '<option value="' + o[0] + '">' + o[1] + '</option>'; }).join('') + '</select></div>'; }
  function chk(id, label, on){ return '<label style="display:inline-flex;gap:6px;align-items:center;font-size:12px"><input type="checkbox" id="' + id + '"' + (on ? ' checked' : '') + '> ' + label + '</label>'; }
  function btn(id, label, sec){ return '<button type="button" class="game-btn' + (sec ? ' secondary' : '') + '" id="' + id + '">' + label + '</button>'; }
  function out(id){ return '<div class="tool-output" id="' + id + '" aria-live="polite" style="white-space:pre-wrap;word-break:break-word;font-family:var(--font-mono);font-size:12px;min-height:44px"></div>'; }
  function msg(el, text, kind){ el.textContent = text || ''; el.className = 'tool-msg' + (kind ? ' ' + kind : ''); }
  function copyText(text, b){
    var old = b.textContent;
    function done(ok){ b.textContent = ok ? 'Copied' : 'Copy failed'; setTimeout(function(){ b.textContent = old; }, 1200); }
    if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function(){ done(true); }, function(){ done(false); });
    else { try{ var t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove(); done(true); }catch(e){ done(false); } }
  }
  function save(name, text, type){ var u = URL.createObjectURL(new Blob([text], {type: type || 'text/plain'})), a = document.createElement('a'); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function(){ URL.revokeObjectURL(u); }, 20000); }
  function debounce(fn, ms){ var t; return function(){ clearTimeout(t); t = setTimeout(fn, ms || 120); }; }
  function pad2(n){ return (n < 10 ? '0' : '') + n; }

  /* ================= Cron parser ================= */
  reg('cron-parser', 'CRON PARSER', function(body, q){
    body.innerHTML = '<div class="field"><label for="cr-in">Cron expression (5 fields, or 6 with seconds first)</label><input id="cr-in" value="*/15 9-17 * * 1-5" spellcheck="false" autocomplete="off"></div>' +
      '<div class="tool-row">' + sel('cr-tz', 'Show times in', [['local', 'Your local time'], ['utc', 'UTC']]) + sel('cr-n', 'Next runs', [['5', '5'], ['10', '10'], ['20', '20']]) + '</div>' +
      '<div class="tool-row" id="cr-presets"></div><div class="result-card"><div class="field-label">Meaning</div><div id="cr-desc"></div></div><div class="tool-msg" id="cr-msg"></div><div class="result-card"><div class="field-label">Next runs</div><div id="cr-runs" class="tool-output" style="font-family:var(--font-mono);font-size:12px"></div></div>' +
      '<p class="hint">Supports * , - / lists, ranges and steps, month and weekday names (JAN, MON), ? and the @hourly/@daily/@weekly/@monthly/@yearly shortcuts. When both day-of-month and weekday are set, either one matching runs the job (standard cron behaviour).</p>';
    var MON = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'], DOW = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
    var ALIAS = {'@yearly':'0 0 1 1 *','@annually':'0 0 1 1 *','@monthly':'0 0 1 * *','@weekly':'0 0 * * 0','@daily':'0 0 * * *','@midnight':'0 0 * * *','@hourly':'0 * * * *'};
    var PRESETS = [['Every minute','* * * * *'],['Every 5 min','*/5 * * * *'],['Hourly','0 * * * *'],['Daily 02:30','30 2 * * *'],['Weekdays 9:00','0 9 * * 1-5'],['Monthly 1st','0 0 1 * *'],['Sundays','0 0 * * 0']];
    q('#cr-presets').innerHTML = PRESETS.map(function(p, i){ return '<button type="button" class="game-btn secondary" data-i="' + i + '">' + p[0] + '</button>'; }).join('');
    function val(tok, names, min, max){
      var u = tok.toUpperCase();
      if(names && names.indexOf(u) >= 0) return names.indexOf(u) + (names === MON ? 1 : 0);
      if(!/^\d+$/.test(tok)) throw new Error('"' + tok + '" is not a valid value');
      return +tok;
    }
    function field(s, min, max, names, dow){
      var set = {}, star = (s === '*' || s === '?');
      s.split(',').forEach(function(part){
        if(!part) throw new Error('Empty list item');
        var sp = part.split('/'), step = 1, range = sp[0];
        if(sp.length > 2) throw new Error('Too many "/" in "' + part + '"');
        if(sp.length === 2){ if(!/^\d+$/.test(sp[1]) || +sp[1] < 1) throw new Error('Invalid step "' + sp[1] + '"'); step = +sp[1]; }
        var lo, hi;
        if(range === '*' || range === '?'){ lo = min; hi = max; }
        else if(range.indexOf('-') > 0){ var r = range.split('-'); lo = val(r[0], names, min, max); hi = val(r[1], names, min, max); }
        else { lo = val(range, names, min, max); hi = sp.length === 2 ? max : lo; }
        if(lo < min || hi > max || lo > hi) throw new Error('"' + part + '" is outside ' + min + '-' + max);
        for(var i = lo; i <= hi; i += step) set[i] = 1;
      });
      if(dow && set[7]){ set[0] = 1; delete set[7]; }
      return {set: set, star: star, list: Object.keys(set).map(Number).sort(function(a, b){ return a - b; })};
    }
    function parse(expr){
      expr = expr.trim().replace(/\s+/g, ' ');
      if(ALIAS[expr.toLowerCase()]) expr = ALIAS[expr.toLowerCase()];
      var p = expr.split(' ');
      if(p.length !== 5 && p.length !== 6) throw new Error('Expected 5 fields (minute hour day month weekday) or 6 with a leading seconds field. Got ' + p.length + '.');
      var sec = p.length === 6 ? p.shift() : '0';
      return {sec: field(sec, 0, 59), min: field(p[0], 0, 59), hour: field(p[1], 0, 23), dom: field(p[2], 1, 31), mon: field(p[3], 1, 12, MON), dow: field(p[4], 0, 7, DOW, true), six: p.length === 5 && expr.split(' ').length === 6, raw: p};
    }
    function lst(f, fmt){
      if(fmt) return f.list.map(fmt).join(', ');
      var out = [], i = 0, a = f.list; while(i < a.length){ var j = i; while(j + 1 < a.length && a[j + 1] === a[j] + 1) j++; out.push(j - i >= 2 ? a[i] + '-' + a[j] : a.slice(i, j + 1).join(', ')); i = j + 1; }
      return out.join(', ');
    }
    function describe(c){
      var t;
      var mAll = c.min.star, hAll = c.hour.star;
      var mStep = /^\*\/(\d+)$/.exec(c.raw[0]), hStep = /^\*\/(\d+)$/.exec(c.raw[1]);
      if(mAll && hAll) t = 'every minute';
      else if(mStep && hAll) t = 'every ' + mStep[1] + ' minutes';
      else if(mStep && !hAll) t = 'every ' + mStep[1] + ' minutes, during hour' + (c.hour.list.length > 1 ? 's ' : ' ') + lst(c.hour);
      else if(c.min.list.length === 1 && hAll) t = 'at minute ' + c.min.list[0] + ' of every hour';
      else if(c.min.list.length === 1 && c.hour.list.length === 1) t = 'at ' + pad2(c.hour.list[0]) + ':' + pad2(c.min.list[0]);
      else if(hStep && c.min.list.length === 1) t = 'at minute ' + c.min.list[0] + ' every ' + hStep[1] + ' hours';
      else t = 'at minute ' + lst(c.min) + ' past ' + (hAll ? 'every hour' : 'hour ' + lst(c.hour));
      if(c.six || c.sec.list.length !== 1 || c.sec.list[0] !== 0) t += ', at second ' + lst(c.sec);
      var d = [];
      if(!c.dom.star) d.push('on day ' + lst(c.dom) + ' of the month');
      if(!c.dow.star) d.push((d.length ? 'or ' : 'on ') + lst(c.dow, function(n){ return ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][n]; }));
      if(!c.mon.star) d.push('in ' + lst(c.mon, function(n){ return ['January','February','March','April','May','June','July','August','September','October','November','December'][n - 1]; }));
      return 'Runs ' + t + (d.length ? ', ' + d.join(', ') : '') + '.';
    }
    function nextRuns(c, n, utc){
      var res = [], now = new Date(), y = utc ? now.getUTCFullYear() : now.getFullYear(), mo = utc ? now.getUTCMonth() : now.getMonth(), d0 = utc ? now.getUTCDate() : now.getDate();
      for(var off = 0; off < 366 * 8 && res.length < n; off++){
        var dt = utc ? new Date(Date.UTC(y, mo, d0 + off)) : new Date(y, mo, d0 + off);
        var Y = utc ? dt.getUTCFullYear() : dt.getFullYear(), M = (utc ? dt.getUTCMonth() : dt.getMonth()) + 1, D = utc ? dt.getUTCDate() : dt.getDate(), W = utc ? dt.getUTCDay() : dt.getDay();
        if(!c.mon.set[M]) continue;
        var dm = !!c.dom.set[D], dw = !!c.dow.set[W], ok = (!c.dom.star && !c.dow.star) ? (dm || dw) : (dm && dw);
        if(!ok) continue;
        for(var h = 0; h < 24 && res.length < n; h++){ if(!c.hour.set[h]) continue;
          for(var mi = 0; mi < 60 && res.length < n; mi++){ if(!c.min.set[mi]) continue;
            for(var s = 0; s < 60 && res.length < n; s++){ if(!c.sec.set[s]) continue;
              var t = utc ? new Date(Date.UTC(Y, M - 1, D, h, mi, s)) : new Date(Y, M - 1, D, h, mi, s);
              if(t > now) res.push(t);
            } } }
      }
      return res;
    }
    function run(){
      var m = q('#cr-msg'), utc = q('#cr-tz').value === 'utc';
      try{
        var c = parse(q('#cr-in').value);
        q('#cr-desc').textContent = describe(c); msg(m, '');
        var runs = nextRuns(c, +q('#cr-n').value, utc);
        q('#cr-runs').textContent = runs.length ? runs.map(function(t, i){ return (i + 1 + '.').padEnd(4) + (utc ? t.toUTCString() : t.toLocaleString([], {weekday:'short', year:'numeric', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit', second: c.six ? '2-digit' : undefined})); }).join('\n') : 'No run found in the next 8 years (for example, 31 February).';
      }catch(e){ q('#cr-desc').textContent = ''; q('#cr-runs').textContent = ''; msg(m, e.message, 'err'); }
    }
    q('#cr-in').addEventListener('input', debounce(run, 100)); q('#cr-tz').addEventListener('change', run); q('#cr-n').addEventListener('change', run);
    q('#cr-presets').addEventListener('click', function(e){ var b = e.target.closest('button'); if(!b) return; q('#cr-in').value = PRESETS[+b.getAttribute('data-i')][1]; run(); });
    run();
  });

  /* ================= JSON <-> YAML ================= */
  var Y = (function(){
    function plainOk(s){
      if(s === '' || /^\s|\s$/.test(s) || /[\n\r\t]/.test(s)) return false;
      if(/^[-?:,\[\]{}#&*!|>'"%@`]/.test(s) || /:\s|\s#|:$/.test(s)) return false;
      if(/^(true|false|null|yes|no|on|off|y|n|~)$/i.test(s)) return false;
      if(/^[-+]?(\d|\.\d)/.test(s) && !isNaN(Number(s))) return false;
      if(/^0x[0-9a-f]+$/i.test(s) || /^\d{4}-\d{2}-\d{2}/.test(s)) return false;
      return true;
    }
    function scalar(v){
      if(v === null) return 'null';
      if(typeof v === 'string') return plainOk(v) ? v : JSON.stringify(v);
      return String(v);
    }
    function key(k){ return plainOk(k) && !/^[-+]?\d/.test(k) ? k : JSON.stringify(k); }
    function isColl(v){ return v && typeof v === 'object'; }
    function empty(v){ return Array.isArray(v) ? !v.length : !Object.keys(v).length; }
    function dump(v, ind){
      var pad = ' '.repeat(ind), lines = [];
      if(Array.isArray(v)){
        v.forEach(function(it){
          if(isColl(it) && !empty(it)){ var sub = dump(it, ind + 2); sub[0] = pad + '- ' + sub[0].slice(ind + 2); lines = lines.concat(sub); }
          else lines.push(pad + '- ' + (isColl(it) ? (Array.isArray(it) ? '[]' : '{}') : scalar(it)));
        });
      } else {
        Object.keys(v).forEach(function(k){
          var it = v[k];
          if(isColl(it) && !empty(it)){ lines.push(pad + key(k) + ':'); lines = lines.concat(dump(it, ind + 2)); }
          else lines.push(pad + key(k) + ': ' + (isColl(it) ? (Array.isArray(it) ? '[]' : '{}') : scalar(it)));
        });
      }
      return lines;
    }
    function toYaml(v){ if(!isColl(v)) return scalar(v) + '\n'; if(empty(v)) return (Array.isArray(v) ? '[]' : '{}') + '\n'; return dump(v, 0).join('\n') + '\n'; }

    function stripC(s){
      var qt = null;
      for(var i = 0; i < s.length; i++){
        var c = s[i];
        if(qt){ if(c === qt && (qt === "'" || s[i - 1] !== '\\')) qt = null; }
        else if((c === '"' || c === "'") && (i === 0 || /[\s\[{,:\-]/.test(s[i - 1]))) qt = c;
        else if(c === '#' && (i === 0 || /\s/.test(s[i - 1]))) return s.slice(0, i);
      }
      return s;
    }
    function dq(s, n){ try{ return JSON.parse(s); }catch(e){ throw new Error('Line ' + n + ': invalid double-quoted string'); } }
    function plain(s){
      if(s === '' || s === '~' || /^null$/i.test(s)) return null;
      if(/^(true)$/i.test(s)) return true; if(/^(false)$/i.test(s)) return false;
      if(/^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(s)) return Number(s);
      if(/^0x[0-9a-fA-F]+$/.test(s)) return parseInt(s, 16);
      if(/^0o[0-7]+$/.test(s)) return parseInt(s.slice(2), 8);
      return s;
    }
    function scal(s, n){
      s = s.trim();
      if(s[0] === '"'){ if(s.length < 2 || s[s.length - 1] !== '"') throw new Error('Line ' + n + ': unterminated double-quoted string'); return dq(s, n); }
      if(s[0] === "'"){ if(s.length < 2 || s[s.length - 1] !== "'") throw new Error('Line ' + n + ': unterminated single-quoted string'); return s.slice(1, -1).replace(/''/g, "'"); }
      if(s[0] === '&' || s[0] === '*') throw new Error('Line ' + n + ': anchors and aliases are not supported');
      return plain(s);
    }
    function flow(str, n){
      var i = 0;
      function ws(){ while(i < str.length && /\s/.test(str[i])) i++; }
      function atom(stop){
        ws();
        var c = str[i];
        if(c === '[' || c === '{') return coll();
        if(c === '"'){ var j = i + 1; while(j < str.length && !(str[j] === '"' && str[j - 1] !== '\\')) j++; var r = dq(str.slice(i, j + 1), n); i = j + 1; return r; }
        if(c === "'"){ var k = i + 1; while(k < str.length && !(str[k] === "'" && str[k + 1] !== "'")) { if(str[k] === "'" ) k++; k++; } var r2 = str.slice(i + 1, k).replace(/''/g, "'"); i = k + 1; return r2; }
        var st = i; while(i < str.length && stop.indexOf(str[i]) < 0 && !(str[i] === ':' && /\s|,|\]|\}|$/.test(str[i + 1] || ' '))) i++;
        return plain(str.slice(st, i).trim());
      }
      function coll(){
        var open = str[i++], close = open === '[' ? ']' : '}', res = open === '[' ? [] : {};
        ws();
        while(i < str.length && str[i] !== close){
          var v = atom(',]}');
          ws();
          if(open === '{'){
            if(str[i] !== ':') throw new Error('Line ' + n + ': expected ":" inside { }');
            i++; var val = atom(',}'); res[String(v)] = val; ws();
          } else res.push(v);
          if(str[i] === ',') { i++; ws(); } else if(str[i] !== close) throw new Error('Line ' + n + ': expected "," or "' + close + '"');
        }
        if(str[i] !== close) throw new Error('Line ' + n + ': unclosed "' + open + '"');
        i++; return res;
      }
      var v = atom(''); ws();
      if(i < str.length) throw new Error('Line ' + n + ': unexpected text after flow collection');
      return v;
    }
    function parse(text){
      var raw = text.replace(/\r\n?/g, '\n').split('\n'), L = raw.map(function(r, i){ return {raw: r, n: i + 1}; }), p = 0;
      function info(l){ var s = stripC(l.raw).replace(/\s+$/, ''); if(!s.trim()) return null; if(/^\t/.test(s)) throw new Error('Line ' + l.n + ': tabs cannot be used for indentation'); return {ind: s.match(/^ */)[0].length, text: s.trim(), n: l.n}; }
      function skip(){ while(p < L.length){ var t = L[p].text !== undefined ? L[p] : info(L[p]); if(t) { if(!L[p].text) L[p] = t; if(/^(---|\.\.\.)$/.test(L[p].text) && L[p].ind === 0){ p++; continue; } return L[p]; } p++; } return null; }
      function block(ind, parentInd){
        var cur = skip(); if(!cur) return null;
        if(cur.ind < ind) return null;
        if(/^-(\s|$)/.test(cur.text)) return seq(cur.ind);
        if(keyOf(cur.text)) return map(cur.ind);
        p++; return inline(cur.text, cur.n, cur.ind);
      }
      function keyOf(t){
        var m;
        if(t[0] === '"'){ m = /^"((?:[^"\\]|\\.)*)"\s*:(\s|$)/.exec(t); if(m) return {k: dq('"' + m[1] + '"'), rest: t.slice(m[0].length).trim()}; return null; }
        if(t[0] === "'"){ m = /^'((?:[^']|'')*)'\s*:(\s|$)/.exec(t); if(m) return {k: m[1].replace(/''/g, "'"), rest: t.slice(m[0].length).trim()}; return null; }
        if(t[0] === '[' || t[0] === '{') return null;
        m = /^([^:#]+?)\s*:(\s|$)/.exec(t); if(m) return {k: String(plain(m[1].trim())), rest: t.slice(m[0].length).trim()};
        return null;
      }
      function inline(rest, n, ind){
        if(rest[0] === '|' || rest[0] === '>') return blockScalar(rest, ind);
        if(rest[0] === '[' || rest[0] === '{'){
          var s = rest, open = (s.match(/[\[{]/g) || []).length, close = (s.match(/[\]}]/g) || []).length;
          while(open > close && p < L.length){ var more = stripC(L[p].raw).trim(); p++; s += ' ' + more; open = (s.match(/[\[{]/g) || []).length; close = (s.match(/[\]}]/g) || []).length; }
          return flow(s, n);
        }
        return scal(rest, n);
      }
      function blockScalar(head, ind){
        var fold = head[0] === '>', keep = /\+/.test(head), strip = /-/.test(head), lines = [], bi = -1;
        while(p < L.length){
          var r = L[p].raw;
          if(!r.trim()){ lines.push(''); p++; continue; }
          var li = r.match(/^ */)[0].length;
          if(li <= ind) break;
          if(bi < 0) bi = li;
          lines.push(r.slice(Math.min(bi, li))); p++;
        }
        var trailing = 0; while(lines.length && lines[lines.length - 1] === ''){ lines.pop(); trailing++; }
        var txt = fold ? lines.reduce(function(a, l, i){ if(i === 0) return l; return a + (l === '' ? '\n' : (lines[i - 1] === '' ? '' : ' ') + l); }, '') : lines.join('\n');
        return strip ? txt : txt + (keep ? '\n'.repeat(trailing + 1) : '\n');
      }
      function map(ind){
        var o = {};
        for(;;){
          var cur = skip(); if(!cur || cur.ind !== ind) { if(cur && cur.ind > ind) throw new Error('Line ' + cur.n + ': unexpected indentation'); break; }
          if(/^-(\s|$)/.test(cur.text)) break;
          var kv = keyOf(cur.text); if(!kv) throw new Error('Line ' + cur.n + ': expected "key: value"');
          p++;
          if(Object.prototype.hasOwnProperty.call(o, kv.k)) throw new Error('Line ' + cur.n + ': duplicate key "' + kv.k + '"');
          if(kv.rest === ''){
            var nx = skip();
            if(nx && (nx.ind > ind || (nx.ind === ind && /^-(\s|$)/.test(nx.text)))) o[kv.k] = block(nx.ind, ind);
            else o[kv.k] = null;
          } else o[kv.k] = inline(kv.rest, cur.n, ind);
        }
        return o;
      }
      function seq(ind){
        var a = [];
        for(;;){
          var cur = skip(); if(!cur || cur.ind !== ind || !/^-(\s|$)/.test(cur.text)) { if(cur && cur.ind > ind) throw new Error('Line ' + cur.n + ': unexpected indentation'); break; }
          var rest = cur.text.slice(1).trim();
          if(rest === ''){ p++; var nx = skip(); a.push(nx && nx.ind > ind ? block(nx.ind, ind) : null); }
          else if(/^-(\s|$)/.test(rest) || keyOf(rest)){ var off = cur.text.length - cur.text.slice(1).trimStart().length; L[p] = {text: rest, ind: ind + off, n: cur.n}; a.push(block(ind + off, ind)); }
          else { p++; a.push(inline(rest, cur.n, ind)); }
        }
        return a;
      }
      var first = skip();
      if(!first) return null;
      var v = block(first.ind, -1), extra = skip();
      if(extra) throw new Error('Line ' + extra.n + ': unexpected content (check indentation)');
      return v;
    }
    return {toYaml: toYaml, parse: parse};
  })();

  reg('json-yaml', 'JSON ↔ YAML', function(body, q){
    body.innerHTML = '<div class="tool-row"><span class="seg" id="jy-dir"><button type="button" data-d="j2y" class="on">JSON → YAML</button><button type="button" data-d="y2j">YAML → JSON</button></span>' + sel('jy-ind', 'JSON indent', [['2', '2 spaces'], ['4', '4 spaces'], ['t', 'Tab'], ['0', 'Minified']]) + '</div>' +
      '<div class="tool-grid two">' + ta('jy-in', 'Input', 14, '{"name":"Velocity","tags":["a","b"]}') + ta('jy-out', 'Output', 14, '', 'readonly') + '</div>' +
      '<div class="tool-row">' + btn('jy-swap', 'Use output as input', true) + btn('jy-copy', 'Copy output', true) + btn('jy-dl', 'Download', true) + '</div><div class="tool-msg" id="jy-msg" role="status"></div>' +
      '<p class="hint">YAML support covers maps, lists, quoted and plain scalars, block scalars (| and &gt;), flow [ ] and { } collections and comments. Anchors, aliases, tags and multiple documents are not supported.</p>';
    var dir = 'j2y';
    function run(){
      var inp = q('#jy-in').value, o = q('#jy-out'), m = q('#jy-msg');
      if(!inp.trim()){ o.value = ''; msg(m, ''); return; }
      try{
        if(dir === 'j2y') o.value = Y.toYaml(JSON.parse(inp));
        else { var v = Y.parse(inp), ind = q('#jy-ind').value; o.value = JSON.stringify(v, null, ind === 't' ? '\t' : +ind || 0) + '\n'; }
        msg(m, 'Converted.', 'ok');
      }catch(e){ o.value = ''; msg(m, e.message, 'err'); }
    }
    q('#jy-dir').addEventListener('click', function(e){ var b = e.target.closest('button'); if(!b) return; dir = b.getAttribute('data-d'); qsa2(q('#jy-dir'), 'button').forEach(function(x){ x.classList.toggle('on', x === b); }); q('#jy-in').placeholder = dir === 'j2y' ? '{"name":"Velocity","tags":["a","b"]}' : 'name: Velocity\ntags:\n  - a\n  - b'; run(); });
    q('#jy-in').addEventListener('input', debounce(run, 150)); q('#jy-ind').addEventListener('change', run);
    q('#jy-swap').addEventListener('click', function(){ if(!q('#jy-out').value) return; q('#jy-in').value = q('#jy-out').value; var nb = qsa2(q('#jy-dir'), 'button').filter(function(b){ return b.getAttribute('data-d') !== dir; })[0]; nb.click(); });
    q('#jy-copy').addEventListener('click', function(){ copyText(q('#jy-out').value, this); });
    q('#jy-dl').addEventListener('click', function(){ if(q('#jy-out').value) save(dir === 'j2y' ? 'converted.yaml' : 'converted.json', q('#jy-out').value); });
  });

  /* ================= JSON array → table / CSV ================= */
  reg('json-table', 'JSON ARRAY TO TABLE', function(body, q){
    body.innerHTML = ta('jt-in', 'JSON (array of objects, array of arrays, or an object of objects)', 9, '[{"id":1,"name":"Ada","address":{"city":"London"}},{"id":2,"name":"Alan"}]') +
      '<div class="tool-row">' + sel('jt-delim', 'CSV delimiter', [[',', 'Comma'], [';', 'Semicolon'], ['\t', 'Tab'], ['|', 'Pipe']]) + chk('jt-flat', 'Flatten nested objects (a.b)', true) + chk('jt-head', 'Include header row', true) + '</div>' +
      '<div class="tool-row">' + btn('jt-csv', 'Copy CSV') + btn('jt-md', 'Copy Markdown', true) + btn('jt-html', 'Copy HTML', true) + btn('jt-dl', 'Download CSV', true) + '</div><div class="tool-msg" id="jt-msg" role="status"></div>' +
      '<div id="jt-wrap" style="overflow:auto;max-height:420px;border:1px solid var(--line);border-radius:6px"></div>';
    var rows = [], cols = [];
    function flat(v, pre, o, on){
      if(on && v && typeof v === 'object' && !Array.isArray(v)){ var ks = Object.keys(v); if(!ks.length && pre) o[pre] = ''; ks.forEach(function(k){ flat(v[k], pre ? pre + '.' + k : k, o, on); }); }
      else o[pre] = v;
      return o;
    }
    function cell(v){ if(v === null || v === undefined) return ''; if(typeof v === 'object') return JSON.stringify(v); return String(v); }
    function csvCell(s, d){ return /["\r\n]/.test(s) || s.indexOf(d) >= 0 ? '"' + s.replace(/"/g, '""') + '"' : s; }
    function build(){
      var m = q('#jt-msg'), raw = q('#jt-in').value.trim(), w = q('#jt-wrap');
      rows = []; cols = []; w.innerHTML = '';
      if(!raw){ msg(m, ''); return; }
      var data; try{ data = JSON.parse(raw); }catch(e){ msg(m, 'Invalid JSON: ' + e.message, 'err'); return; }
      if(data && !Array.isArray(data) && typeof data === 'object') data = Object.keys(data).map(function(k){ var v = data[k]; return v && typeof v === 'object' && !Array.isArray(v) ? Object.assign({_key: k}, v) : {_key: k, value: v}; });
      if(!Array.isArray(data)){ msg(m, 'Expected an array or an object at the top level.', 'err'); return; }
      var fl = q('#jt-flat').checked, seen = {};
      if(data.length && data.every(Array.isArray)){
        var n = Math.max.apply(null, data.map(function(r){ return r.length; })); for(var i = 0; i < n; i++) cols.push('Column ' + (i + 1));
        rows = data.map(function(r){ return r.map(cell); });
      } else {
        var objs = data.map(function(r){ return r && typeof r === 'object' && !Array.isArray(r) ? flat(r, '', {}, fl) : {value: r}; });
        objs.forEach(function(o){ Object.keys(o).forEach(function(k){ if(!seen[k]){ seen[k] = 1; cols.push(k); } }); });
        rows = objs.map(function(o){ return cols.map(function(c){ return cell(o[c]); }); });
      }
      var html = '<table style="border-collapse:collapse;width:100%;font-size:12px"><thead><tr>' + cols.map(function(c){ return '<th style="position:sticky;top:0;background:var(--surface-2);text-align:left;padding:6px 10px;border-bottom:1px solid var(--line);white-space:nowrap">' + esc(c) + '</th>'; }).join('') + '</tr></thead><tbody>' +
        rows.slice(0, 500).map(function(r){ return '<tr>' + r.map(function(c){ return '<td style="padding:5px 10px;border-bottom:1px solid var(--line);vertical-align:top;max-width:340px;overflow:hidden;text-overflow:ellipsis">' + esc(c) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table>';
      w.innerHTML = html;
      msg(m, rows.length + ' row' + (rows.length === 1 ? '' : 's') + ', ' + cols.length + ' column' + (cols.length === 1 ? '' : 's') + (rows.length > 500 ? ' (preview shows the first 500; exports include everything)' : ''), 'ok');
    }
    function csv(){ var d = q('#jt-delim').value, l = []; if(q('#jt-head').checked) l.push(cols.map(function(c){ return csvCell(c, d); }).join(d)); rows.forEach(function(r){ l.push(r.map(function(c){ return csvCell(c, d); }).join(d)); }); return l.join('\r\n') + '\r\n'; }
    function md(){ var e = function(s){ return s.replace(/\|/g, '\\|').replace(/\n/g, ' '); }; return '| ' + cols.map(e).join(' | ') + ' |\n|' + cols.map(function(){ return ' --- |'; }).join('') + '\n' + rows.map(function(r){ return '| ' + r.map(e).join(' | ') + ' |'; }).join('\n') + '\n'; }
    function html(){ return '<table>\n  <thead>\n    <tr>' + cols.map(function(c){ return '<th>' + esc(c) + '</th>'; }).join('') + '</tr>\n  </thead>\n  <tbody>\n' + rows.map(function(r){ return '    <tr>' + r.map(function(c){ return '<td>' + esc(c) + '</td>'; }).join('') + '</tr>'; }).join('\n') + '\n  </tbody>\n</table>\n'; }
    q('#jt-in').addEventListener('input', debounce(build, 200)); ['#jt-flat', '#jt-head', '#jt-delim'].forEach(function(s){ q(s).addEventListener('change', build); });
    q('#jt-csv').addEventListener('click', function(){ if(rows.length) copyText(csv(), this); });
    q('#jt-md').addEventListener('click', function(){ if(rows.length) copyText(md(), this); });
    q('#jt-html').addEventListener('click', function(){ if(rows.length) copyText(html(), this); });
    q('#jt-dl').addEventListener('click', function(){ if(rows.length) save('table.csv', '\ufeff' + csv(), 'text/csv'); });
  });

  /* ================= Escape / unescape ================= */
  reg('escape-unescape', 'ESCAPE / UNESCAPE', function(body, q){
    var JSU = {n:'\n', t:'\t', r:'\r', b:'\b', f:'\f', v:'\v', '0':'\0', "'":"'", '"':'"', '\\':'\\', '/':'/'};
    function unescJs(s){
      return s.replace(/\\(?:u\{([0-9a-fA-F]+)\}|u([0-9a-fA-F]{4})|x([0-9a-fA-F]{2})|([\s\S]))/g, function(m, a, b, c, d){
        if(a) return String.fromCodePoint(parseInt(a, 16)); if(b) return String.fromCharCode(parseInt(b, 16)); if(c) return String.fromCharCode(parseInt(c, 16));
        return Object.prototype.hasOwnProperty.call(JSU, d) ? JSU[d] : d;
      });
    }
    var MODES = {
      json: {label: 'JSON string', e: function(s){ return JSON.stringify(s).slice(1, -1); }, u: function(s){ return JSON.parse('"' + s.replace(/(^|[^\\])((?:\\\\)*)"/g, '$1$2\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t') + '"'); }},
      js: {label: 'JavaScript / Java / C / Python string', e: function(s){ return JSON.stringify(s).slice(1, -1).replace(/'/g, "\\'"); }, u: unescJs},
      regex: {label: 'Regular expression', e: function(s){ return s.replace(/[.*+?^${}()|[\]\\\/-]/g, '\\$&'); }, u: function(s){ return s.replace(/\\(.)/g, '$1'); }},
      sql: {label: 'SQL string (single quotes)', e: function(s){ return s.replace(/'/g, "''"); }, u: function(s){ return s.replace(/''/g, "'"); }},
      csv: {label: 'CSV field', e: function(s){ return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }, u: function(s){ var t = s.trim(); return t.length > 1 && t[0] === '"' && t[t.length - 1] === '"' ? t.slice(1, -1).replace(/""/g, '"') : s; }},
      shell: {label: 'Shell (single-quoted)', e: function(s){ return "'" + s.replace(/'/g, "'\\''") + "'"; }, u: function(s){ return s.replace(/^'|'$/g, '').replace(/'\\''/g, "'"); }},
      xml: {label: 'XML text', e: function(s){ return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;'); }, u: function(s){ return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, function(m, n){ return String.fromCodePoint(+n); }).replace(/&#x([0-9a-f]+);/gi, function(m, n){ return String.fromCodePoint(parseInt(n, 16)); }).replace(/&amp;/g, '&'); }},
      unicode: {label: 'Unicode \\uXXXX', e: function(s){ return s.replace(/[^\x20-\x7e]/g, function(c){ return '\\u' + ('0000' + c.charCodeAt(0).toString(16)).slice(-4); }); }, u: function(s){ return s.replace(/\\u([0-9a-fA-F]{4})/g, function(m, h){ return String.fromCharCode(parseInt(h, 16)); }); }},
      percent: {label: 'URL component (percent)', e: function(s){ return encodeURIComponent(s); }, u: function(s){ return decodeURIComponent(s); }}
    };
    body.innerHTML = '<div class="tool-row">' + sel('eu-mode', 'Format', Object.keys(MODES).map(function(k){ return [k, MODES[k].label]; })) + '<span class="seg" id="eu-dir"><button type="button" data-d="e" class="on">Escape</button><button type="button" data-d="u">Unescape</button></span></div>' +
      '<div class="tool-grid two">' + ta('eu-in', 'Input', 10, 'Type or paste text') + ta('eu-out', 'Output', 10, '', 'readonly') + '</div><div class="tool-row">' + btn('eu-swap', 'Swap', true) + btn('eu-copy', 'Copy output', true) + '</div><div class="tool-msg" id="eu-msg" role="status"></div>';
    var dir = 'e';
    function run(){
      var m = q('#eu-msg'), inp = q('#eu-in').value;
      try{ q('#eu-out').value = inp ? MODES[q('#eu-mode').value][dir](inp) : ''; msg(m, ''); }
      catch(e){ q('#eu-out').value = ''; msg(m, 'Could not ' + (dir === 'e' ? 'escape' : 'unescape') + ' this text: ' + e.message, 'err'); }
    }
    q('#eu-in').addEventListener('input', run); q('#eu-mode').addEventListener('change', run);
    q('#eu-dir').addEventListener('click', function(e){ var b = e.target.closest('button'); if(!b) return; dir = b.getAttribute('data-d'); qsa2(q('#eu-dir'), 'button').forEach(function(x){ x.classList.toggle('on', x === b); }); run(); });
    q('#eu-swap').addEventListener('click', function(){ var o = q('#eu-out').value; if(!o) return; q('#eu-in').value = o; qsa2(q('#eu-dir'), 'button').filter(function(b){ return b.getAttribute('data-d') !== dir; })[0].click(); });
    q('#eu-copy').addEventListener('click', function(){ copyText(q('#eu-out').value, this); });
  });

  /* ================= List comparer ================= */
  reg('list-comparer', 'LIST COMPARER', function(body, q){
    body.innerHTML = '<div class="tool-grid two">' + ta('lc-a', 'List A', 10, 'One item per line') + ta('lc-b', 'List B', 10, 'One item per line') + '</div>' +
      '<div class="tool-row">' + sel('lc-split', 'Separator', [['\n', 'New line'], [',', 'Comma'], [';', 'Semicolon'], ['\t', 'Tab'], [' ', 'Space']]) + sel('lc-sort', 'Sort results', [['none', 'Keep order'], ['asc', 'A → Z'], ['desc', 'Z → A']]) + '</div>' +
      '<div class="tool-row">' + chk('lc-trim', 'Trim items', true) + chk('lc-case', 'Ignore case', false) + chk('lc-empty', 'Ignore empty items', true) + chk('lc-dedupe', 'Remove duplicates', true) + '</div>' +
      '<div class="tool-grid" id="lc-res"></div>';
    function items(s){
      var sp = q('#lc-split').value, arr = s.split(sp === '\n' ? /\r?\n/ : sp);
      if(q('#lc-trim').checked) arr = arr.map(function(x){ return x.trim(); });
      if(q('#lc-empty').checked) arr = arr.filter(function(x){ return x !== ''; });
      return arr;
    }
    function run(){
      var ci = q('#lc-case').checked, kf = function(x){ return ci ? x.toLowerCase() : x; };
      var A = items(q('#lc-a').value), B = items(q('#lc-b').value), da = q('#lc-dedupe').checked;
      var sa = {}, sb = {}; A.forEach(function(x){ sa[kf(x)] = 1; }); B.forEach(function(x){ sb[kf(x)] = 1; });
      function uniq(arr){ if(!da) return arr; var s = {}; return arr.filter(function(x){ var k = kf(x); if(s[k]) return false; s[k] = 1; return true; }); }
      var onlyA = uniq(A.filter(function(x){ return !sb[kf(x)]; })), onlyB = uniq(B.filter(function(x){ return !sa[kf(x)]; })), both = uniq(A.filter(function(x){ return sb[kf(x)]; })), uni = uniq(A.concat(B)), sym = onlyA.concat(onlyB);
      var so = q('#lc-sort').value, cmp = function(a, b){ return a.localeCompare(b, undefined, {numeric: true, sensitivity: ci ? 'accent' : 'variant'}); };
      var sets = [['Only in A', onlyA], ['Only in B', onlyB], ['In both', both], ['All (union)', uni], ['Different (A or B, not both)', sym]];
      q('#lc-res').innerHTML = sets.map(function(s, i){ var l = s[1].slice(); if(so !== 'none') l.sort(cmp); if(so === 'desc') l.reverse(); sets[i][1] = l;
        return '<div class="result-card"><div class="field-label">' + s[0] + ' <b>(' + l.length + ')</b></div><textarea rows="7" readonly spellcheck="false" style="width:100%">' + esc(l.join('\n')) + '</textarea><div class="tool-row" style="margin-top:6px"><button type="button" class="game-btn secondary" data-i="' + i + '">Copy</button></div></div>'; }).join('');
      q('#lc-res').onclick = function(e){ var b = e.target.closest('button[data-i]'); if(b) copyText(sets[+b.getAttribute('data-i')][1].join('\n'), b); };
    }
    ['#lc-a', '#lc-b'].forEach(function(s){ q(s).addEventListener('input', debounce(run, 150)); });
    ['#lc-split', '#lc-sort', '#lc-trim', '#lc-case', '#lc-empty', '#lc-dedupe'].forEach(function(s){ q(s).addEventListener('change', run); });
    run();
  });

  /* ================= Text analyzer & utilities ================= */
  reg('text-analyzer', 'TEXT ANALYZER & UTILITIES', function(body, q){
    body.innerHTML = ta('ta-in', 'Text', 10, 'Paste or type text to analyse') +
      '<div class="tool-row"><b style="font-size:11px;font-family:var(--font-mono);opacity:.8">UTILITIES</b>' +
      [['sort', 'Sort lines'], ['sortr', 'Sort Z→A'], ['uniq', 'Remove duplicate lines'], ['blank', 'Remove blank lines'], ['trim', 'Trim lines'], ['rev', 'Reverse lines'], ['shuf', 'Shuffle lines'], ['num', 'Number lines'], ['up', 'UPPERCASE'], ['low', 'lowercase'], ['title', 'Title Case'], ['spaces', 'Collapse spaces'], ['join', 'Join lines']].map(function(u){ return '<button type="button" class="game-btn secondary" data-u="' + u[0] + '">' + u[1] + '</button>'; }).join('') + '</div>' +
      '<div class="tool-grid" id="ta-stats"></div><div class="result-card"><div class="field-label">Top words ' + chk('ta-stop', 'Hide common words', true) + '</div><div id="ta-top" style="font-family:var(--font-mono);font-size:12px"></div></div>';
    var STOP = 'a an the and or but if of to in on at by for with from as is are was were be been it its this that these those i you he she we they not no do does did have has had will would can could so than then there their them our your my me his her'.split(' ').reduce(function(o, w){ o[w] = 1; return o; }, {});
    var UT = {
      sort: function(l){ return l.slice().sort(function(a, b){ return a.localeCompare(b, undefined, {numeric: true}); }); }, sortr: function(l){ return UT.sort(l).reverse(); },
      uniq: function(l){ var s = {}; return l.filter(function(x){ if(s[x]) return false; s[x] = 1; return true; }); }, blank: function(l){ return l.filter(function(x){ return x.trim(); }); },
      trim: function(l){ return l.map(function(x){ return x.trim(); }); }, rev: function(l){ return l.slice().reverse(); },
      shuf: function(l){ l = l.slice(); for(var i = l.length - 1; i > 0; i--){ var j = Math.floor(Math.random() * (i + 1)), t = l[i]; l[i] = l[j]; l[j] = t; } return l; },
      num: function(l){ return l.map(function(x, i){ return (i + 1) + '. ' + x; }); }, up: function(l){ return l.map(function(x){ return x.toUpperCase(); }); }, low: function(l){ return l.map(function(x){ return x.toLowerCase(); }); },
      title: function(l){ return l.map(function(x){ return x.toLowerCase().replace(/(^|[\s\-(])(\S)/g, function(m, a, b){ return a + b.toUpperCase(); }); }); },
      spaces: function(l){ return l.map(function(x){ return x.replace(/[ \t]+/g, ' '); }); }, join: function(l){ return [l.join(' ')]; }
    };
    function syll(w){ w = w.toLowerCase().replace(/[^a-z]/g, ''); if(!w) return 0; if(w.length <= 3) return 1; w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, ''); var m = w.match(/[aeiouy]{1,2}/g); return m ? m.length : 1; }
    function run(){
      var t = q('#ta-in').value, words = t.match(/[\p{L}\p{N}'’-]+/gu) || [], sent = (t.match(/[^.!?…]+[.!?…]+(\s|$)|[^.!?…]+$/g) || []).filter(function(s){ return /\S/.test(s); });
      var paras = t.split(/\n\s*\n/).filter(function(p){ return p.trim(); }), lines = t ? t.split(/\r?\n/) : [];
      var uniqW = {}; words.forEach(function(w){ uniqW[w.toLowerCase()] = (uniqW[w.toLowerCase()] || 0) + 1; });
      var syl = words.reduce(function(a, w){ return a + syll(w); }, 0), wc = words.length, sc = Math.max(1, sent.length);
      var flesch = wc ? 206.835 - 1.015 * (wc / sc) - 84.6 * (syl / wc) : 0, grade = wc ? 0.39 * (wc / sc) + 11.8 * (syl / wc) - 15.59 : 0;
      var longest = words.reduce(function(a, w){ return w.length > a.length ? w : a; }, '');
      var bytes = new Blob([t]).size, mins = function(n){ var m = n / 60; return m < 1 ? Math.max(1, Math.round(n)) + ' sec' : (Math.round(m * 10) / 10) + ' min'; };
      var stats = [['Characters', t.length], ['Without spaces', t.replace(/\s/g, '').length], ['Words', wc], ['Unique words', Object.keys(uniqW).length], ['Sentences', sent.length], ['Paragraphs', paras.length], ['Lines', lines.length], ['Bytes (UTF-8)', bytes],
        ['Avg word length', wc ? (words.join('').length / wc).toFixed(1) : '0'], ['Longest word', longest ? longest.slice(0, 18) + (longest.length > 18 ? '…' : '') : '–'], ['Reading time', mins(wc / 238 * 60)], ['Speaking time', mins(wc / 150 * 60)],
        ['Reading ease', wc ? Math.max(0, Math.min(100, flesch)).toFixed(0) + ' / 100' : '–'], ['Grade level', wc ? Math.max(0, grade).toFixed(1) : '–']];
      q('#ta-stats').innerHTML = stats.map(function(s){ return '<div class="result-card" style="padding:10px"><div class="field-label" style="margin:0">' + s[0] + '</div><div style="font:600 18px var(--font-mono)">' + esc(String(typeof s[1] === 'number' ? s[1].toLocaleString() : s[1])) + '</div></div>'; }).join('');
      var hide = q('#ta-stop').checked, top = Object.keys(uniqW).filter(function(w){ return !(hide && STOP[w]) && w.length > 1; }).sort(function(a, b){ return uniqW[b] - uniqW[a] || a.localeCompare(b); }).slice(0, 12);
      q('#ta-top').innerHTML = top.length ? top.map(function(w){ return '<div style="display:flex;gap:10px;align-items:center;margin:3px 0"><span style="min-width:110px">' + esc(w) + '</span><span style="flex:1;height:8px;background:var(--surface-2);border-radius:4px;overflow:hidden"><i style="display:block;height:100%;width:' + Math.round(uniqW[w] / uniqW[top[0]] * 100) + '%;background:var(--accent)"></i></span><b>' + uniqW[w] + '</b></div>'; }).join('') : '<span style="color:var(--muted)">No words yet.</span>';
    }
    q('#ta-in').addEventListener('input', debounce(run, 120)); q('#ta-stop').addEventListener('change', run);
    body.addEventListener('click', function(e){ var b = e.target.closest('button[data-u]'); if(!b) return; var ta = q('#ta-in'); if(!ta.value) return; var lines = ta.value.split(/\r?\n/); ta.value = UT[b.getAttribute('data-u')](lines).join('\n'); run(); });
    run();
  });

  /* ================= Base64 image ================= */
  reg('base64-image', 'BASE64 IMAGE', function(body, q){
    body.innerHTML = '<div class="tool-grid two"><div class="result-card"><div class="field-label">Image → Base64</div><label class="fv-drop" id="bi-drop" for="bi-file"><b>Drop an image here</b> or click to choose<span>PNG, JPEG, GIF, WebP, SVG, ICO, AVIF</span></label><input type="file" id="bi-file" accept="image/*" hidden data-nopersist>' +
      sel('bi-fmt', 'Output', [['uri', 'Data URI'], ['raw', 'Raw Base64'], ['img', 'HTML <img> tag'], ['css', 'CSS background']]) + '<textarea id="bi-out" rows="8" readonly spellcheck="false" style="width:100%"></textarea><div class="tool-row" style="margin-top:6px">' + btn('bi-copy', 'Copy', true) + btn('bi-dl', 'Download .txt', true) + '</div><div class="hint" id="bi-info"></div></div>' +
      '<div class="result-card"><div class="field-label">Base64 → Image</div>' + ta('bi-in', 'Paste a data URI or raw Base64', 8, 'data:image/png;base64,iVBORw0KGgo…') + '<div class="tool-row">' + btn('bi-dec', 'Preview image') + btn('bi-save', 'Download image', true) + '</div><div class="tool-msg" id="bi-msg" role="status"></div><div id="bi-prev" style="margin-top:8px;text-align:center;background:repeating-conic-gradient(var(--surface-2) 0 25%,var(--surface) 0 50%) 0 0/16px 16px;border:1px solid var(--line);border-radius:6px;min-height:80px"></div></div></div>';
    var cur = null, dec = null;
    function render(){
      if(!cur){ q('#bi-out').value = ''; q('#bi-info').textContent = ''; return; }
      var f = q('#bi-fmt').value, v = f === 'raw' ? cur.raw : f === 'img' ? '<img src="' + cur.uri + '" alt="">' : f === 'css' ? 'background-image: url("' + cur.uri + '");' : cur.uri;
      q('#bi-out').value = v;
      q('#bi-info').textContent = cur.name + ' · ' + cur.type + ' · ' + cur.size.toLocaleString() + ' bytes → ' + v.length.toLocaleString() + ' characters (' + Math.round(cur.raw.length / cur.size * 100) + '% of the original size as Base64)';
    }
    function load(file){
      if(!file) return;
      if(!/^image\//.test(file.type) && !/\.(svg|ico|avif|webp|png|jpe?g|gif)$/i.test(file.name)){ q('#bi-info').textContent = 'That does not look like an image file.'; return; }
      var r = new FileReader();
      r.onload = function(){ var uri = String(r.result), i = uri.indexOf(','); cur = {uri: uri, raw: uri.slice(i + 1), name: file.name, type: file.type || 'image', size: file.size}; render(); };
      r.onerror = function(){ q('#bi-info').textContent = 'Could not read that file.'; };
      r.readAsDataURL(file);
    }
    q('#bi-file').addEventListener('change', function(){ load(this.files[0]); this.value = ''; });
    var drop = q('#bi-drop'); ['dragenter', 'dragover'].forEach(function(ev){ drop.addEventListener(ev, function(e){ e.preventDefault(); }); }); drop.addEventListener('drop', function(e){ e.preventDefault(); load(e.dataTransfer.files[0]); });
    q('#bi-fmt').addEventListener('change', render);
    q('#bi-copy').addEventListener('click', function(){ if(q('#bi-out').value) copyText(q('#bi-out').value, this); });
    q('#bi-dl').addEventListener('click', function(){ if(q('#bi-out').value) save('base64-image.txt', q('#bi-out').value); });
    function sniff(b){
      var h = Array.prototype.slice.call(b.subarray(0, 12)).map(function(x){ return ('0' + x.toString(16)).slice(-2); }).join('');
      if(h.indexOf('89504e47') === 0) return ['image/png', 'png']; if(h.indexOf('ffd8ff') === 0) return ['image/jpeg', 'jpg']; if(h.indexOf('47494638') === 0) return ['image/gif', 'gif'];
      if(h.indexOf('52494646') === 0 && h.slice(16, 24) === '57454250') return ['image/webp', 'webp']; if(h.indexOf('424d') === 0) return ['image/bmp', 'bmp']; if(h.indexOf('00000100') === 0) return ['image/x-icon', 'ico'];
      if(h.slice(8, 24) === '6674797061766966') return ['image/avif', 'avif'];
      var s = String.fromCharCode.apply(null, b.subarray(0, 200)); if(/<svg|<\?xml/i.test(s)) return ['image/svg+xml', 'svg'];
      return null;
    }
    q('#bi-dec').addEventListener('click', function(){
      var m = q('#bi-msg'), v = q('#bi-in').value.trim(); dec = null; q('#bi-prev').innerHTML = '';
      if(!v){ msg(m, 'Paste Base64 first.', 'err'); return; }
      var mm = /^data:([^;,]*)(;[^,]*)?,/i.exec(v), raw = mm ? v.slice(mm[0].length) : v;
      try{ raw = decodeURIComponent(raw); }catch(e){}
      raw = raw.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
      while(raw.length % 4) raw += '=';
      var bytes; try{ var bin = atob(raw); bytes = new Uint8Array(bin.length); for(var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i); }catch(e){ msg(m, 'That is not valid Base64.', 'err'); return; }
      var t = sniff(bytes) || (mm && mm[1] && /^image\//.test(mm[1]) ? [mm[1], mm[1].split('/')[1].replace('+xml', '')] : null);
      if(!t){ msg(m, 'Decoded ' + bytes.length.toLocaleString() + ' bytes, but they do not look like a supported image.', 'err'); return; }
      var blob = new Blob([bytes], {type: t[0]}), url = URL.createObjectURL(blob), img = new Image();
      img.style.maxWidth = '100%'; img.style.maxHeight = '320px'; img.alt = 'Decoded image preview';
      img.onload = function(){ msg(m, t[0] + ' · ' + img.naturalWidth + '×' + img.naturalHeight + ' · ' + bytes.length.toLocaleString() + ' bytes', 'ok'); };
      img.onerror = function(){ msg(m, 'The data was decoded but the browser cannot display it as an image.', 'err'); };
      img.src = url; q('#bi-prev').appendChild(img); dec = {blob: blob, ext: t[1]};
    });
    q('#bi-save').addEventListener('click', function(){ if(!dec) return; var u = URL.createObjectURL(dec.blob), a = document.createElement('a'); a.href = u; a.download = 'image.' + dec.ext; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function(){ URL.revokeObjectURL(u); }, 20000); });
  });

  /* ================= Certificate decoder (X.509 PEM / DER) ================= */
  var OIDS = {'2.5.4.3':'CN','2.5.4.6':'C','2.5.4.7':'L','2.5.4.8':'ST','2.5.4.10':'O','2.5.4.11':'OU','2.5.4.5':'serialNumber','2.5.4.9':'street','2.5.4.17':'postalCode','1.2.840.113549.1.9.1':'emailAddress','0.9.2342.19200300.100.1.25':'DC',
    '1.2.840.113549.1.1.1':'RSA','1.2.840.113549.1.1.5':'SHA-1 with RSA','1.2.840.113549.1.1.11':'SHA-256 with RSA','1.2.840.113549.1.1.12':'SHA-384 with RSA','1.2.840.113549.1.1.13':'SHA-512 with RSA','1.2.840.113549.1.1.10':'RSA-PSS',
    '1.2.840.10045.2.1':'EC','1.2.840.10045.4.3.2':'ECDSA with SHA-256','1.2.840.10045.4.3.3':'ECDSA with SHA-384','1.2.840.10045.4.3.4':'ECDSA with SHA-512','1.3.101.112':'Ed25519','1.3.101.113':'Ed448',
    '1.2.840.10045.3.1.7':'P-256','1.3.132.0.34':'P-384','1.3.132.0.35':'P-521',
    '2.5.29.17':'Subject Alternative Name','2.5.29.19':'Basic Constraints','2.5.29.15':'Key Usage','2.5.29.37':'Extended Key Usage','2.5.29.14':'Subject Key Identifier','2.5.29.35':'Authority Key Identifier','2.5.29.31':'CRL Distribution Points','1.3.6.1.5.5.7.1.1':'Authority Info Access','2.5.29.32':'Certificate Policies','1.3.6.1.4.1.11129.2.4.2':'Embedded SCTs',
    '1.3.6.1.5.5.7.3.1':'TLS server auth','1.3.6.1.5.5.7.3.2':'TLS client auth','1.3.6.1.5.5.7.3.3':'Code signing','1.3.6.1.5.5.7.3.4':'Email protection','1.3.6.1.5.5.7.3.8':'Time stamping','1.3.6.1.5.5.7.3.9':'OCSP signing'};
  reg('certificate-decoder', 'CERTIFICATE DECODER', function(body, q){
    body.innerHTML = ta('cd-in', 'Certificate (PEM, may contain a chain)', 9, '-----BEGIN CERTIFICATE-----\nMIIF…\n-----END CERTIFICATE-----') +
      '<div class="tool-row"><label class="game-btn secondary" for="cd-file" style="cursor:pointer">Open .pem / .crt / .cer file</label><input type="file" id="cd-file" accept=".pem,.crt,.cer,.der,.txt" hidden data-nopersist>' + btn('cd-clear', 'Clear', true) + '</div><div class="tool-msg" id="cd-msg" role="status"></div><div id="cd-res"></div>' +
      '<p class="hint">Decoded locally in your browser. Only public certificates belong here; never paste a private key. Signature validity and trust chains are not verified.</p>';
    function oid(b){ var o = [Math.floor(b[0] / 40), b[0] % 40], v = 0; for(var i = 1; i < b.length; i++){ v = v * 128 + (b[i] & 127); if(!(b[i] & 128)){ o.push(v); v = 0; } } return o.join('.'); }
    function tlv(b, p){ var tag = b[p++], len = b[p++]; if(len & 128){ var n = len & 127, l = 0; for(var i = 0; i < n; i++) l = l * 256 + b[p++]; len = l; } if(p + len > b.length) throw new Error('Truncated or invalid DER data'); return {tag: tag, s: p, e: p + len}; }
    function kids(b, t){ var r = [], p = t.s; while(p < t.e){ var c = tlv(b, p); r.push(c); p = c.e; } return r; }
    function str(b, t){ var a = b.subarray(t.s, t.e); if(t.tag === 0x1e){ var s = ''; for(var i = 0; i < a.length; i += 2) s += String.fromCharCode(a[i] * 256 + a[i + 1]); return s; } try{ return new TextDecoder(t.tag === 0x0c || t.tag === 0x13 || t.tag === 0x16 || t.tag === 0x14 ? 'utf-8' : 'utf-8', {fatal: false}).decode(a); }catch(e){ return ''; } }
    function hex(a, sep){ return Array.prototype.map.call(a, function(x){ return ('0' + x.toString(16)).slice(-2); }).join(sep || ''); }
    function name(b, t){ return kids(b, t).map(function(set){ return kids(b, set).map(function(atv){ var k = kids(b, atv); var o = oid(b.subarray(k[0].s, k[0].e)); return (OIDS[o] || o) + '=' + str(b, k[1]); }).join('+'); }).join(', '); }
    function time(b, t){ var s = str(b, t), m; if(t.tag === 0x17 && (m = /^(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)?Z$/.exec(s))){ var y = +m[1]; y += y >= 50 ? 1900 : 2000; return new Date(Date.UTC(y, m[2] - 1, m[3], m[4], m[5], m[6] || 0)); } if((m = /^(\d{4})(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)?/.exec(s))) return new Date(Date.UTC(m[1], m[2] - 1, m[3], m[4], m[5], m[6] || 0)); return null; }
    function ip(a){ if(a.length === 4) return Array.prototype.join.call(a, '.'); var p = []; for(var i = 0; i < a.length; i += 2) p.push((a[i] * 256 + a[i + 1]).toString(16)); return p.join(':'); }
    function ext(b, e){
      var k = kids(b, e), id = oid(b.subarray(k[0].s, k[0].e)), crit = k.length > 2 && b[k[1].s] !== 0, v = k[k.length - 1], inner = tlv(b, v.s), val = '';
      try{
        if(id === '2.5.29.17') val = kids(b, inner).map(function(g){ var a = b.subarray(g.s, g.e); return g.tag === 0x82 ? 'DNS:' + str(b, g) : g.tag === 0x87 ? 'IP:' + ip(a) : g.tag === 0x81 ? 'email:' + str(b, g) : g.tag === 0x86 ? 'URI:' + str(b, g) : 'other'; }).join(', ');
        else if(id === '2.5.29.19'){ var kc = kids(b, inner), ca = kc.length && kc[0].tag === 1 && b[kc[0].s] !== 0; var pl = kc.filter(function(x){ return x.tag === 2; })[0]; val = 'CA: ' + (ca ? 'yes' : 'no') + (pl ? ', path length ' + b[pl.s] : ''); }
        else if(id === '2.5.29.15'){ var bits = b.subarray(inner.s + 1, inner.e), names = ['Digital Signature', 'Non-Repudiation', 'Key Encipherment', 'Data Encipherment', 'Key Agreement', 'Certificate Sign', 'CRL Sign', 'Encipher Only', 'Decipher Only'], on = []; for(var i = 0; i < 9; i++) if(bits[i >> 3] & (128 >> (i & 7))) on.push(names[i]); val = on.join(', '); }
        else if(id === '2.5.29.37') val = kids(b, inner).map(function(o){ var x = oid(b.subarray(o.s, o.e)); return OIDS[x] || x; }).join(', ');
        else if(id === '2.5.29.14') val = hex(b.subarray(inner.s, inner.e), ':').toUpperCase();
        else val = '(' + (inner.e - inner.s) + ' bytes)';
      }catch(er){ val = '(could not decode)'; }
      return {name: OIDS[id] || id, crit: crit, val: val};
    }
    function parseCert(der){
      var b = der, c = tlv(b, 0), top = kids(b, c), tbs = kids(b, top[0]), i = 0, version = 1;
      if(tbs[0].tag === 0xa0){ version = b[tlv(b, tbs[0].s).s] + 1; i = 1; }
      var serial = hex(b.subarray(tbs[i].s, tbs[i].e), ':').toUpperCase(), sig = kids(b, tbs[i + 1]), sigAlg = oid(b.subarray(sig[0].s, sig[0].e));
      var issuer = name(b, tbs[i + 2]), val = kids(b, tbs[i + 3]), nb = time(b, val[0]), na = time(b, val[1]), subject = name(b, tbs[i + 4]), spki = kids(b, tbs[i + 5]), alg = kids(b, spki[0]), algOid = oid(b.subarray(alg[0].s, alg[0].e));
      var keyInfo = OIDS[algOid] || algOid, bs = spki[1];
      if(algOid === '1.2.840.113549.1.1.1'){ try{ var rsa = tlv(b, bs.s + 1), mod = kids(b, rsa)[0], m0 = b.subarray(mod.s, mod.e), st = 0; while(st < m0.length - 1 && m0[st] === 0) st++; var bits = (m0.length - st) * 8 - (Math.clz32(m0[st]) - 24); keyInfo = 'RSA ' + bits + ' bit'; }catch(e){} }
      else if(algOid === '1.2.840.10045.2.1' && alg[1]) keyInfo = 'EC ' + (OIDS[oid(b.subarray(alg[1].s, alg[1].e))] || '');
      var exts = []; for(var j = i + 6; j < tbs.length; j++) if(tbs[j].tag === 0xa3){ kids(b, tlv(b, tbs[j].s)).forEach(function(e){ exts.push(ext(b, e)); }); }
      return {version: version, serial: serial, sigAlg: OIDS[sigAlg] || sigAlg, issuer: issuer, subject: subject, nb: nb, na: na, key: keyInfo, exts: exts, selfSigned: issuer === subject};
    }
    function dig(alg, der){ return crypto.subtle.digest(alg, der).then(function(h){ return hex(new Uint8Array(h), ':').toUpperCase(); }); }
    function row(k, v){ return '<dt style="color:var(--muted);font-size:11px;margin-top:6px">' + esc(k) + '</dt><dd style="margin:0;word-break:break-all;font-family:var(--font-mono);font-size:12px">' + v + '</dd>'; }
    function show(ders){
      var m = q('#cd-msg'), res = q('#cd-res'); res.innerHTML = '';
      Promise.all(ders.map(function(der, idx){
        var c; try{ c = parseCert(der); }catch(e){ return Promise.resolve('<div class="result-card"><div class="tool-msg err">Certificate ' + (idx + 1) + ': ' + esc(e.message) + '</div></div>'); }
        var now = Date.now(), st = !c.nb || !c.na ? '' : now > c.na ? '<b style="color:#ff6b6b">Expired ' + Math.floor((now - c.na) / 864e5) + ' days ago</b>' : now < c.nb ? '<b style="color:#e0b341">Not valid yet</b>' : '<b style="color:#36c979">Valid · ' + Math.floor((c.na - now) / 864e5) + ' days left</b>';
        var fp = (crypto.subtle ? Promise.all([dig('SHA-1', der), dig('SHA-256', der)]) : Promise.resolve(['unavailable (needs HTTPS)', 'unavailable (needs HTTPS)']));
        return fp.then(function(f){
          return '<div class="result-card"><div class="field-label">Certificate ' + (idx + 1) + ' of ' + ders.length + (c.selfSigned ? ' · self-signed' : '') + '</div><dl style="margin:0">' + row('Subject', esc(c.subject)) + row('Issuer', esc(c.issuer)) + row('Status', st) +
            row('Valid from', c.nb ? esc(c.nb.toUTCString()) : '–') + row('Valid until', c.na ? esc(c.na.toUTCString()) : '–') + row('Serial number', esc(c.serial)) + row('Version', 'v' + c.version) + row('Public key', esc(c.key)) + row('Signature algorithm', esc(c.sigAlg)) +
            c.exts.map(function(e){ return row(e.name + (e.crit ? ' (critical)' : ''), esc(e.val)); }).join('') + row('SHA-1 fingerprint', f[0]) + row('SHA-256 fingerprint', f[1]) + '</dl></div>';
        });
      })).then(function(h){ res.innerHTML = h.join(''); msg(m, ders.length + ' certificate' + (ders.length === 1 ? '' : 's') + ' decoded.', 'ok'); });
    }
    function fromText(t){
      var m = q('#cd-msg'), blocks = t.match(/-----BEGIN [A-Z0-9 ]*CERTIFICATE-----[\s\S]*?-----END [A-Z0-9 ]*CERTIFICATE-----/g);
      if(/-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(t)){ q('#cd-in').value = ''; q('#cd-res').innerHTML = ''; msg(m, 'That looks like a private key. It was cleared and not decoded. Never paste private keys into web pages.', 'err'); return; }
      if(!blocks){ var raw = t.replace(/\s+/g, ''); if(/^[A-Za-z0-9+/=]{100,}$/.test(raw)) blocks = ['-----BEGIN CERTIFICATE-----' + raw + '-----END CERTIFICATE-----']; }
      if(!blocks){ q('#cd-res').innerHTML = ''; msg(m, t.trim() ? 'No PEM certificate found. It should start with -----BEGIN CERTIFICATE-----.' : '', t.trim() ? 'err' : ''); return; }
      var ders = [];
      try{ blocks.forEach(function(bl){ var b64 = bl.replace(/-----[^-]+-----/g, '').replace(/\s+/g, ''), bin = atob(b64), u = new Uint8Array(bin.length); for(var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); ders.push(u); }); }catch(e){ msg(m, 'The Base64 inside the PEM block is not valid.', 'err'); return; }
      show(ders);
    }
    q('#cd-in').addEventListener('input', debounce(function(){ fromText(q('#cd-in').value); }, 200));
    q('#cd-clear').addEventListener('click', function(){ q('#cd-in').value = ''; q('#cd-res').innerHTML = ''; msg(q('#cd-msg'), ''); });
    q('#cd-file').addEventListener('change', function(){ var f = this.files[0]; this.value = ''; if(!f) return; if(f.size > 2e6){ msg(q('#cd-msg'), 'That file is too large for a certificate.', 'err'); return; } f.arrayBuffer().then(function(ab){ var u = new Uint8Array(ab); if(u[0] === 0x30){ q('#cd-in').value = ''; show([u]); } else { var t = new TextDecoder().decode(u); q('#cd-in').value = t; fromText(t); } }); });
  });

  /* ================= GZIP ================= */
  reg('gzip', 'GZIP / DEFLATE', function(body, q){
    var ok = typeof CompressionStream === 'function' && typeof DecompressionStream === 'function';
    body.innerHTML = (ok ? '' : '<div class="tool-msg err">This browser does not support CompressionStream. Use a current Chrome, Edge, Firefox or Safari.</div>') +
      '<div class="tool-row"><span class="seg" id="gz-dir"><button type="button" data-d="c" class="on">Compress</button><button type="button" data-d="d">Decompress</button></span>' + sel('gz-alg', 'Format', [['gzip', 'GZIP'], ['deflate', 'Deflate (zlib)'], ['deflate-raw', 'Raw deflate']]) + sel('gz-enc', 'Encoded text', [['base64', 'Base64'], ['hex', 'Hex']]) + '</div>' +
      '<div class="tool-grid two">' + ta('gz-in', 'Input', 9, 'Text to compress') + ta('gz-out', 'Output', 9, '', 'readonly') + '</div><div class="hint" id="gz-info"></div><div class="tool-msg" id="gz-msg" role="status"></div>' +
      '<div class="tool-row">' + btn('gz-copy', 'Copy output', true) + btn('gz-swap', 'Swap', true) + '<label class="game-btn secondary" for="gz-file" style="cursor:pointer">Compress or decompress a file…</label><input type="file" id="gz-file" hidden data-nopersist></div>';
    var dir = 'c', seq = 0;
    function toB64(u){ var s = ''; for(var i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); }
    function fromB64(s){ s = s.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/'); while(s.length % 4) s += '='; var b = atob(s), u = new Uint8Array(b.length); for(var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
    function toHex(u){ return Array.prototype.map.call(u, function(x){ return ('0' + x.toString(16)).slice(-2); }).join(''); }
    function fromHex(s){ s = s.replace(/[\s:]|0x/gi, ''); if(!/^([0-9a-f]{2})*$/i.test(s)) throw new Error('Invalid hex'); var u = new Uint8Array(s.length / 2); for(var i = 0; i < u.length; i++) u[i] = parseInt(s.substr(i * 2, 2), 16); return u; }
    function pipe(bytes, alg, comp){
      var s = new Blob([bytes]).stream().pipeThrough(comp ? new CompressionStream(alg) : new DecompressionStream(alg));
      return new Response(s).arrayBuffer().then(function(ab){ return new Uint8Array(ab); });
    }
    function run(){
      if(!ok) return;
      var my = ++seq, m = q('#gz-msg'), inp = q('#gz-in').value, alg = q('#gz-alg').value, enc = q('#gz-enc').value;
      if(!inp){ q('#gz-out').value = ''; q('#gz-info').textContent = ''; msg(m, ''); return; }
      var p;
      try{
        if(dir === 'c'){ var raw = new TextEncoder().encode(inp); p = pipe(raw, alg, true).then(function(z){ return {text: enc === 'hex' ? toHex(z) : toB64(z), a: raw.length, b: z.length}; }); }
        else { var z = enc === 'hex' ? fromHex(inp) : fromB64(inp); p = pipe(z, alg, false).then(function(u){ return {text: new TextDecoder('utf-8', {fatal: false}).decode(u), a: z.length, b: u.length}; }); }
      }catch(e){ q('#gz-out').value = ''; msg(m, 'Input is not valid ' + (enc === 'hex' ? 'hex' : 'Base64') + '.', 'err'); return; }
      p.then(function(r){ if(my !== seq) return; q('#gz-out').value = r.text; msg(m, ''); q('#gz-info').textContent = dir === 'c' ? r.a.toLocaleString() + ' bytes → ' + r.b.toLocaleString() + ' bytes compressed (' + (r.a ? Math.round(r.b / r.a * 100) : 0) + '% of the original)' : r.a.toLocaleString() + ' bytes compressed → ' + r.b.toLocaleString() + ' bytes of text'; })
       .catch(function(){ if(my !== seq) return; q('#gz-out').value = ''; q('#gz-info').textContent = ''; msg(m, dir === 'd' ? 'Could not decompress. Check the format (GZIP, Deflate or Raw deflate) and the encoding.' : 'Compression failed.', 'err'); });
    }
    q('#gz-in').addEventListener('input', debounce(run, 150)); ['#gz-alg', '#gz-enc'].forEach(function(s){ q(s).addEventListener('change', run); });
    q('#gz-dir').addEventListener('click', function(e){ var b = e.target.closest('button'); if(!b) return; dir = b.getAttribute('data-d'); qsa2(q('#gz-dir'), 'button').forEach(function(x){ x.classList.toggle('on', x === b); }); q('#gz-in').placeholder = dir === 'c' ? 'Text to compress' : 'Base64 or hex to decompress'; run(); });
    q('#gz-copy').addEventListener('click', function(){ copyText(q('#gz-out').value, this); });
    q('#gz-swap').addEventListener('click', function(){ var o = q('#gz-out').value; if(!o) return; q('#gz-in').value = o; qsa2(q('#gz-dir'), 'button').filter(function(b){ return b.getAttribute('data-d') !== dir; })[0].click(); });
    q('#gz-file').addEventListener('change', function(){
      var f = this.files[0]; this.value = ''; if(!f || !ok) return; var m = q('#gz-msg');
      var gz = /\.gz$/i.test(f.name) && dir === 'd' || (/\.gz$/i.test(f.name));
      f.arrayBuffer().then(function(ab){ var u = new Uint8Array(ab); return gz ? pipe(u, 'gzip', false).then(function(r){ return {u: r, name: f.name.replace(/\.gz$/i, '') || 'file'}; }) : pipe(u, 'gzip', true).then(function(r){ return {u: r, name: f.name + '.gz'}; }); })
        .then(function(r){ var url = URL.createObjectURL(new Blob([r.u])), a = document.createElement('a'); a.href = url; a.download = r.name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function(){ URL.revokeObjectURL(url); }, 20000); msg(m, (gz ? 'Decompressed ' : 'Compressed ') + f.name + ' · ' + f.size.toLocaleString() + ' → ' + r.u.length.toLocaleString() + ' bytes. Saved as ' + r.name + '.', 'ok'); })
        .catch(function(){ msg(m, 'Could not process that file as GZIP.', 'err'); });
    });
  });

  /* ================= HTML encoder / decoder ================= */
  reg('html-encoder', 'HTML ENCODER / DECODER', function(body, q){
    var NAMED = {160:'nbsp',169:'copy',174:'reg',8482:'trade',8364:'euro',163:'pound',165:'yen',162:'cent',167:'sect',176:'deg',177:'plusmn',215:'times',247:'divide',171:'laquo',187:'raquo',8230:'hellip',8212:'mdash',8211:'ndash',8216:'lsquo',8217:'rsquo',8220:'ldquo',8221:'rdquo',8226:'bull',183:'middot',182:'para',189:'frac12',188:'frac14',190:'frac34',8594:'rarr',8592:'larr',8593:'uarr',8595:'darr',8800:'ne',8804:'le',8805:'ge',8734:'infin',181:'micro',233:'eacute',232:'egrave',228:'auml',246:'ouml',252:'uuml',223:'szlig',241:'ntilde',231:'ccedil',225:'aacute',237:'iacute',243:'oacute',250:'uacute',224:'agrave',226:'acirc',234:'ecirc',238:'icirc',244:'ocirc',251:'ucirc',196:'Auml',214:'Ouml',220:'Uuml',201:'Eacute'};
    body.innerHTML = '<div class="tool-row"><span class="seg" id="he-dir"><button type="button" data-d="e" class="on">Encode</button><button type="button" data-d="d">Decode</button></span>' + sel('he-mode', 'Encode', [['special', 'Special characters only (& < > " \')'], ['named', 'Special + non-ASCII (named where possible)'], ['dec', 'Special + non-ASCII as &#decimal;'], ['hex', 'Special + non-ASCII as &#xhex;'], ['all', 'Every character as &#xhex;']]) + '</div>' +
      '<div class="tool-grid two">' + ta('he-in', 'Input', 10, '<p class="x">Café & crème — 5 > 3</p>') + ta('he-out', 'Output', 10, '', 'readonly') + '</div><div class="tool-row">' + btn('he-copy', 'Copy output', true) + btn('he-swap', 'Swap', true) + '</div>';
    var dir = 'e';
    function enc(s, mode){
      var out = '';
      for(var ch of s){
        var cp = ch.codePointAt(0), base = ch === '&' ? '&amp;' : ch === '<' ? '&lt;' : ch === '>' ? '&gt;' : ch === '"' ? '&quot;' : ch === "'" ? '&#39;' : null;
        if(mode === 'all' && ch !== '\n' && ch !== '\r') out += '&#x' + cp.toString(16).toUpperCase() + ';';
        else if(base) out += base;
        else if(cp > 126 && mode !== 'special') out += mode === 'named' && NAMED[cp] ? '&' + NAMED[cp] + ';' : mode === 'dec' ? '&#' + cp + ';' : '&#x' + cp.toString(16).toUpperCase() + ';';
        else out += ch;
      }
      return out;
    }
    function dec(s){ var d = new DOMParser().parseFromString('<!doctype html><body>' + s.replace(/</g, '&lt;'), 'text/html'); return d.body.textContent; }
    function run(){ var i = q('#he-in').value; q('#he-out').value = dir === 'e' ? enc(i, q('#he-mode').value) : dec(i); }
    q('#he-in').addEventListener('input', run); q('#he-mode').addEventListener('change', run);
    q('#he-dir').addEventListener('click', function(e){ var b = e.target.closest('button'); if(!b) return; dir = b.getAttribute('data-d'); qsa2(q('#he-dir'), 'button').forEach(function(x){ x.classList.toggle('on', x === b); }); q('#he-mode').disabled = dir === 'd'; run(); });
    q('#he-copy').addEventListener('click', function(){ copyText(q('#he-out').value, this); });
    q('#he-swap').addEventListener('click', function(){ var o = q('#he-out').value; if(!o) return; q('#he-in').value = o; qsa2(q('#he-dir'), 'button').filter(function(b){ return b.getAttribute('data-d') !== dir; })[0].click(); });
  });

  /* ================= JWT decoder / verifier / builder ================= */
  reg('jwt-decoder', 'JWT DECODER', function(body, q){
    body.innerHTML = '<div class="tool-row"><span class="seg" id="jw-tab"><button type="button" data-t="d" class="on">Decode &amp; verify</button><button type="button" data-t="e">Create (HMAC)</button></span></div>' +
      '<div id="jw-dec">' + ta('jw-in', 'JSON Web Token', 5, 'eyJhbGciOiJIUzI1NiIs…') + '<div class="tool-msg" id="jw-msg" role="status"></div><div class="tool-grid two"><div class="result-card"><div class="field-label">Header</div><pre id="jw-h" style="margin:0;white-space:pre-wrap;word-break:break-all;font-size:12px"></pre></div><div class="result-card"><div class="field-label">Payload</div><pre id="jw-p" style="margin:0;white-space:pre-wrap;word-break:break-all;font-size:12px"></pre></div></div>' +
      '<div class="result-card"><div class="field-label">Claims</div><div id="jw-claims" style="font-family:var(--font-mono);font-size:12px"></div></div>' +
      '<div class="result-card"><div class="field-label">Verify signature</div><div class="field"><label for="jw-key">Secret (HS*) or public key in PEM (RS*, PS*, ES*)</label><textarea id="jw-key" rows="4" spellcheck="false" placeholder="your-256-bit-secret  or  -----BEGIN PUBLIC KEY-----"></textarea></div><div class="tool-row">' + chk('jw-b64', 'Secret is Base64 encoded', false) + btn('jw-verify', 'Verify') + '</div><div class="tool-msg" id="jw-vmsg" role="status"></div></div></div>' +
      '<div id="jw-enc" hidden><div class="tool-grid two">' + ta('jw-eh', 'Header (JSON)', 5, '', '') + ta('jw-ep', 'Payload (JSON)', 5, '', '') + '</div><div class="field"><label for="jw-es">Secret</label><input id="jw-es" value="your-256-bit-secret" spellcheck="false" autocomplete="off"></div><div class="tool-row">' + sel('jw-ea', 'Algorithm', [['HS256', 'HS256'], ['HS384', 'HS384'], ['HS512', 'HS512']]) + btn('jw-go', 'Create token') + '</div>' + ta('jw-eo', 'Token', 4, '', 'readonly') + '<div class="tool-row">' + btn('jw-ec', 'Copy token', true) + '</div><div class="tool-msg" id="jw-emsg" role="status"></div></div>' +
      '<p class="hint">Everything runs in your browser; tokens and keys are never sent anywhere. Decoding does not prove a token is genuine: always verify the signature.</p>';
    q('#jw-eh').value = '{\n  "alg": "HS256",\n  "typ": "JWT"\n}'; q('#jw-ep').value = '{\n  "sub": "1234567890",\n  "name": "Ada",\n  "iat": ' + Math.floor(Date.now() / 1000) + '\n}';
    function b64u(s){ s = s.replace(/-/g, '+').replace(/_/g, '/'); while(s.length % 4) s += '='; var b = atob(s), u = new Uint8Array(b.length); for(var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
    function b64uEnc(u){ var s = ''; for(var i = 0; i < u.length; i++) s += String.fromCharCode(u[i]); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
    function js(u){ return JSON.parse(new TextDecoder().decode(u)); }
    var tok = null;
    function rel(sec){ var d = sec * 1000 - Date.now(), a = Math.abs(d) / 1000, u = a < 90 ? Math.round(a) + ' sec' : a < 5400 ? Math.round(a / 60) + ' min' : a < 172800 ? Math.round(a / 3600) + ' hours' : Math.round(a / 86400) + ' days'; return d >= 0 ? 'in ' + u : u + ' ago'; }
    function decode(){
      var t = q('#jw-in').value.trim().replace(/^Bearer\s+/i, ''), m = q('#jw-msg'); tok = null;
      ['#jw-h', '#jw-p', '#jw-claims'].forEach(function(s){ q(s).textContent = ''; }); q('#jw-vmsg').textContent = '';
      if(!t){ msg(m, ''); return; }
      var parts = t.split('.'); if(parts.length !== 3){ msg(m, 'A JWT has three dot-separated parts. This has ' + parts.length + '.', 'err'); return; }
      try{
        var h = js(b64u(parts[0])), p = js(b64u(parts[1]));
        q('#jw-h').textContent = JSON.stringify(h, null, 2); q('#jw-p').textContent = JSON.stringify(p, null, 2);
        tok = {h: h, parts: parts};
        var rows = [], now = Date.now() / 1000;
        [['iss', 'Issuer'], ['sub', 'Subject'], ['aud', 'Audience'], ['jti', 'ID']].forEach(function(c){ if(p[c[0]] !== undefined) rows.push([c[1], typeof p[c[0]] === 'object' ? JSON.stringify(p[c[0]]) : String(p[c[0]])]); });
        [['iat', 'Issued at'], ['nbf', 'Not before'], ['exp', 'Expires']].forEach(function(c){ var v = p[c[0]]; if(typeof v === 'number') rows.push([c[1], new Date(v * 1000).toISOString().replace('T', ' ').replace('.000Z', ' UTC') + ' (' + rel(v) + ')' + (c[0] === 'exp' ? (v < now ? ' · EXPIRED' : ' · valid') : c[0] === 'nbf' && v > now ? ' · NOT YET VALID' : '')]); });
        q('#jw-claims').innerHTML = rows.length ? rows.map(function(r){ return '<div style="display:flex;gap:12px;margin:3px 0"><span style="min-width:90px;color:var(--muted)">' + r[0] + '</span><span style="word-break:break-all">' + esc(r[1]) + '</span></div>'; }).join('') : '<span style="color:var(--muted)">No standard claims.</span>';
        msg(m, String(h.alg).toLowerCase() === 'none' ? 'Warning: this token uses alg "none", so it has no signature and must not be trusted.' : 'Decoded. Algorithm: ' + h.alg + '. Signature not verified yet.', String(h.alg).toLowerCase() === 'none' ? 'err' : 'ok');
      }catch(e){ msg(m, 'Could not decode: the header or payload is not valid Base64URL JSON.', 'err'); }
    }
    function spki(pem){ return Uint8Array.from(atob(pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '')), function(c){ return c.charCodeAt(0); }); }
    q('#jw-verify').addEventListener('click', function(){
      var m = q('#jw-vmsg'); if(!tok){ msg(m, 'Paste a valid token first.', 'err'); return; }
      if(!crypto.subtle){ msg(m, 'Verification needs a secure context (HTTPS or localhost).', 'err'); return; }
      var alg = String(tok.h.alg), key = q('#jw-key').value.trim(), data = new TextEncoder().encode(tok.parts[0] + '.' + tok.parts[1]), sig; if(!key){ msg(m, 'Enter the secret or public key.', 'err'); return; }
      try{ sig = b64u(tok.parts[2]); }catch(e){ msg(m, 'The signature part is not valid Base64URL.', 'err'); return; }
      var bits = alg.slice(2), hash = 'SHA-' + bits, p;
      try{
        if(/^HS(256|384|512)$/.test(alg)){
          var raw = q('#jw-b64').checked ? b64u(key.replace(/\s+/g, '')) : new TextEncoder().encode(key);
          p = crypto.subtle.importKey('raw', raw, {name: 'HMAC', hash: hash}, false, ['verify']).then(function(k){ return crypto.subtle.verify('HMAC', k, sig, data); });
        } else if(/^RS(256|384|512)$/.test(alg)) p = crypto.subtle.importKey('spki', spki(key), {name: 'RSASSA-PKCS1-v1_5', hash: hash}, false, ['verify']).then(function(k){ return crypto.subtle.verify('RSASSA-PKCS1-v1_5', k, sig, data); });
        else if(/^PS(256|384|512)$/.test(alg)) p = crypto.subtle.importKey('spki', spki(key), {name: 'RSA-PSS', hash: hash}, false, ['verify']).then(function(k){ return crypto.subtle.verify({name: 'RSA-PSS', saltLength: +bits / 8}, k, sig, data); });
        else if(/^ES(256|384|512)$/.test(alg)){ var curve = {256: 'P-256', 384: 'P-384', 512: 'P-521'}[bits]; p = crypto.subtle.importKey('spki', spki(key), {name: 'ECDSA', namedCurve: curve}, false, ['verify']).then(function(k){ return crypto.subtle.verify({name: 'ECDSA', hash: hash}, k, sig, data); }); }
        else { msg(m, 'Algorithm "' + alg + '" cannot be verified here. Supported: HS, RS, PS and ES 256/384/512.', 'err'); return; }
      }catch(e){ msg(m, 'The key could not be read.', 'err'); return; }
      p.then(function(ok){ msg(m, ok ? 'Signature is valid.' : 'Signature does NOT match this key.', ok ? 'ok' : 'err'); }).catch(function(){ msg(m, 'The key could not be used for ' + alg + '. Check the format (public keys must be PEM "BEGIN PUBLIC KEY").', 'err'); });
    });
    q('#jw-in').addEventListener('input', debounce(decode, 120));
    q('#jw-tab').addEventListener('click', function(e){ var b = e.target.closest('button'); if(!b) return; var enc = b.getAttribute('data-t') === 'e'; qsa2(q('#jw-tab'), 'button').forEach(function(x){ x.classList.toggle('on', x === b); }); q('#jw-dec').hidden = enc; q('#jw-enc').hidden = !enc; });
    q('#jw-go').addEventListener('click', function(){
      var m = q('#jw-emsg'), alg = q('#jw-ea').value, h, p;
      try{ h = JSON.parse(q('#jw-eh').value); p = JSON.parse(q('#jw-ep').value); }catch(e){ msg(m, 'Header and payload must both be valid JSON.', 'err'); return; }
      if(!crypto.subtle){ msg(m, 'Signing needs a secure context (HTTPS or localhost).', 'err'); return; }
      h.alg = alg; var enc = new TextEncoder(), s = b64uEnc(enc.encode(JSON.stringify(h))) + '.' + b64uEnc(enc.encode(JSON.stringify(p)));
      crypto.subtle.importKey('raw', enc.encode(q('#jw-es').value), {name: 'HMAC', hash: 'SHA-' + alg.slice(2)}, false, ['sign']).then(function(k){ return crypto.subtle.sign('HMAC', k, enc.encode(s)); }).then(function(sg){ q('#jw-eo').value = s + '.' + b64uEnc(new Uint8Array(sg)); msg(m, 'Token created with ' + alg + '.', 'ok'); }).catch(function(){ msg(m, 'Could not sign the token.', 'err'); });
    });
    q('#jw-ec').addEventListener('click', function(){ copyText(q('#jw-eo').value, this); });
  });

  /* ================= SQL formatter ================= */
  reg('sql-formatter', 'SQL FORMATTER', function(body, q){
    body.innerHTML = '<div class="tool-grid two">' + ta('sq-in', 'SQL', 14, "select u.id,u.name,count(o.id) as orders from users u left join orders o on o.user_id=u.id where u.active=1 and (u.role='admin' or u.role='staff') group by u.id,u.name having count(o.id)>0 order by orders desc limit 10;") + ta('sq-out', 'Formatted', 14, '', 'readonly') + '</div>' +
      '<div class="tool-row">' + sel('sq-ind', 'Indent', [['2', '2 spaces'], ['4', '4 spaces'], ['t', 'Tab']]) + sel('sq-kw', 'Keywords', [['up', 'UPPERCASE'], ['low', 'lowercase'], ['keep', 'Keep as typed']]) + btn('sq-fmt', 'Format') + btn('sq-min', 'Minify', true) + btn('sq-copy', 'Copy', true) + '</div><div class="tool-msg" id="sq-msg" role="status"></div>' +
      '<p class="hint">A general-purpose formatter for standard SQL (works with most MySQL, PostgreSQL, SQL Server and SQLite queries). It never changes what the query does, only whitespace and keyword case.</p>';
    var KW = 'SELECT FROM WHERE AND OR NOT IN IS NULL LIKE ILIKE BETWEEN EXISTS AS ON JOIN INNER LEFT RIGHT FULL OUTER CROSS NATURAL GROUP BY ORDER HAVING LIMIT OFFSET FETCH UNION ALL INTERSECT EXCEPT DISTINCT TOP INSERT INTO VALUES UPDATE SET DELETE CREATE TABLE ALTER DROP INDEX VIEW ADD COLUMN PRIMARY KEY FOREIGN REFERENCES UNIQUE DEFAULT CHECK CONSTRAINT CASE WHEN THEN ELSE END ASC DESC WITH RECURSIVE OVER PARTITION RETURNING USING IF TRUNCATE TRUE FALSE CAST WINDOW ROWS RANGE UNBOUNDED PRECEDING FOLLOWING CURRENT ROW LATERAL ANY SOME'.split(' ').reduce(function(o, w){ o[w] = 1; return o; }, {});
    var CLAUSE = {SELECT: 1, FROM: 1, WHERE: 1, HAVING: 1, LIMIT: 1, OFFSET: 1, UNION: 1, INTERSECT: 1, EXCEPT: 1, VALUES: 1, SET: 1, RETURNING: 1, UPDATE: 1, WITH: 1, FETCH: 1};
    function tokenize(s){
      var t = [], i = 0, n = s.length, m;
      while(i < n){
        var c = s[i];
        if(/\s/.test(c)){ i++; continue; }
        if(c === '-' && s[i + 1] === '-'){ var e = s.indexOf('\n', i); if(e < 0) e = n; t.push({t: 'c', v: s.slice(i, e).trimEnd(), line: true}); i = e; continue; }
        if(c === '/' && s[i + 1] === '*'){ var e2 = s.indexOf('*/', i + 2); if(e2 < 0) e2 = n - 2; t.push({t: 'c', v: s.slice(i, e2 + 2)}); i = e2 + 2; continue; }
        if(c === "'" || c === '"' || c === '`'){ var j = i + 1; while(j < n){ if(s[j] === c){ if(s[j + 1] === c){ j += 2; continue; } break; } if(s[j] === '\\' && c === "'") j++; j++; } t.push({t: 's', v: s.slice(i, j + 1)}); i = j + 1; continue; }
        if(c === '[' && /^\[[^\]\n]+\]/.test(s.slice(i))){ m = /^\[[^\]\n]+\]/.exec(s.slice(i)); t.push({t: 's', v: m[0]}); i += m[0].length; continue; }
        if((m = /^(\d+\.?\d*([eE][-+]?\d+)?|\.\d+)/.exec(s.slice(i)))){ t.push({t: 'n', v: m[0]}); i += m[0].length; continue; }
        if((m = /^[A-Za-z_@#$][\w$@#]*/.exec(s.slice(i)))){ t.push({t: 'w', v: m[0]}); i += m[0].length; continue; }
        if((m = /^(<>|<=|>=|!=|\|\||::|->>|->|=>|:=|<<|>>)/.exec(s.slice(i)))){ t.push({t: 'o', v: m[0]}); i += m[0].length; continue; }
        t.push({t: /[(),;.]/.test(c) ? c : 'o', v: c}); i++;
      }
      return t;
    }
    function format(src, ind, kwMode, minify){
      var toks = tokenize(src), out = '', lvl = 0, stack = [], clause = [''], first = true, prev = null, tab = ind === 't' ? '\t' : ' '.repeat(+ind);
      function I(n){ return tab.repeat(Math.max(0, n)); }
      function kw(v){ var u = v.toUpperCase(); if(!KW[u]) return v; return kwMode === 'up' ? u : kwMode === 'low' ? v.toLowerCase() : v; }
      function nl(n){ if(minify){ if(out && !/ $/.test(out)) out += ' '; return; } out = out.replace(/[ \t]+$/, '') + '\n' + I(n); }
      function sp(){ if(out && !/[\s(.]$/.test(out)) out += ' '; }
      for(var i = 0; i < toks.length; i++){
        var tk = toks[i], u = tk.v.toUpperCase(), nx = toks[i + 1], base = lvl;
        if(tk.t === 'c'){ if(minify){ prev = tk; continue; } if(out && !/\n\s*$/.test(out)) out += ' '; out += tk.v; if(tk.line){ nl(lvl + (clause[clause.length - 1] === 'SELECT' ? 1 : 0)); } prev = tk; continue; }
        if(tk.t === '(' ){
          var sub = nx && nx.t === 'w' && /^(SELECT|WITH)$/i.test(nx.v), fn = prev && clause[clause.length - 1] !== 'INSERT' && (prev.t === 'w' && !KW[prev.v.toUpperCase()] || (prev.t === 'w' && /^(COUNT|SUM|AVG|MIN|MAX|CAST|COALESCE|IF|OVER|EXISTS_)$/i.test(prev.v)));
          if(!fn) sp(); out += '(';
          stack.push({sub: sub, lvl: lvl, clause: clause[clause.length - 1]}); clause.push('');
          if(sub){ lvl++; }
          prev = tk; continue;
        }
        if(tk.t === ')'){
          var top = stack.pop() || {sub: false, lvl: lvl}; clause.pop();
          if(top.sub){ lvl = top.lvl; nl(lvl); } out += ')'; prev = tk; continue;
        }
        if(tk.t === ','){
          out += ','; var cl = clause[clause.length - 1], inFn = stack.length && !stack[stack.length - 1].sub;
          if(!inFn && (cl === 'SELECT' || cl === 'SET' || cl === 'WITH')) nl(lvl + 1); else out += ' ';
          prev = tk; continue;
        }
        if(tk.t === ';'){ out = (prev && prev.t === 'c' && prev.line ? out.replace(/[ \t]+$/, '') : out.replace(/\s+$/, '')) + ';'; if(!minify && nx) out += '\n'; else out += ' '; lvl = 0; stack = []; clause = ['']; prev = tk; continue; }
        if(tk.t === '.'){ out = out.replace(/\s+$/, '') + '.'; prev = tk; continue; }
        if(tk.t === 'w'){
          var up = u, inSub = stack.length && stack[stack.length - 1].sub || !stack.length;
          var two = nx && nx.t === 'w' ? up + ' ' + nx.v.toUpperCase() : '';
          if(/^(GROUP BY|ORDER BY|PARTITION BY)$/.test(two) && up !== 'PARTITION'){
            if(inSub){ nl(lvl); clause[clause.length - 1] = up; } else sp();
            out += kw(tk.v) + ' ' + kw(nx.v); i++; prev = nx; continue;
          }
          if(/^(INSERT INTO|DELETE FROM)$/.test(two)){ nl(lvl); out += kw(tk.v) + ' ' + kw(nx.v); i++; clause[clause.length - 1] = up; prev = nx; continue; }
          if(/^(UNION ALL)$/.test(two)){ nl(lvl); out += kw(tk.v) + ' ' + kw(nx.v); nl(lvl); i++; prev = nx; continue; }
          if(CLAUSE[up] && inSub && !(up === 'SET' && stack.length) && !(up === 'WITH' && toks[i - 1] && toks[i - 1].v === 'ORDINALITY')){
            if(!first || out) nl(lvl);
            out += kw(tk.v); clause[clause.length - 1] = up;
            if(up === 'UNION' || up === 'INTERSECT' || up === 'EXCEPT'){ if(nx && /^ALL|DISTINCT$/i.test(nx.v)){ out += ' ' + kw(nx.v); i++; } nl(lvl); clause[clause.length - 1] = ''; }
            else if(up === 'SELECT'){ var k = i + 1, ex = ''; while(toks[k] && toks[k].t === 'w' && /^(DISTINCT|ALL|TOP)$/i.test(toks[k].v)){ out += ' ' + kw(toks[k].v); k++; if(/^TOP$/i.test(toks[k - 1].v) && toks[k]){ out += ' ' + toks[k].v; k++; } } i = k - 1; nl(lvl + 1); }
            first = false; prev = tk; continue;
          }
          if(/^(JOIN|INNER|LEFT|RIGHT|FULL|CROSS|NATURAL)$/.test(up) && inSub && !(prev && /^(INNER|LEFT|RIGHT|FULL|CROSS|NATURAL|OUTER)$/i.test(prev.v))){ nl(lvl); out += kw(tk.v); prev = tk; clause[clause.length - 1] = 'JOIN'; continue; }
          if((up === 'AND' || up === 'OR') && inSub && /^(WHERE|ON|HAVING|JOIN)$/.test(clause[clause.length - 1]) && !(prev && prev.t === 'w' && /^BETWEEN$/i.test(toks[i - 2] && toks[i - 2].v) )){
            var bt = false; for(var z = i - 1; z >= 0 && z > i - 6; z--){ if(toks[z].t === 'w' && /^BETWEEN$/i.test(toks[z].v)){ bt = true; break; } if(toks[z].t === 'w' && /^(AND|OR)$/i.test(toks[z].v)) break; }
            if(!bt || up === 'OR'){ nl(lvl + 1); out += kw(tk.v); prev = tk; continue; }
          }
          sp(); out += KW[up] ? kw(tk.v) : tk.v; prev = tk; continue;
        }
        sp(); out += tk.v; prev = tk;
      }
      return out.replace(/[ \t]+\n/g, '\n').replace(/^\s+|\s+$/g, '') + '\n';
    }
    function run(minify){
      var s = q('#sq-in').value, m = q('#sq-msg');
      if(!s.trim()){ q('#sq-out').value = ''; msg(m, ''); return; }
      try{ q('#sq-out').value = format(s, q('#sq-ind').value, q('#sq-kw').value, minify === true); msg(m, minify === true ? 'Minified.' : 'Formatted.', 'ok'); }catch(e){ msg(m, 'Could not format: ' + e.message, 'err'); }
    }
    q('#sq-fmt').addEventListener('click', function(){ run(false); }); q('#sq-min').addEventListener('click', function(){ run(true); });
    q('#sq-in').addEventListener('input', debounce(function(){ run(false); }, 250)); ['#sq-ind', '#sq-kw'].forEach(function(s){ q(s).addEventListener('change', function(){ run(false); }); });
    q('#sq-copy').addEventListener('click', function(){ copyText(q('#sq-out').value, this); });
    q('#sq-in').value = "select u.id,u.name,count(o.id) as orders from users u left join orders o on o.user_id=u.id where u.active=1 and (u.role='admin' or u.role='staff') group by u.id,u.name having count(o.id)>0 order by orders desc limit 10;";
    run(false);
  });

  /* ================= Colour blindness simulator ================= */
  reg('color-blind-simulator', 'COLOUR BLINDNESS SIMULATOR', function(body, q){
    var TYPES = [
      {id: 'prot', label: 'Protanopia / protanomaly (red-weak)', note: 'about 1% of males', m: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]]},
      {id: 'deut', label: 'Deuteranopia / deuteranomaly (green-weak)', note: 'about 6% of males', m: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.011820, 0.042940, 0.968881]]},
      {id: 'trit', label: 'Tritanopia / tritanomaly (blue-weak)', note: 'under 0.01% of people', m: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.303900]]},
      {id: 'achr', label: 'Achromatopsia (no colour)', note: 'very rare', m: [[0.2126, 0.7152, 0.0722], [0.2126, 0.7152, 0.0722], [0.2126, 0.7152, 0.0722]]}
    ];
    body.innerHTML = '<div class="tool-row"><label class="game-btn secondary" for="cb-file" style="cursor:pointer">Choose an image</label><input type="file" id="cb-file" accept="image/*" hidden data-nopersist>' + btn('cb-sample', 'Use sample spectrum', true) +
      '<div class="field" style="min-width:220px"><label for="cb-sev">Severity <span id="cb-sev-l">100%</span></label><input id="cb-sev" type="range" min="10" max="100" step="10" value="100"></div></div>' +
      '<div class="hint">100% is full colour blindness (dichromacy). Lower values simulate the weaker "anomaly" forms. Simulations are approximate (Machado et al. 2009 model, applied in linear RGB); real vision varies between people.</div><div id="cb-grid" class="tool-grid" style="margin-top:10px"></div>' +
      '<div class="result-card"><div class="field-label">Check a colour pair</div><div class="tool-row"><div class="field"><label for="cb-c1">Colour A</label><input type="color" id="cb-c1" class="big" value="#d62728"></div><div class="field"><label for="cb-c2">Colour B</label><input type="color" id="cb-c2" class="big" value="#2ca02c"></div></div><div id="cb-pair" class="tool-grid"></div></div>';
    var LIN = new Float32Array(256); for(var i = 0; i < 256; i++){ var c = i / 255; LIN[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
    function enc(v){ v = v < 0 ? 0 : v > 1 ? 1 : v; return Math.round(255 * (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055)); }
    function mat(t, s){ var I = [[1, 0, 0], [0, 1, 0], [0, 0, 1]]; return t.m.map(function(r, y){ return r.map(function(v, x){ return (1 - s) * I[y][x] + s * v; }); }); }
    var src = null;
    function sim(data, M){
      var d = data.data, o = new ImageData(data.width, data.height), od = o.data;
      for(var p = 0; p < d.length; p += 4){
        var r = LIN[d[p]], g = LIN[d[p + 1]], b = LIN[d[p + 2]];
        od[p] = enc(M[0][0] * r + M[0][1] * g + M[0][2] * b); od[p + 1] = enc(M[1][0] * r + M[1][1] * g + M[1][2] * b); od[p + 2] = enc(M[2][0] * r + M[2][1] * g + M[2][2] * b); od[p + 3] = d[p + 3];
      }
      return o;
    }
    function render(){
      var grid = q('#cb-grid'), s = +q('#cb-sev').value / 100; q('#cb-sev-l').textContent = Math.round(s * 100) + '%';
      if(!src){ grid.innerHTML = '<div class="hint">Choose an image to see how it looks with each type of colour blindness.</div>'; return; }
      var W = Math.min(420, src.width), H = Math.round(src.height * W / src.width), base = document.createElement('canvas'); base.width = W; base.height = H;
      var bc = base.getContext('2d', {willReadFrequently: true}); bc.drawImage(src, 0, 0, W, H); var data = bc.getImageData(0, 0, W, H);
      grid.innerHTML = '';
      [{label: 'Normal vision', note: 'original'}].concat(TYPES).forEach(function(t, i){
        var card = document.createElement('div'), cv = document.createElement('canvas'); card.className = 'result-card'; cv.width = W; cv.height = H; cv.style.cssText = 'width:100%;height:auto;border-radius:4px;display:block';
        cv.getContext('2d').putImageData(i ? sim(data, mat(t, t.id === 'achr' ? 1 : s)) : data, 0, 0);
        card.innerHTML = '<div class="field-label" style="margin-bottom:6px">' + esc(t.label) + ' <small style="opacity:.7">· ' + esc(t.note) + '</small></div>'; card.appendChild(cv);
        var dl = document.createElement('button'); dl.type = 'button'; dl.className = 'game-btn secondary'; dl.style.marginTop = '6px'; dl.textContent = 'Download PNG';
        dl.addEventListener('click', function(){ cv.toBlob(function(b){ var u = URL.createObjectURL(b), a = document.createElement('a'); a.href = u; a.download = (t.id || 'normal') + '-simulation.png'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function(){ URL.revokeObjectURL(u); }, 20000); }); });
        card.appendChild(dl); grid.appendChild(card);
      });
    }
    function setSrc(img){ src = img; render(); }
    function sample(){ var c = document.createElement('canvas'); c.width = 480; c.height = 240; var g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 480, 0);
      ['#ff0000', '#ff9900', '#ffee00', '#22cc22', '#00b3b3', '#2255ff', '#9933cc', '#ff33aa'].forEach(function(col, i, a){ gr.addColorStop(i / (a.length - 1), col); }); g.fillStyle = gr; g.fillRect(0, 0, 480, 160);
      var sw = ['#d62728', '#2ca02c', '#1f77b4', '#ff7f0e', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f']; sw.forEach(function(col, i){ g.fillStyle = col; g.fillRect(i * 60, 160, 60, 80); }); setSrc(c); }
    q('#cb-file').addEventListener('change', function(){ var f = this.files[0]; this.value = ''; if(!f) return; var u = URL.createObjectURL(f), im = new Image(); im.onload = function(){ setSrc(im); URL.revokeObjectURL(u); }; im.onerror = function(){ q('#cb-grid').innerHTML = '<div class="tool-msg err">That file could not be read as an image.</div>'; URL.revokeObjectURL(u); }; im.src = u; });
    q('#cb-sample').addEventListener('click', sample); q('#cb-sev').addEventListener('input', debounce(function(){ render(); pair(); }, 60));
    function hex2(h){ var n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
    function lumOf(c){ return 0.2126 * LIN[c[0]] + 0.7152 * LIN[c[1]] + 0.0722 * LIN[c[2]]; }
    function pair(){
      var a = hex2(q('#cb-c1').value), b = hex2(q('#cb-c2').value), s = +q('#cb-sev').value / 100, h = '';
      [{label: 'Normal vision', m: null}].concat(TYPES).forEach(function(t){
        var M = t.m ? mat(t, t.id === 'achr' ? 1 : s) : null;
        function conv(c){ if(!M) return c; var r = LIN[c[0]], g = LIN[c[1]], bl = LIN[c[2]]; return [enc(M[0][0] * r + M[0][1] * g + M[0][2] * bl), enc(M[1][0] * r + M[1][1] * g + M[1][2] * bl), enc(M[2][0] * r + M[2][1] * g + M[2][2] * bl)]; }
        var x = conv(a), y = conv(b), la = lumOf(x), lb = lumOf(y), cr = (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
        var dist = Math.sqrt(Math.pow(x[0] - y[0], 2) + Math.pow(x[1] - y[1], 2) + Math.pow(x[2] - y[2], 2));
        var verdict = dist < 60 && cr < 1.5 ? 'Hard to tell apart' : dist < 100 && cr < 2 ? 'Similar' : 'Distinct';
        h += '<div class="result-card" style="padding:10px"><div class="field-label" style="margin:0 0 6px">' + t.label.split(' (')[0] + '</div><div style="display:flex;height:34px;border-radius:4px;overflow:hidden;border:1px solid var(--line)"><span style="flex:1;background:rgb(' + x + ')"></span><span style="flex:1;background:rgb(' + y + ')"></span></div><div style="font:600 12px var(--font-mono);margin-top:6px;color:' + (verdict === 'Distinct' ? '#36c979' : verdict === 'Similar' ? '#e0b341' : '#ff6b6b') + '">' + verdict + '</div></div>';
      });
      q('#cb-pair').innerHTML = h;
    }
    q('#cb-c1').addEventListener('input', pair); q('#cb-c2').addEventListener('input', pair);
    sample(); pair();
  });

  /* ================= JSONPath tester ================= */
  var JP = (function(){
    function err(m){ throw new Error(m); }
    function readQuoted(s, i){ var qt = s[i], j = i + 1, r = ''; while(j < s.length && s[j] !== qt){ if(s[j] === '\\' && j + 1 < s.length){ j++; var e = s[j]; r += e === 'n' ? '\n' : e === 't' ? '\t' : e; } else r += s[j]; j++; } if(j >= s.length) err('Unterminated string in expression'); return {v: r, end: j + 1}; }
    function parsePath(s, i){
      var segs = [];
      while(i < s.length){
        var c = s[i];
        if(c === '.' && s[i + 1] === '.'){ i += 2; segs.push({t: 'desc'}); if(s[i] === '['){ continue; } if(s[i] === '*'){ segs.push({t: 'wild'}); i++; continue; } var st = i; while(i < s.length && !/[.\[\s)=!<>&|,]/.test(s[i])) i++; if(i === st) err('Expected a name after ".."'); segs.push({t: 'name', n: s.slice(st, i)}); continue; }
        if(c === '.'){ i++; if(s[i] === '*'){ segs.push({t: 'wild'}); i++; continue; } var st2 = i; while(i < s.length && !/[.\[\s)=!<>&|,]/.test(s[i])) i++; if(i === st2) err('Expected a name after "."'); segs.push({t: 'name', n: s.slice(st2, i)}); continue; }
        if(c === '['){
          var depth = 0, j = i, qt = null;
          for(; j < s.length; j++){ var ch = s[j]; if(qt){ if(ch === '\\') j++; else if(ch === qt) qt = null; continue; } if(ch === "'" || ch === '"') qt = ch; else if(ch === '[') depth++; else if(ch === ']'){ depth--; if(!depth) break; } }
          if(j >= s.length) err('Missing closing ]');
          var inner = s.slice(i + 1, j).trim(); i = j + 1;
          if(inner === '*') segs.push({t: 'wild'});
          else if(inner[0] === '?'){ var ex = inner.slice(1).trim(); segs.push({t: 'filter', e: parseExpr(ex)}); }
          else if(/^(-?\d*):(-?\d*)(?::(-?\d*))?$/.test(inner)){ var m = /^(-?\d*):(-?\d*)(?::(-?\d*))?$/.exec(inner); segs.push({t: 'slice', a: m[1] === '' ? null : +m[1], b: m[2] === '' ? null : +m[2], c: m[3] === undefined || m[3] === '' ? 1 : +m[3]}); }
          else {
            var items = [], k = 0; while(k < inner.length){ while(inner[k] === ' ') k++; if(inner[k] === "'" || inner[k] === '"'){ var r = readQuoted(inner, k); items.push({n: r.v}); k = r.end; } else { var mm = /^-?\d+/.exec(inner.slice(k)); if(!mm) err('Unexpected "' + inner.slice(k, k + 8) + '" in brackets'); items.push({i: +mm[0]}); k += mm[0].length; } while(inner[k] === ' ') k++; if(inner[k] === ','){ k++; } else if(k < inner.length) err('Expected "," in bracket list'); }
            if(!items.length) err('Empty brackets'); segs.push(items.length === 1 ? (items[0].n !== undefined ? {t: 'name', n: items[0].n, q: 1} : {t: 'index', i: items[0].i}) : {t: 'union', items: items});
          }
          continue;
        }
        if(/[)\s=!<>&|,]/.test(c) && i > 0){ break; }
        err('Unexpected "' + c + '" at position ' + i);
      }
      return {segs: segs, end: i};
    }
    /* filter expressions */
    function tokExpr(s){
      var t = [], i = 0, m;
      while(i < s.length){
        var c = s[i];
        if(/\s/.test(c)){ i++; continue; }
        if(c === '@' || c === '$'){ var p = parsePath(s, i + 1); t.push({k: 'path', root: c === '$', segs: p.segs}); i = p.end; continue; }
        if(c === "'" || c === '"'){ var r = readQuoted(s, i); t.push({k: 'lit', v: r.v}); i = r.end; continue; }
        if(c === '/'){ var e = i + 1; while(e < s.length && s[e] !== '/'){ if(s[e] === '\\') e++; e++; } var fl = /^[gimsuy]*/.exec(s.slice(e + 1))[0]; try{ t.push({k: 'lit', v: new RegExp(s.slice(i + 1, e), fl)}); }catch(x){ err('Invalid regular expression'); } i = e + 1 + fl.length; continue; }
        if((m = /^-?\d+(\.\d+)?([eE][-+]?\d+)?/.exec(s.slice(i)))){ t.push({k: 'lit', v: +m[0]}); i += m[0].length; continue; }
        if((m = /^(true|false|null)\b/.exec(s.slice(i)))){ t.push({k: 'lit', v: m[1] === 'null' ? null : m[1] === 'true'}); i += m[0].length; continue; }
        if((m = /^(==|!=|<=|>=|=~|&&|\|\||<|>|!|\(|\)|in\b|nin\b|contains\b|\bsubsetof\b)/.exec(s.slice(i)))){ t.push({k: 'op', v: m[1]}); i += m[0].length; continue; }
        if((m = /^(length|count|size)\(/.exec(s.slice(i)))){ t.push({k: 'fn', v: m[1]}); i += m[1].length; continue; }
        err('Unexpected "' + s.slice(i, i + 10) + '" in filter');
      }
      return t;
    }
    function parseExpr(s){
      var t = tokExpr(s), p = 0;
      function peek(){ return t[p]; }
      function eatOp(v){ if(t[p] && t[p].k === 'op' && t[p].v === v){ p++; return true; } return false; }
      function prim(){
        var x = t[p++]; if(!x) err('Incomplete filter expression');
        if(x.k === 'lit' || x.k === 'path') return x;
        if(x.k === 'fn'){ if(!eatOp('(')) err('Expected ( after ' + x.v); var a = or(); if(!eatOp(')')) err('Expected )'); return {k: 'fn', v: x.v, a: a}; }
        if(x.k === 'op' && x.v === '('){ var e = or(); if(!eatOp(')')) err('Missing )'); return e; }
        if(x.k === 'op' && x.v === '!'){ return {k: 'not', a: prim()}; }
        err('Unexpected "' + (x.v || x.k) + '"');
      }
      function cmp(){ var l = prim(), x = t[p]; if(x && x.k === 'op' && /^(==|!=|<=|>=|<|>|=~|in|nin|contains|subsetof)$/.test(x.v)){ p++; var r = prim(); return {k: 'cmp', o: x.v, l: l, r: r}; } return l; }
      function and(){ var l = cmp(); while(eatOp('&&')) l = {k: 'and', l: l, r: cmp()}; return l; }
      function or(){ var l = and(); while(eatOp('||')) l = {k: 'or', l: l, r: and()}; return l; }
      var r = or(); if(p < t.length) err('Unexpected "' + (t[p].v || t[p].k) + '" in filter'); return r;
    }
    function isObj(v){ return v !== null && typeof v === 'object'; }
    function kids(n){ var v = n.v, r = []; if(Array.isArray(v)) v.forEach(function(x, i){ r.push({v: x, p: n.p + '[' + i + ']'}); }); else if(isObj(v)) Object.keys(v).forEach(function(k){ r.push({v: v[k], p: n.p + "['" + k.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "']"}); }); return r; }
    function has(o, k){ return Object.prototype.hasOwnProperty.call(o, k); }
    function apply(nodes, seg, root){
      var out = [];
      nodes.forEach(function(n){
        var v = n.v;
        if(seg.t === 'name'){ if(isObj(v) && !Array.isArray(v) && has(v, seg.n)) out.push({v: v[seg.n], p: n.p + "['" + seg.n.replace(/'/g, "\\'") + "']"}); else if(seg.n === 'length' && (Array.isArray(v) || typeof v === 'string')) out.push({v: v.length, p: n.p + '.length'}); }
        else if(seg.t === 'index'){ if(Array.isArray(v)){ var i = seg.i < 0 ? v.length + seg.i : seg.i; if(i >= 0 && i < v.length) out.push({v: v[i], p: n.p + '[' + i + ']'}); } }
        else if(seg.t === 'wild'){ out = out.concat(kids(n)); }
        else if(seg.t === 'slice'){ if(Array.isArray(v)){ var len = v.length, st = seg.c, a = seg.a, b = seg.b; if(st > 0){ a = a === null ? 0 : a < 0 ? Math.max(0, len + a) : Math.min(a, len); b = b === null ? len : b < 0 ? Math.max(0, len + b) : Math.min(b, len); for(var x = a; x < b; x += st) out.push({v: v[x], p: n.p + '[' + x + ']'}); } else if(st < 0){ a = a === null ? len - 1 : a < 0 ? len + a : Math.min(a, len - 1); b = b === null ? -1 : b < 0 ? len + b : b; for(var y = a; y > b; y += st) out.push({v: v[y], p: n.p + '[' + y + ']'}); } } }
        else if(seg.t === 'union'){ seg.items.forEach(function(it){ if(it.n !== undefined){ if(isObj(v) && has(v, it.n)) out.push({v: v[it.n], p: n.p + "['" + it.n + "']"}); } else if(Array.isArray(v)){ var i2 = it.i < 0 ? v.length + it.i : it.i; if(i2 >= 0 && i2 < v.length) out.push({v: v[i2], p: n.p + '[' + i2 + ']'}); } }); }
        else if(seg.t === 'filter'){ kids(n).forEach(function(c){ if(truthy(ev(seg.e, c, root))) out.push(c); }); }
      });
      return out;
    }
    function run(nodes, segs, root){
      for(var i = 0; i < segs.length; i++){
        if(segs[i].t === 'desc'){
          var all = [], stack = nodes.slice();
          (function walk(list){ list.forEach(function(n){ all.push(n); if(isObj(n.v)) walk(kids(n)); }); })(nodes);
          nodes = all; continue;
        }
        nodes = apply(nodes, segs[i], root);
      }
      return nodes;
    }
    function truthy(x){ if(x && x.__nodes) return x.__nodes.length > 0; return x !== undefined && x !== null && x !== false && x !== 0 && x !== ''; }
    function val(x){ if(x && x.__nodes){ return x.__nodes.length ? x.__nodes[0].v : undefined; } return x; }
    function ev(e, cur, root){
      switch(e.k){
        case 'lit': return e.v;
        case 'path': return {__nodes: run([e.root ? {v: root, p: '$'} : cur], e.segs, root)};
        case 'not': return !truthy(ev(e.a, cur, root));
        case 'and': return truthy(ev(e.l, cur, root)) && truthy(ev(e.r, cur, root));
        case 'or': return truthy(ev(e.l, cur, root)) || truthy(ev(e.r, cur, root));
        case 'fn': { var a = ev(e.a, cur, root), v = val(a); if(a && a.__nodes && e.v === 'count') return a.__nodes.length; return Array.isArray(v) || typeof v === 'string' ? v.length : isObj(v) ? Object.keys(v).length : undefined; }
        case 'cmp': {
          var L = val(ev(e.l, cur, root)), R = val(ev(e.r, cur, root));
          switch(e.o){
            case '==': return JSON.stringify(L) === JSON.stringify(R) && (L !== undefined || R === undefined);
            case '!=': return !(JSON.stringify(L) === JSON.stringify(R) && (L !== undefined || R === undefined));
            case '<': return L !== undefined && R !== undefined && L < R; case '<=': return L !== undefined && R !== undefined && L <= R;
            case '>': return L !== undefined && R !== undefined && L > R; case '>=': return L !== undefined && R !== undefined && L >= R;
            case '=~': return R instanceof RegExp && typeof L === 'string' && R.test(L);
            case 'in': return Array.isArray(R) ? R.some(function(x){ return JSON.stringify(x) === JSON.stringify(L); }) : typeof R === 'string' && typeof L === 'string' && R.indexOf(L) >= 0;
            case 'nin': return !(Array.isArray(R) ? R.some(function(x){ return JSON.stringify(x) === JSON.stringify(L); }) : typeof R === 'string' && typeof L === 'string' && R.indexOf(L) >= 0);
            case 'contains': return Array.isArray(L) ? L.some(function(x){ return JSON.stringify(x) === JSON.stringify(R); }) : typeof L === 'string' && typeof R === 'string' && L.indexOf(R) >= 0;
            case 'subsetof': return Array.isArray(L) && Array.isArray(R) && L.every(function(x){ return R.some(function(y){ return JSON.stringify(x) === JSON.stringify(y); }); });
          }
        }
      }
      return undefined;
    }
    function query(root, expr){
      expr = expr.trim(); if(!expr) err('Enter a JSONPath expression'); if(expr[0] !== '$') err('A JSONPath expression must start with $');
      var p = parsePath(expr, 1); if(p.end < expr.length) err('Unexpected "' + expr.slice(p.end, p.end + 10) + '"');
      return run([{v: root, p: '$'}], p.segs, root);
    }
    return {query: query};
  })();
  reg('jsonpath-tester', 'JSONPATH TESTER', function(body, q){
    var SAMPLE = {store: {book: [{category: 'reference', author: 'Nigel Rees', title: 'Sayings of the Century', price: 8.95}, {category: 'fiction', author: 'Evelyn Waugh', title: 'Sword of Honour', price: 12.99}, {category: 'fiction', author: 'Herman Melville', title: 'Moby Dick', isbn: '0-553-21311-3', price: 8.99}, {category: 'fiction', author: 'J. R. R. Tolkien', title: 'The Lord of the Rings', isbn: '0-395-19395-8', price: 22.99}], bicycle: {color: 'red', price: 19.95}}, expensive: 10};
    body.innerHTML = '<div class="field"><label for="jp-q">JSONPath expression</label><input id="jp-q" value="$.store.book[?(@.price < 10)].title" spellcheck="false" autocomplete="off"></div><div class="tool-row" id="jp-ex"></div>' +
      '<div class="tool-grid two">' + ta('jp-in', 'JSON', 16, '') + '<div class="field"><label>Matches <span id="jp-n"></span></label><div class="tool-output" id="jp-out" style="white-space:pre-wrap;font-family:var(--font-mono);font-size:12px;min-height:300px;max-height:420px;overflow:auto"></div></div></div>' +
      '<div class="tool-row">' + chk('jp-paths', 'Show paths', true) + btn('jp-copy', 'Copy values as JSON', true) + btn('jp-sample', 'Reset sample data', true) + '</div><div class="tool-msg" id="jp-msg" role="status"></div>' +
      '<details class="result-card"><summary style="cursor:pointer;font-weight:600">Syntax reference</summary><pre style="white-space:pre-wrap;font-size:12px;margin:8px 0 0">$            root\n.name  [\'name\']   child\n..name       recursive descent\n*  [*]       wildcard\n[0]  [-1]    array index (negative counts from the end)\n[1:3]  [::2] slice (start:end:step)\n[0,2]  [\'a\',\'b\']  union\n[?(@.price &lt; 10)]          filter\n[?(@.a &amp;&amp; @.b == "x")]     and / or / not (&amp;&amp; || !)\n[?(@.name =~ /^A/i)]       regular expression\n[?(@.tag in ["a","b"])]     in / nin / contains\n[?(length(@.items) &gt; 2)]  length() and count()\n.length                    length of an array or string</pre></details>';
    var EX = [['All titles', '$.store.book[*].title'], ['Under 10', '$.store.book[?(@.price < 10)].title'], ['Has ISBN', '$..book[?(@.isbn)]'], ['Last book', '$..book[-1:]'], ['Every price', '$..price'], ['First two', '$.store.book[0,1].author']];
    q('#jp-ex').innerHTML = EX.map(function(x, i){ return '<button type="button" class="game-btn secondary" data-i="' + i + '">' + x[0] + '</button>'; }).join('');
    var last = [];
    function run(){
      var m = q('#jp-msg'), o = q('#jp-out'), n = q('#jp-n'), data; last = [];
      try{ data = JSON.parse(q('#jp-in').value); }catch(e){ o.textContent = ''; n.textContent = ''; msg(m, 'JSON error: ' + e.message, 'err'); return; }
      try{
        var res = JP.query(data, q('#jp-q').value); last = res; n.textContent = '(' + res.length + ')'; msg(m, res.length ? '' : 'No matches.', res.length ? '' : '');
        var sp = q('#jp-paths').checked;
        o.textContent = res.map(function(r){ return (sp ? r.p + '\n' : '') + JSON.stringify(r.v, null, 2); }).join(sp ? '\n\n' : '\n');
      }catch(e){ o.textContent = ''; n.textContent = ''; msg(m, e.message, 'err'); }
    }
    q('#jp-in').value = JSON.stringify(SAMPLE, null, 2);
    q('#jp-q').addEventListener('input', debounce(run, 120)); q('#jp-in').addEventListener('input', debounce(run, 200)); q('#jp-paths').addEventListener('change', run);
    q('#jp-ex').addEventListener('click', function(e){ var b = e.target.closest('button'); if(!b) return; q('#jp-q').value = EX[+b.getAttribute('data-i')][1]; run(); });
    q('#jp-copy').addEventListener('click', function(){ copyText(JSON.stringify(last.map(function(r){ return r.v; }), null, 2), this); });
    q('#jp-sample').addEventListener('click', function(){ q('#jp-in').value = JSON.stringify(SAMPLE, null, 2); run(); });
    run();
  });

  /* ================= XML formatter ================= */
  function parseXml(src){
    var doc = new DOMParser().parseFromString(src, 'application/xml'), e = doc.getElementsByTagName('parsererror')[0];
    if(e){ var t = e.textContent.replace(/\s+/g, ' ').trim(), m = /(?:line|Line)\D{0,12}(\d+)\D{0,20}(?:column|Column|col)\D{0,12}(\d+)/.exec(t); return {error: (t.split(/Below is a rendering|Location:/)[0] || t).slice(0, 300).trim(), line: m ? +m[1] : null, col: m ? +m[2] : null}; }
    return {doc: doc};
  }
  reg('xml-formatter', 'XML FORMATTER', function(body, q){
    body.innerHTML = '<div class="tool-grid two">' + ta('xf-in', 'XML', 16, '<?xml version="1.0"?><catalog><book id="1"><title>XML Basics</title><price>9.99</price></book><!-- note --><book id="2"/></catalog>') + ta('xf-out', 'Result', 16, '', 'readonly') + '</div>' +
      '<div class="tool-row">' + sel('xf-ind', 'Indent', [['2', '2 spaces'], ['4', '4 spaces'], ['t', 'Tab']]) + chk('xf-sort', 'Sort attributes', false) + chk('xf-decl', 'Keep XML declaration', true) + btn('xf-fmt', 'Format') + btn('xf-min', 'Minify', true) + btn('xf-copy', 'Copy', true) + btn('xf-dl', 'Download', true) + '</div><div class="tool-msg" id="xf-msg" role="status"></div>' +
      '<p class="hint">Well-formedness is checked as you type. In elements that mix text and child elements, formatting can add whitespace between them, so use Minify or review the result before using it where whitespace matters.</p>';
    function escT(s){ return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
    function escA(s){ return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }
    function ser(n, d, o){
      var pad = o.min ? '' : o.tab.repeat(d), nl = o.min ? '' : '\n';
      switch(n.nodeType){
        case 1: {
          var at = Array.prototype.slice.call(n.attributes); if(o.sort) at.sort(function(a, b){ return a.name < b.name ? -1 : 1; });
          var a = at.map(function(x){ return ' ' + x.name + '="' + escA(x.value) + '"'; }).join(''), ch = Array.prototype.filter.call(n.childNodes, function(c){ return !(c.nodeType === 3 && !c.nodeValue.trim()); });
          if(!ch.length) return pad + '<' + n.nodeName + a + '/>' + nl;
          if(ch.length === 1 && (ch[0].nodeType === 3 || ch[0].nodeType === 4)) return pad + '<' + n.nodeName + a + '>' + (ch[0].nodeType === 4 ? '<![CDATA[' + ch[0].nodeValue + ']]>' : escT(o.min ? ch[0].nodeValue.trim() : ch[0].nodeValue.trim())) + '</' + n.nodeName + '>' + nl;
          return pad + '<' + n.nodeName + a + '>' + nl + ch.map(function(c){ return ser(c, d + 1, o); }).join('') + pad + '</' + n.nodeName + '>' + nl;
        }
        case 3: { var t = n.nodeValue.trim(); return t ? pad + escT(t) + nl : ''; }
        case 4: return pad + '<![CDATA[' + n.nodeValue + ']]>' + nl;
        case 8: return pad + '<!--' + n.nodeValue + '-->' + nl;
        case 7: return pad + '<?' + n.target + (n.data ? ' ' + n.data : '') + '?>' + nl;
        case 10: return pad + '<!DOCTYPE ' + n.name + (n.publicId ? ' PUBLIC "' + n.publicId + '" "' + n.systemId + '"' : n.systemId ? ' SYSTEM "' + n.systemId + '"' : '') + '>' + nl;
        default: return '';
      }
    }
    q('#xf-in').value = '<?xml version="1.0"?><catalog><book id="1"><title>XML Basics</title><price>9.99</price></book><!-- note --><book id="2"/></catalog>';
    function run(min){
      var s = q('#xf-in').value, m = q('#xf-msg');
      if(!s.trim()){ q('#xf-out').value = ''; msg(m, ''); return; }
      var r = parseXml(s);
      if(r.error){ q('#xf-out').value = ''; msg(m, 'Not well-formed' + (r.line ? ' (line ' + r.line + ', column ' + r.col + ')' : '') + ': ' + r.error, 'err'); return; }
      var ind = q('#xf-ind').value, o = {min: min === true, tab: ind === 't' ? '\t' : ' '.repeat(+ind), sort: q('#xf-sort').checked}, decl = /^\s*(<\?xml[^?]*\?>)/.exec(s);
      var out = Array.prototype.map.call(r.doc.childNodes, function(c){ return ser(c, 0, o); }).join('');
      q('#xf-out').value = (decl && q('#xf-decl').checked ? decl[1] + (o.min ? '' : '\n') : '') + out.replace(/\n$/, '') + (o.min ? '' : '\n');
      msg(m, 'Well-formed XML · ' + (o.min ? 'minified' : 'formatted'), 'ok');
    }
    run(false);
    q('#xf-fmt').addEventListener('click', function(){ run(false); }); q('#xf-min').addEventListener('click', function(){ run(true); });
    q('#xf-in').addEventListener('input', debounce(function(){ run(false); }, 250)); ['#xf-ind', '#xf-sort', '#xf-decl'].forEach(function(s){ q(s).addEventListener('change', function(){ run(false); }); });
    q('#xf-copy').addEventListener('click', function(){ copyText(q('#xf-out').value, this); });
    q('#xf-dl').addEventListener('click', function(){ if(q('#xf-out').value) save('formatted.xml', q('#xf-out').value, 'application/xml'); });
  });

  /* ================= XML / XSD tester ================= */
  var XSD = (function(){
    var NS = 'http://www.w3.org/2001/XMLSchema';
    function lname(n){ return n.localName || n.nodeName.replace(/^.*:/, ''); }
    function xkids(el, names){ var r = []; for(var c = el.firstElementChild; c; c = c.nextElementSibling) if(c.namespaceURI === NS && (!names || names.indexOf(lname(c)) >= 0)) r.push(c); return r; }
    function qn(s){ return String(s || '').replace(/^.*:/, ''); }
    function occ(el){ var mn = el.getAttribute('minOccurs'), mx = el.getAttribute('maxOccurs'); return {min: mn === null ? 1 : +mn, max: mx === null ? 1 : mx === 'unbounded' ? Infinity : +mx}; }
    var INT_RANGE = {byte: [-128, 127], short: [-32768, 32767], int: [-2147483648, 2147483647], long: [-9223372036854775808, 9223372036854775807], unsignedByte: [0, 255], unsignedShort: [0, 65535], unsignedInt: [0, 4294967295], unsignedLong: [0, 18446744073709551615], nonNegativeInteger: [0, Infinity], positiveInteger: [1, Infinity], nonPositiveInteger: [-Infinity, 0], negativeInteger: [-Infinity, -1]};
    function builtin(t, v){
      switch(t){
        case 'string': case 'normalizedString': case 'token': case 'anyType': case 'anySimpleType': case 'anyURI': case 'QName': case 'NMTOKEN': case 'Name': return t === 'NMTOKEN' && !/^[\w.:-]+$/.test(v) ? 'is not a valid NMTOKEN' : t === 'Name' && !/^[A-Za-z_:][\w.:-]*$/.test(v) ? 'is not a valid Name' : null;
        case 'NCName': case 'ID': case 'IDREF': return /^[A-Za-z_][\w.-]*$/.test(v) ? null : 'is not a valid ' + t;
        case 'language': return /^[a-zA-Z]{1,8}(-[a-zA-Z0-9]{1,8})*$/.test(v) ? null : 'is not a valid language code';
        case 'boolean': return /^(true|false|1|0)$/.test(v) ? null : 'must be true, false, 1 or 0';
        case 'decimal': return /^[-+]?(\d+(\.\d*)?|\.\d+)$/.test(v) ? null : 'is not a valid decimal number';
        case 'float': case 'double': return /^([-+]?(\d+(\.\d*)?|\.\d+)([eE][-+]?\d+)?|INF|-INF|NaN)$/.test(v) ? null : 'is not a valid ' + t;
        case 'integer': return /^[-+]?\d+$/.test(v) ? null : 'is not a valid integer';
        case 'date': { var m = /^(-?\d{4,})-(\d\d)-(\d\d)(Z|[-+]\d\d:\d\d)?$/.exec(v); if(!m) return 'is not a valid date (YYYY-MM-DD)'; var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])); return d.getUTCMonth() === m[2] - 1 && d.getUTCDate() === +m[3] ? null : 'is not a real calendar date'; }
        case 'dateTime': return /^-?\d{4,}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?(Z|[-+]\d\d:\d\d)?$/.test(v) && !isNaN(Date.parse(v.replace(/^(-?\d{4,}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?)$/, '$1Z'))) ? null : 'is not a valid dateTime (YYYY-MM-DDThh:mm:ss)';
        case 'time': return /^\d\d:\d\d:\d\d(\.\d+)?(Z|[-+]\d\d:\d\d)?$/.test(v) ? null : 'is not a valid time (hh:mm:ss)';
        case 'gYear': return /^-?\d{4,}(Z|[-+]\d\d:\d\d)?$/.test(v) ? null : 'is not a valid year';
        case 'duration': return /^-?P(?=\d|T\d)(\d+Y)?(\d+M)?(\d+D)?(T(\d+H)?(\d+M)?(\d+(\.\d+)?S)?)?$/.test(v) ? null : 'is not a valid duration';
        case 'hexBinary': return /^([0-9a-fA-F]{2})*$/.test(v) ? null : 'is not valid hexBinary';
        case 'base64Binary': return /^[A-Za-z0-9+/=\s]*$/.test(v) ? null : 'is not valid base64Binary';
      }
      if(INT_RANGE[t]){ if(!/^[-+]?\d+$/.test(v)) return 'is not a valid integer'; var n = Number(v), r = INT_RANGE[t]; return n < r[0] || n > r[1] ? 'is outside the range of ' + t + ' (' + r[0] + ' to ' + r[1] + ')' : null; }
      return null;
    }
    function compile(xsdDoc){
      var root = xsdDoc.documentElement;
      if(!root || root.namespaceURI !== NS || lname(root) !== 'schema') throw new Error('The schema root must be <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">.');
      var S = {elements: {}, types: {}, attrs: {}, groups: {}, attrGroups: {}, unsupported: {}, root: root};
      xkids(root).forEach(function(c){ var k = lname(c), n = c.getAttribute('name');
        if(k === 'element') S.elements[n] = c; else if(k === 'complexType' || k === 'simpleType') S.types[n] = c; else if(k === 'attribute') S.attrs[n] = c; else if(k === 'group') S.groups[n] = c; else if(k === 'attributeGroup') S.attrGroups[n] = c;
        else if(k === 'import' || k === 'include' || k === 'redefine') S.unsupported[k] = 1; });
      return S;
    }
    function simpleDef(S, node, depth){
      depth = depth || 0; if(depth > 20) return {base: 'string', facets: {}};
      var r = xkids(node, ['restriction'])[0], l = xkids(node, ['list'])[0], u = xkids(node, ['union'])[0];
      if(r){
        var f = {enum: [], pattern: []}, b = r.getAttribute('base') ? resolveSimple(S, qn(r.getAttribute('base')), depth + 1) : (xkids(r, ['simpleType'])[0] ? simpleDef(S, xkids(r, ['simpleType'])[0], depth + 1) : {base: 'string', facets: {}});
        xkids(r).forEach(function(x){ var k = lname(x), v = x.getAttribute('value'); if(k === 'enumeration') f.enum.push(v); else if(k === 'pattern') f.pattern.push(v); else if(k !== 'simpleType') f[k] = v; });
        return {base: b.base, facets: f, parent: b, list: b.list, union: b.union};
      }
      if(l){ var it = l.getAttribute('itemType') ? resolveSimple(S, qn(l.getAttribute('itemType')), depth + 1) : simpleDef(S, xkids(l, ['simpleType'])[0], depth + 1); return {base: 'string', facets: {}, list: it}; }
      if(u){ var ms = (u.getAttribute('memberTypes') || '').split(/\s+/).filter(Boolean).map(function(t){ return resolveSimple(S, qn(t), depth + 1); }).concat(xkids(u, ['simpleType']).map(function(x){ return simpleDef(S, x, depth + 1); })); return {base: 'string', facets: {}, union: ms}; }
      return {base: 'string', facets: {}};
    }
    function resolveSimple(S, name, depth){ var t = S.types[name]; if(t && lname(t) === 'simpleType') return simpleDef(S, t, depth); return {base: name, facets: {}}; }
    function checkSimple(S, def, raw){
      var v = raw, ws = null; for(var d = def; d; d = d.parent) if(d.facets && d.facets.whiteSpace && !ws) ws = d.facets.whiteSpace;
      var bb = def; while(bb.parent) bb = bb.parent;
      if(ws === 'collapse' || /^(token|NMTOKEN|Name|NCName|ID|IDREF|language|integer|decimal|boolean|date|dateTime|time|float|double|duration|gYear|anyURI|QName|byte|short|int|long|unsigned\w+|\w*[Ii]nteger)$/.test(bb.base)) v = v.replace(/\s+/g, ' ').trim(); else if(ws === 'replace' || bb.base === 'normalizedString') v = v.replace(/[\t\n\r]/g, ' ');
      if(def.list){ var items = v.split(/\s+/).filter(Boolean), er = null; items.forEach(function(it){ er = er || checkSimple(S, def.list, it); }); return er; }
      if(def.union){ var ok = def.union.some(function(m){ return !checkSimple(S, m, v); }); if(!ok) return 'does not match any type in the union'; }
      var chain = []; for(var x = def; x; x = x.parent) chain.push(x);
      var e = bb.union || bb.list ? null : builtin(bb.base, v); if(e) return '"' + v + '" ' + e;
      for(var i = chain.length - 1; i >= 0; i--){
        var f = chain[i].facets || {}, len = v.length, num = Number(v);
        if(f.enum && f.enum.length && f.enum.indexOf(v) < 0) return '"' + v + '" is not one of the allowed values: ' + f.enum.join(', ');
        for(var p = 0; p < (f.pattern || []).length; p++){ var re; try{ re = new RegExp('^(?:' + f.pattern[p] + ')$', 'u'); }catch(x1){ try{ re = new RegExp('^(?:' + f.pattern[p] + ')$'); }catch(x2){ continue; } } if(!re.test(v)) return '"' + v + '" does not match the pattern ' + f.pattern[p]; }
        if(f.length !== undefined && len !== +f.length) return 'length must be exactly ' + f.length + ' (it is ' + len + ')';
        if(f.minLength !== undefined && len < +f.minLength) return 'must be at least ' + f.minLength + ' characters (it is ' + len + ')';
        if(f.maxLength !== undefined && len > +f.maxLength) return 'must be at most ' + f.maxLength + ' characters (it is ' + len + ')';
        if(f.minInclusive !== undefined && num < +f.minInclusive) return v + ' is below the minimum of ' + f.minInclusive;
        if(f.maxInclusive !== undefined && num > +f.maxInclusive) return v + ' is above the maximum of ' + f.maxInclusive;
        if(f.minExclusive !== undefined && num <= +f.minExclusive) return v + ' must be greater than ' + f.minExclusive;
        if(f.maxExclusive !== undefined && num >= +f.maxExclusive) return v + ' must be less than ' + f.maxExclusive;
        if(f.totalDigits !== undefined && v.replace(/^[-+]/, '').replace('.', '').replace(/^0+(?=\d)/, '').length > +f.totalDigits) return 'has more than ' + f.totalDigits + ' digits';
        if(f.fractionDigits !== undefined && ((v.split('.')[1] || '').length > +f.fractionDigits)) return 'has more than ' + f.fractionDigits + ' decimal places';
      }
      return null;
    }
    function typeOf(S, decl){
      var t = decl.getAttribute('type');
      if(t){ var n = qn(t), ct = S.types[n]; if(ct) return {kind: lname(ct) === 'complexType' ? 'complex' : 'simple', node: ct}; return {kind: 'simple', def: {base: n, facets: {}}}; }
      var ic = xkids(decl, ['complexType'])[0], is = xkids(decl, ['simpleType'])[0];
      if(ic) return {kind: 'complex', node: ic}; if(is) return {kind: 'simple', node: is};
      return {kind: 'any'};
    }
    function particles(S, node, depth){
      /* flatten a complexType into {attrs, content: particle|null, simple: def|null, mixed} */
      depth = depth || 0; var res = {attrs: [], content: null, simple: null, mixed: node.getAttribute('mixed') === 'true', anyAttr: false};
      if(depth > 20) return res;
      function addAttrs(el){ xkids(el, ['attribute', 'attributeGroup', 'anyAttribute']).forEach(function(a){ var k = lname(a); if(k === 'attribute'){ var ref = a.getAttribute('ref'); if(ref){ var g = S.attrs[qn(ref)]; res.attrs.push({name: qn(ref), use: a.getAttribute('use') || 'optional', node: g || a, fixed: g && g.getAttribute('fixed')}); } else res.attrs.push({name: a.getAttribute('name'), use: a.getAttribute('use') || 'optional', node: a, fixed: a.getAttribute('fixed')}); } else if(k === 'anyAttribute') res.anyAttr = true; else { var gr = S.attrGroups[qn(a.getAttribute('ref'))]; if(gr) addAttrs(gr); } }); }
      var sc = xkids(node, ['simpleContent'])[0], cc = xkids(node, ['complexContent'])[0];
      if(sc){ var ext = xkids(sc, ['extension', 'restriction'])[0]; if(ext){ var bn = qn(ext.getAttribute('base')), bt = S.types[bn]; if(bt && lname(bt) === 'complexType'){ var bp = particles(S, bt, depth + 1); res.simple = bp.simple; res.attrs = bp.attrs.slice(); } else res.simple = bt ? simpleDef(S, bt) : {base: bn, facets: {}}; if(lname(ext) === 'restriction'){ var rf = simpleDef(S, sc.ownerDocument.createElementNS(NS, 'xs:simpleType')); } addAttrs(ext); var inl = xkids(ext, ['simpleType'])[0]; if(lname(ext) === 'restriction'){ var d2 = simpleDef(S, (function(){ var st = ext.ownerDocument.createElementNS(NS, 'xs:simpleType'); st.appendChild(ext.cloneNode(true)); return st; })()); res.simple = d2; } } return res; }
      if(cc){ var e2 = xkids(cc, ['extension', 'restriction'])[0]; if(e2){ var base = S.types[qn(e2.getAttribute('base'))], bpp = base && lname(base) === 'complexType' ? particles(S, base, depth + 1) : null; var own = xkids(e2, ['sequence', 'choice', 'all', 'group'])[0];
          if(lname(e2) === 'extension' && bpp){ res.attrs = bpp.attrs.slice(); res.mixed = res.mixed || bpp.mixed; res.anyAttr = bpp.anyAttr; res.content = bpp.content && own ? {k: 'sequence', min: 1, max: 1, items: [bpp.content, mk(S, own, depth + 1)]} : bpp.content || (own ? mk(S, own, depth + 1) : null); }
          else res.content = own ? mk(S, own, depth + 1) : null; addAttrs(e2); } return res; }
      var m = xkids(node, ['sequence', 'choice', 'all', 'group'])[0]; if(m) res.content = mk(S, m, depth + 1); addAttrs(node); return res;
    }
    function mk(S, el, depth){
      var k = lname(el), o = occ(el);
      if(k === 'element'){ var ref = el.getAttribute('ref'), decl = ref ? S.elements[qn(ref)] : el; return {k: 'element', name: ref ? qn(ref) : el.getAttribute('name'), decl: decl, min: o.min, max: o.max, missing: ref && !decl}; }
      if(k === 'any') return {k: 'any', min: o.min, max: o.max};
      if(k === 'group'){ var g = S.groups[qn(el.getAttribute('ref'))]; var inner = g && xkids(g, ['sequence', 'choice', 'all'])[0]; return inner && depth < 30 ? Object.assign({}, mk(S, inner, depth + 1), {min: o.min, max: o.max}) : {k: 'sequence', min: 1, max: 1, items: []}; }
      return {k: k, min: o.min, max: o.max, items: xkids(el, ['element', 'sequence', 'choice', 'all', 'any', 'group']).map(function(c){ return mk(S, c, depth + 1); })};
    }
    function collect(p, map){ if(!p) return; if(p.k === 'element') map[p.name] = p; else if(p.items) p.items.forEach(function(c){ collect(c, map); }); }
    function matchSeq(p, ch, i, exp){
      /* returns an object {pos:1,...} of reachable end positions after consuming this particle min..max times */
      var res = {}, cur = {}; cur[i] = 1; var count = 0; if(p.min === 0) res[i] = 1;
      while(count < p.max && Object.keys(cur).length && count < ch.length + p.min + 1){
        var nx = {};
        Object.keys(cur).forEach(function(s){ var r = once(p, ch, +s, exp); Object.keys(r).forEach(function(e){ if(+e > +s || count < p.min) nx[e] = 1; }); });
        count++; if(count >= p.min) Object.keys(nx).forEach(function(e){ res[e] = 1; });
        var same = Object.keys(nx).length === Object.keys(cur).length && Object.keys(nx).every(function(e){ return cur[e]; }); cur = nx; if(same && count >= p.min) break;
      }
      return res;
    }
    function once(p, ch, i, exp){
      var out = {};
      if(p.k === 'element'){ if(ch[i] && lname(ch[i]) === p.name) out[i + 1] = 1; else (exp[i] = exp[i] || {})[p.name] = 1; return out; }
      if(p.k === 'any'){ if(ch[i]) out[i + 1] = 1; return out; }
      if(p.k === 'sequence'){ var pos = {}; pos[i] = 1; for(var x = 0; x < p.items.length; x++){ var nx = {}; Object.keys(pos).forEach(function(s){ Object.keys(matchSeq(p.items[x], ch, +s, exp)).forEach(function(e){ nx[e] = 1; }); }); pos = nx; if(!Object.keys(pos).length) break; } return pos; }
      if(p.k === 'choice'){ p.items.forEach(function(c){ Object.keys(matchSeq(c, ch, i, exp)).forEach(function(e){ out[e] = 1; }); }); return out; }
      if(p.k === 'all'){ var cnt = {}, j = i, names = {}; p.items.forEach(function(c){ if(c.k === 'element') names[c.name] = c; });
        while(ch[j] && names[lname(ch[j])] && (cnt[lname(ch[j])] || 0) < names[lname(ch[j])].max){ cnt[lname(ch[j])] = (cnt[lname(ch[j])] || 0) + 1; j++; }
        var okAll = p.items.every(function(c){ if(c.k !== 'element') return true; if((cnt[c.name] || 0) >= c.min) return true; (exp[j] = exp[j] || {})[c.name] = 1; return false; }); if(okAll) out[j] = 1; return out; }
      return out;
    }
    function path(n){ var parts = []; for(var e = n; e && e.nodeType === 1; e = e.parentNode){ var nm = lname(e), idx = 1, sib = e.previousElementSibling, tot = 0; for(var s = e.parentNode && e.parentNode.firstElementChild; s; s = s.nextElementSibling) if(lname(s) === nm) tot++; for(; sib; sib = sib.previousElementSibling) if(lname(sib) === nm) idx++; parts.unshift(nm + (tot > 1 ? '[' + idx + ']' : '')); } return '/' + parts.join('/'); }
    function validate(S, inst){
      var errors = [], root = inst.documentElement, decl = S.elements[lname(root)];
      if(!decl){ return {errors: [{path: '/' + lname(root), msg: 'No global element named "' + lname(root) + '" is declared in the schema. Declared: ' + (Object.keys(S.elements).join(', ') || 'none') + '.'}], count: 0}; }
      var count = 0;
      function E(n, m){ errors.push({path: path(n), msg: m}); }
      function el(n, d){
        count++; var t = typeOf(S, d);
        if(t.kind === 'any') return;
        var attrsIn = Array.prototype.filter.call(n.attributes, function(a){ return !/^xmlns(:|$)/.test(a.name) && a.namespaceURI !== 'http://www.w3.org/2001/XMLSchema-instance'; });
        var kidsEl = Array.prototype.filter.call(n.childNodes, function(c){ return c.nodeType === 1; }), text = Array.prototype.filter.call(n.childNodes, function(c){ return c.nodeType === 3 || c.nodeType === 4; }).map(function(c){ return c.nodeValue; }).join('');
        if(t.kind === 'simple'){
          var def = t.def || simpleDef(S, t.node);
          if(attrsIn.length) E(n, 'Attribute "' + attrsIn[0].name + '" is not allowed on a simple-type element.');
          if(kidsEl.length) E(n, 'Element <' + lname(n) + '> cannot contain child elements; it holds a ' + (def.base || 'simple') + ' value.');
          var fx = d.getAttribute('fixed'), dflt = d.getAttribute('default'), tv = text; if(tv === '' && dflt !== null) tv = dflt;
          var er = checkSimple(S, def, tv); if(er) E(n, 'Value ' + er + '.'); else if(fx !== null && tv.trim() !== fx) E(n, 'Value must be the fixed value "' + fx + '".');
          return;
        }
        var P = particles(S, t.node);
        P.attrs.forEach(function(a){ var found = attrsIn.filter(function(x){ return x.name.replace(/^.*:/, '') === a.name; })[0];
          if(!found){ if(a.use === 'required') E(n, 'Required attribute "' + a.name + '" is missing.'); return; }
          if(a.use === 'prohibited'){ E(n, 'Attribute "' + a.name + '" is prohibited.'); return; }
          var at = a.node.getAttribute('type'), def = at ? (S.types[qn(at)] && lname(S.types[qn(at)]) === 'simpleType' ? simpleDef(S, S.types[qn(at)]) : {base: qn(at), facets: {}}) : (xkids(a.node, ['simpleType'])[0] ? simpleDef(S, xkids(a.node, ['simpleType'])[0]) : null);
          if(def){ var e1 = checkSimple(S, def, found.value); if(e1) E(n, 'Attribute "' + a.name + '": value ' + e1 + '.'); }
          if(a.fixed && found.value !== a.fixed) E(n, 'Attribute "' + a.name + '" must be "' + a.fixed + '".'); });
        if(!P.anyAttr) attrsIn.forEach(function(x){ if(!P.attrs.some(function(a){ return a.name === x.name.replace(/^.*:/, ''); })) E(n, 'Attribute "' + x.name + '" is not declared.'); });
        if(P.simple){ if(kidsEl.length) E(n, 'Element <' + lname(n) + '> may contain only text.'); var er2 = checkSimple(S, P.simple, text); if(er2) E(n, 'Value ' + er2 + '.'); return; }
        if(!P.mixed && text.trim()) E(n, 'Element <' + lname(n) + '> does not allow text content ("' + text.trim().slice(0, 30) + (text.trim().length > 30 ? '…' : '') + '").');
        if(!P.content){ if(kidsEl.length) E(n, 'Element <' + lname(n) + '> must be empty but contains <' + lname(kidsEl[0]) + '>.'); return; }
        var exp = {}, ends = matchSeq(P.content, kidsEl, 0, exp);
        if(!ends[kidsEl.length]){
          var keys = Object.keys(exp).map(Number).sort(function(a, b){ return b - a; }), far = keys.length ? keys[0] : 0, names = exp[far] ? Object.keys(exp[far]) : [];
          if(far >= kidsEl.length) E(n, 'Element <' + lname(n) + '> is incomplete. Expected ' + (names.length > 1 ? 'one of ' : '') + names.map(function(x){ return '<' + x + '>'; }).join(', ') + ' next.');
          else E(n, 'Unexpected element <' + lname(kidsEl[far]) + '> in <' + lname(n) + '>.' + (names.length ? ' Expected ' + (names.length > 1 ? 'one of ' : '') + names.map(function(x){ return '<' + x + '>'; }).join(', ') + '.' : ' No more child elements are allowed here.'));
        }
        var map = {}; collect(P.content, map);
        kidsEl.forEach(function(c){ var pm = map[lname(c)]; if(pm && pm.decl) el(c, pm.decl); else if(pm && pm.missing) E(c, 'The schema references element "' + pm.name + '" but never declares it.'); });
      }
      el(root, decl);
      return {errors: errors, count: count};
    }
    return {compile: compile, validate: validate};
  })();
  reg('xml-xsd-tester', 'XML / XSD TESTER', function(body, q){
    var SX = '<?xml version="1.0"?>\n<order id="A-100">\n  <customer>Ada Lovelace</customer>\n  <item sku="X1"><name>Widget</name><qty>3</qty><price>9.99</price></item>\n  <item sku="X2"><name>Gadget</name><qty>2</qty><price>19.50</price></item>\n  <status>shipped</status>\n</order>';
    var SS = '<?xml version="1.0"?>\n<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">\n  <xs:element name="order">\n    <xs:complexType>\n      <xs:sequence>\n        <xs:element name="customer" type="xs:string"/>\n        <xs:element name="item" maxOccurs="unbounded">\n          <xs:complexType>\n            <xs:sequence>\n              <xs:element name="name" type="xs:string"/>\n              <xs:element name="qty" type="xs:positiveInteger"/>\n              <xs:element name="price" type="xs:decimal"/>\n            </xs:sequence>\n            <xs:attribute name="sku" type="xs:string" use="required"/>\n          </xs:complexType>\n        </xs:element>\n        <xs:element name="status">\n          <xs:simpleType>\n            <xs:restriction base="xs:string">\n              <xs:enumeration value="pending"/>\n              <xs:enumeration value="shipped"/>\n            </xs:restriction>\n          </xs:simpleType>\n        </xs:element>\n      </xs:sequence>\n      <xs:attribute name="id" type="xs:string" use="required"/>\n    </xs:complexType>\n  </xs:element>\n</xs:schema>';
    body.innerHTML = '<div class="tool-grid two">' + ta('xx-xml', 'XML document', 16, '') + ta('xx-xsd', 'XSD schema', 16, '') + '</div><div class="tool-row">' + btn('xx-run', 'Validate') + btn('xx-sample', 'Load sample', true) + chk('xx-live', 'Validate as I type', true) + '</div><div class="result-card"><div class="field-label">Result</div><div id="xx-res" aria-live="polite"></div></div>' +
      '<p class="hint">Checks well-formedness, then validates against the schema: element order and counts (sequence, choice, all, minOccurs, maxOccurs), attributes, built-in types and the common facets (enumeration, pattern, length, min/max, digits). Namespaces are matched by local name. xs:import / xs:include, substitution groups, and key / unique / keyref constraints are not checked.</p>';
    q('#xx-xml').value = SX; q('#xx-xsd').value = SS;
    function show(kind, title, items){ q('#xx-res').innerHTML = '<div style="font-weight:700;color:' + (kind === 'ok' ? '#36c979' : kind === 'warn' ? '#e0b341' : '#ff6b6b') + '">' + esc(title) + '</div>' + (items && items.length ? '<ol style="margin:8px 0 0;padding-left:20px;font-size:12px;line-height:1.7">' + items.map(function(e){ return '<li><code style="color:var(--accent)">' + esc(e.path) + '</code> ' + esc(e.msg) + '</li>'; }).join('') + '</ol>' : ''); }
    function run(){
      var xs = q('#xx-xml').value, ss = q('#xx-xsd').value;
      if(!xs.trim() || !ss.trim()){ show('warn', 'Enter both an XML document and an XSD schema.'); return; }
      var x = parseXml(xs); if(x.error){ show('err', 'The XML is not well-formed' + (x.line ? ' (line ' + x.line + ', column ' + x.col + ')' : ''), [{path: 'XML', msg: x.error}]); return; }
      var s = parseXml(ss); if(s.error){ show('err', 'The XSD is not well-formed' + (s.line ? ' (line ' + s.line + ', column ' + s.col + ')' : ''), [{path: 'XSD', msg: s.error}]); return; }
      var S; try{ S = XSD.compile(s.doc); }catch(e){ show('err', 'The schema cannot be used', [{path: 'XSD', msg: e.message}]); return; }
      var r; try{ r = XSD.validate(S, x.doc); }catch(e){ show('err', 'Validation stopped unexpectedly', [{path: 'validator', msg: e.message}]); return; }
      var warn = Object.keys(S.unsupported).length ? ' (the schema uses xs:' + Object.keys(S.unsupported).join(', xs:') + ', which is not followed)' : '';
      if(!r.errors.length) show(warn ? 'warn' : 'ok', 'Valid: the XML conforms to the schema · ' + r.count + ' element' + (r.count === 1 ? '' : 's') + ' checked' + warn);
      else show('err', r.errors.length + ' validation error' + (r.errors.length === 1 ? '' : 's') + warn, r.errors.slice(0, 200));
    }
    q('#xx-run').addEventListener('click', run);
    q('#xx-sample').addEventListener('click', function(){ q('#xx-xml').value = SX; q('#xx-xsd').value = SS; run(); });
    var live = debounce(function(){ if(q('#xx-live').checked) run(); }, 300); q('#xx-xml').addEventListener('input', live); q('#xx-xsd').addEventListener('input', live);
    run();
  });

  /* ---------- mount the tool for this page ---------- */
  var id = document.body.getAttribute('data-id'), slot = document.getElementById('embed-slot');
  if(slot && REG[id]) REG[id](slot);
})();
