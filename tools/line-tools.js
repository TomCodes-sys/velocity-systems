// tools/line-tools.js — loaded by tools/line-tools.html.

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

mountLineTools(document.getElementById('embed-slot'));
