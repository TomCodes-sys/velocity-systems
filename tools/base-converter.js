// tools/base-converter.js — loaded by tools/base-converter.html.

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

mountBaseConverter(document.getElementById('embed-slot'));
