// games/memory.js — loaded by games/memory.html. Shared helpers come from assets/js/play.js.

/* MEMORY FLIP */
function mountMemory(container){
  mountEmbed(container, 'PLAY / MEMORY FLIP', function(body){
    var EMOJIS = ['🎮','🎯','🎲','🎸','🎺','🎨','🚀','🌙','⭐','🔥','💎','🦄','🍕','🎉','🏆','🌈','🔮','🎁'];
    body.innerHTML =
      '<div class="mine-wrap">'+
        '<div class="tool-row"><select id="mem-size" class="cat-sort-select" style="width:auto"><option value="8">4×4 Easy</option><option value="12" selected>4×6 Medium</option><option value="18">6×6 Hard</option></select></div>'+
        '<div class="mine-hud"><span id="mem-flips">FLIPS 0</span><span id="mem-time">TIME 0s</span><span id="mem-best">BEST —</span></div>'+
        '<div id="mem-grid" style="display:grid;gap:6px"></div>'+
        '<button class="game-btn secondary" id="mem-new">New game</button>'+
      '</div>';
    var grid = body.querySelector('#mem-grid');
    var cfg = gameSettings('memory', {pairs:12});
    body.querySelector('#mem-size').value = String(cfg.pairs);
    body.querySelector('#mem-size').addEventListener('change', function(){ cfg.pairs=parseInt(this.value,10); cfg._save(); });
    var cards, flipped, matched, flips, locked, totalPairs, timerInt, elapsed;
    var bestKey = 'vs-memory-best';

    function start(){
      clearInterval(timerInt);
      var pairs = parseInt(body.querySelector('#mem-size').value,10);
      totalPairs = pairs;
      var best = lsGet(bestKey+'-'+pairs, null);
      body.querySelector('#mem-best').textContent = 'BEST '+(best===null?'—':best);
      var emojis = EMOJIS.slice(0,pairs);
      cards = emojis.concat(emojis).map(function(e){ return {emoji:e, open:false, matched:false}; });
      cards.sort(function(){ return Math.random()-0.5; });
      flipped=[]; matched=0; flips=0; locked=false; elapsed=0;
      var cols = pairs<=8?4 : pairs<=12?4 : 6;
      grid.style.gridTemplateColumns = 'repeat('+cols+',48px)';
      body.querySelector('#mem-flips').textContent='FLIPS 0';
      body.querySelector('#mem-time').textContent='TIME 0s';
      timerInt = setInterval(function(){ elapsed++; body.querySelector('#mem-time').textContent='TIME '+elapsed+'s'; }, 1000);
      render();
    }
    function render(){
      // Build the DOM once per game; every subsequent call just updates the
      // class/text of the cells that actually changed. Rebuilding all nodes
      // every flip (the old approach) made every already-matched card
      // replay its reveal animation on every single click.
      if(grid.children.length !== cards.length){
        grid.innerHTML='';
        cards.forEach(function(c,i){
          var el=document.createElement('div');
          el.className='mine-cell';
          el.style.width='48px'; el.style.height='48px'; el.style.fontSize='20px';
          el.addEventListener('click', function(){ flip(i); });
          grid.appendChild(el);
        });
      }
      cards.forEach(function(c,i){
        var el = grid.children[i];
        var shouldShow = c.open||c.matched;
        var isShowing = el.classList.contains('revealed');
        if(shouldShow && !isShowing){
          el.classList.add('revealed');
          el.textContent = c.emoji;
        } else if(!shouldShow && isShowing){
          el.classList.remove('revealed');
          el.textContent = '';
        }
      });
    }
    function flip(i){
      if(locked||cards[i].open||cards[i].matched) return;
      cards[i].open=true; flipped.push(i); flips++;
      body.querySelector('#mem-flips').textContent='FLIPS '+flips;
      render();
      if(flipped.length===2){
        locked=true;
        setTimeout(function(){
          var a=flipped[0], b=flipped[1];
          if(cards[a].emoji===cards[b].emoji){
            cards[a].matched=true; cards[b].matched=true; matched++;
            if(matched===totalPairs){
              clearInterval(timerInt);
              var best = lsGet(bestKey+'-'+totalPairs, null);
              if(best===null||flips<best){ lsSet(bestKey+'-'+totalPairs, flips); body.querySelector('#mem-best').textContent='BEST '+flips; }
              notify('Memory cleared in '+flips+' flips · '+elapsed+'s','ok');
            }
          } else { cards[a].open=false; cards[b].open=false; }
          flipped=[]; locked=false; render();
        }, 550);
      }
    }
    body.querySelector('#mem-size').addEventListener('change', start);
    body.querySelector('#mem-new').addEventListener('click', start);
    function keyHandler(e){ if(e.key==='r'||e.key==='R') start(); }
    document.addEventListener('keydown', keyHandler);
    start();
    onUnmount(grid, function(){ clearInterval(timerInt); document.removeEventListener('keydown', keyHandler); });
  });
}

mountMemory(document.getElementById('embed-slot'));
