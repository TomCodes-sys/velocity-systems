// tools/hash-generator.js — loaded by tools/hash-generator.html.
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

mountHashGenerator(document.getElementById('embed-slot'));
