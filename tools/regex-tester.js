// tools/regex-tester.js — loaded by tools/regex-tester.html.

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

mountRegexTester(document.getElementById('embed-slot'));
