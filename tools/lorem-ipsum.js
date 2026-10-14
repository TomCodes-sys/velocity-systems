// tools/lorem-ipsum.js — loaded by tools/lorem-ipsum.html.

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

mountLorem(document.getElementById('embed-slot'));
