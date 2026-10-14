// tools/json-csv.js — loaded by tools/json-csv.html.

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

mountJsonCsv(document.getElementById('embed-slot'));
