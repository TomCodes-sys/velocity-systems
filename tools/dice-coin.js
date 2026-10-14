// tools/dice-coin.js — loaded by tools/dice-coin.html.

function mountDiceCoin(container){
  mountEmbed(container, 'TOOL / DICE & COIN', function(body){
    var SIDES = [4, 6, 8, 10, 12, 20, 100];
    body.innerHTML =
      '<div class="tool-row"><div class="field" style="width:120px"><label for="dc-sides">Dice type</label><select id="dc-sides">'+SIDES.map(function(s){ return '<option value="'+s+'"'+(s === 6 ? ' selected' : '')+'>d'+s+'</option>'; }).join('')+'</select></div>'+
        '<div class="field" style="width:110px"><label for="dc-count">How many</label><input id="dc-count" type="number" min="1" max="10" value="2"></div>'+
        '<button class="game-btn" id="dc-roll">Roll</button><button class="game-btn secondary" id="dc-flip">Flip a coin</button></div>'+
      '<div class="result-card" id="dc-out"><div class="result-sub">Roll some dice or flip a coin.</div></div>';
    var $ = function(s){ return body.querySelector(s); };
    var hist = toolHistory('dice-coin');
    function rnd(n){
      if(window.crypto && crypto.getRandomValues){
        var max = Math.floor(4294967296 / n) * n, b = new Uint32Array(1);
        do { crypto.getRandomValues(b); } while(b[0] >= max);
        return b[0] % n;
      }
      return Math.floor(Math.random() * n);
    }
    $('#dc-roll').addEventListener('click', function(){
      var sides = +$('#dc-sides').value, n = Math.max(1, Math.min(10, parseInt($('#dc-count').value, 10) || 1)), r = [], sum = 0;
      for(var i = 0; i < n; i++){ var v = rnd(sides) + 1; r.push(v); sum += v; }
      $('#dc-out').innerHTML = '<div class="dice-row">'+r.map(function(v){ return '<span class="die">'+v+'</span>'; }).join('')+'</div>'+
        '<div class="result-big">'+sum+'</div><div class="result-sub">'+n+'d'+sides+(n > 1 ? ' total' : '')+'</div>';
      hist.add({text:n+'d'+sides+' → '+r.join(', ')+(n > 1 ? ' = '+sum : '')});
    });
    $('#dc-flip').addEventListener('click', function(){
      var heads = rnd(2) === 0;
      $('#dc-out').innerHTML = '<div class="coin">'+(heads ? 'HEADS' : 'TAILS')+'</div><div class="result-sub">Coin flip</div>';
      hist.add({text:'Coin → '+(heads ? 'Heads' : 'Tails')});
    });
    hist.mount(body, {title:'Roll history', format:function(e){ return {main:e.text}; }});
  });
}

mountDiceCoin(document.getElementById('embed-slot'));
