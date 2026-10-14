// tools/uuid-generator.js — loaded by tools/uuid-generator.html.

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

mountUuid(document.getElementById('embed-slot'));
