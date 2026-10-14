// tools/word-counter.js — loaded by tools/word-counter.html. Shared helpers come from assets/js/play.js.

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

mountWordCounter(document.getElementById('embed-slot'));
