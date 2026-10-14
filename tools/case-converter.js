// tools/case-converter.js — loaded by tools/case-converter.html.

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

mountCaseConverter(document.getElementById('embed-slot'));
