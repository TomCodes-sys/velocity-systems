// games.js — every game on the site, in one file.
// Loaded by each games/<id>.html after app.js and play.js. The block at the bottom
// runs only the game whose id matches <body data-id>.
// To add a game: add its section here, register it in PLAYABLES, and list it in data.js.
// Contents (each section below is one game):
//   2048
//   flappy
//   hangman
//   memory
//   minesweeper
//   minesweeper-coop
//   simon
//   sliding-puzzle
//   snake
//   tetris
//   wordle

var PLAYABLES = {};

/* ==================================================================
   games / 2048
   ================================================================== */
/* 2048 — real tile-identity sliding animation (matches how the original
   site did it): each tile is an object with a stable id, so it can be
   translated smoothly to its new cell instead of the grid just repainting. */
function mount2048(container){
  mountEmbed(container, 'PLAY / 2048', function(body){
    var cfg = gameSettings('2048', {target:2048, size:4});
    body.innerHTML =
      '<div class="g48-wrap">'+
        '<div class="snake-hud"><span id="g48-score">SCORE 0</span><span id="g48-best">BEST 0</span><span id="g48-moves">MOVES 0</span></div>'+
        '<div class="g48-board" id="g48-board" style="position:relative">'+
          '<div class="g48-bg" id="g48-bg" style="display:grid;gap:8px"></div>'+
          '<div id="g48-tiles" style="position:absolute;inset:8px"></div>'+
        '</div>'+
        '<div class="tool-row" style="justify-content:center">'+
          '<button class="game-btn" id="g48-new">New game (R)</button>'+
          '<button class="game-btn secondary" id="g48-undo">Undo</button>'+
          '<label>Target <select id="g48-target" class="cat-sort-select" style="width:auto">'+
            [512,1024,2048,4096,8192].map(function(t){ return '<option value="'+t+'"'+(cfg.target===t?' selected':'')+'>'+t+'</option>'; }).join('')+
          '</select></label>'+
          '<label>Grid <select id="g48-size" class="cat-sort-select" style="width:auto">'+
            [3,4,5,6].map(function(s){ return '<option value="'+s+'"'+(cfg.size===s?' selected':'')+'>'+s+'×'+s+'</option>'; }).join('')+
          '</select></label>'+
        '</div>'+
        '<div class="tool-msg" id="g48-msg"></div>'+
        '<span class="tool-msg">Arrow keys / WASD to move · swipe on touch · R new game</span>'+
      '</div>';
    var SLIDE_MS = 110;
    var boardEl = body.querySelector('#g48-board'), tilesLayer = body.querySelector('#g48-tiles'), bgEl = body.querySelector('#g48-bg');
    var SIZE, GAP=8, CELL, tiles, nextId, score, moves, won, animating=false, history=[];
    var best = lsGet('vs-2048-best', 0);
    body.querySelector('#g48-best').textContent = 'BEST '+best;

    function buildGrid(){
      var g = Array.from({length:SIZE}, function(){ return Array(SIZE).fill(null); });
      tiles.forEach(function(t){ g[t.r][t.c] = t; });
      return g;
    }
    function spawnTile(){
      var g = buildGrid(), empty=[];
      for(var r=0;r<SIZE;r++) for(var c=0;c<SIZE;c++) if(!g[r][c]) empty.push([r,c]);
      if(!empty.length) return null;
      var p = empty[Math.floor(Math.random()*empty.length)];
      var t = {id:nextId++, r:p[0], c:p[1], value:Math.random()<0.9?2:4, isNew:true};
      tiles.push(t);
      return t;
    }
    function boardPxSize(){ return boardEl.clientWidth - 16; }
    function cellRect(r,c){
      CELL = (boardPxSize() - (SIZE-1)*GAP) / SIZE;
      return { left: c*(CELL+GAP)+'px', top: r*(CELL+GAP)+'px', size: CELL+'px' };
    }
    function reset(){
      SIZE = parseInt(body.querySelector('#g48-size').value,10);
      cfg.size = SIZE; cfg.target = parseInt(body.querySelector('#g48-target').value,10); cfg._save();
      tiles=[]; nextId=1; score=0; moves=0; won=false; animating=false; history=[];
      bgEl.style.gridTemplateColumns = 'repeat('+SIZE+',1fr)';
      bgEl.innerHTML = Array.from({length:SIZE*SIZE}).map(function(){ return '<div style="aspect-ratio:1;background:var(--surface-1);border-radius:4px"></div>'; }).join('');
      spawnTile(); spawnTile();
      renderTiles();
      body.querySelector('#g48-msg').textContent='';
      body.querySelector('#g48-score').textContent='SCORE 0';
      body.querySelector('#g48-moves').textContent='MOVES 0';
    }
    function renderTiles(){
      tilesLayer.innerHTML='';
      tiles.forEach(function(t){
        var el=document.createElement('div');
        el.className='g48-cell v'+Math.min(t.value,2048)+(t.isNew?' vnew':'')+(t.justMerged?' vmerge':'');
        el.textContent=t.value;
        el.dataset.id=t.id;
        el.style.position='absolute';
        var rect=cellRect(t.r,t.c);
        el.style.left=rect.left; el.style.top=rect.top; el.style.width=rect.size; el.style.height=rect.size;
        tilesLayer.appendChild(el);
        t.isNew=false; t.justMerged=false;
      });
    }
    function slideLine(refs){
      var arr = refs.filter(Boolean), result=[], removed=[], gained=0;
      for(var i=0;i<arr.length;i++){
        if(i+1<arr.length && arr[i].value===arr[i+1].value){
          arr[i].mergedValue = arr[i].value*2;
          arr[i+1].mergeInto = arr[i];
          removed.push(arr[i+1]);
          gained += arr[i].value*2;
          result.push(arr[i]);
          i++;
        } else result.push(arr[i]);
      }
      return {result:result, removed:removed, gained:gained};
    }
    function move(dir){
      if(animating) return;
      var g = buildGrid();
      var lines = [];
      if(dir==='left'||dir==='right'){
        for(var r=0;r<SIZE;r++){
          var cs = dir==='left' ? Array.from({length:SIZE},function(_,i){return i;}) : Array.from({length:SIZE},function(_,i){return SIZE-1-i;});
          lines.push(cs.map(function(c){ return {r:r,c:c}; }));
        }
      } else {
        for(var c=0;c<SIZE;c++){
          var rs = dir==='up' ? Array.from({length:SIZE},function(_,i){return i;}) : Array.from({length:SIZE},function(_,i){return SIZE-1-i;});
          lines.push(rs.map(function(r){ return {r:r,c:c}; }));
        }
      }
      var changed=false, gained=0, removedAll=[];
      lines.forEach(function(coords){
        var refs = coords.map(function(p){ return g[p.r][p.c]; });
        var res = slideLine(refs);
        gained += res.gained;
        removedAll = removedAll.concat(res.removed);
        res.result.forEach(function(t,idx){
          var p = coords[idx];
          if(t.r!==p.r || t.c!==p.c) changed=true;
          t.targetR=p.r; t.targetC=p.c;
        });
        res.removed.forEach(function(t){ t.targetR=t.mergeInto.targetR; t.targetC=t.mergeInto.targetC; });
      });
      if(removedAll.length) changed=true;
      if(!changed) return;

      history.push({tiles: tiles.map(function(t){return Object.assign({},t);}), nextId:nextId, score:score, moves:moves});
      if(history.length>20) history.shift();

      animating=true;
      moves++; if(gained>0) score+=gained;
      if(score>best){ best=score; lsSet('vs-2048-best',best); body.querySelector('#g48-best').textContent='BEST '+best; }
      body.querySelector('#g48-score').textContent='SCORE '+score;
      body.querySelector('#g48-moves').textContent='MOVES '+moves;

      // Phase 1: slide every tile — including soon-to-be-merged ones — to its target cell
      tiles.forEach(function(t){
        var el = tilesLayer.querySelector('[data-id="'+t.id+'"]');
        if(!el) return;
        var rect = cellRect(t.targetR, t.targetC);
        el.style.transition = 'left '+SLIDE_MS+'ms ease-in-out, top '+SLIDE_MS+'ms ease-in-out';
        el.style.left = rect.left; el.style.top = rect.top;
      });

      setTimeout(function(){
        removedAll.forEach(function(t){ tiles = tiles.filter(function(x){return x.id!==t.id;}); });
        tiles.forEach(function(t){
          t.r=t.targetR; t.c=t.targetC;
          if(t.mergedValue){ t.value=t.mergedValue; t.mergedValue=null; t.justMerged=true; }
          delete t.mergeInto;
        });
        spawnTile();
        renderTiles();
        animating=false;
        var target = parseInt(body.querySelector('#g48-target').value,10);
        if(!won && tiles.some(function(t){return t.value>=target;})){
          won=true; body.querySelector('#g48-msg').textContent='You reached '+target+'!';
          notify('2048 — you reached '+target+'!','ok');
        }
        if(!canMove()){ body.querySelector('#g48-msg').textContent='No moves left — game over.'; notify('2048 — no moves left','warn'); }
      }, SLIDE_MS);
    }
    function canMove(){
      var g = buildGrid();
      for(var r=0;r<SIZE;r++) for(var c=0;c<SIZE;c++){
        if(!g[r][c]) return true;
        if(c<SIZE-1 && g[r][c+1] && g[r][c].value===g[r][c+1].value) return true;
        if(r<SIZE-1 && g[r+1][c] && g[r][c].value===g[r+1][c].value) return true;
      }
      return false;
    }
    function undo(){
      if(!history.length){ notify('Nothing to undo','warn'); return; }
      var prev = history.pop();
      tiles = prev.tiles; nextId = prev.nextId; score = prev.score; moves = prev.moves;
      body.querySelector('#g48-msg').textContent='';
      body.querySelector('#g48-score').textContent='SCORE '+score;
      body.querySelector('#g48-moves').textContent='MOVES '+moves;
      renderTiles();
    }
    function keyHandler(e){
      var map={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down',a:'left',d:'right',w:'up',s:'down'};
      if(map[e.key]){ e.preventDefault(); move(map[e.key]); }
      else if(e.key==='r'||e.key==='R'){ reset(); }
    }
    document.addEventListener('keydown', keyHandler);
    /* Swipe: fires as soon as the finger has travelled ~24px (no need to lift it), and the board never scrolls the page. */
    var tx=0, ty=0, fired=false;
    boardEl.style.touchAction = 'none';
    boardEl.addEventListener('touchstart', function(e){ tx=e.touches[0].clientX; ty=e.touches[0].clientY; fired=false; }, {passive:true});
    boardEl.addEventListener('touchmove', function(e){
      e.preventDefault();
      if(fired) return;
      var dx=e.touches[0].clientX-tx, dy=e.touches[0].clientY-ty;
      if(Math.max(Math.abs(dx),Math.abs(dy))<24) return;
      fired=true;
      if(Math.abs(dx)>Math.abs(dy)) move(dx>0?'right':'left'); else move(dy>0?'down':'up');
    }, {passive:false});
    window.addEventListener('resize', renderTiles);
    body.querySelector('#g48-new').addEventListener('click', reset);
    body.querySelector('#g48-undo').addEventListener('click', undo);
    body.querySelector('#g48-size').addEventListener('change', reset);
    body.querySelector('#g48-target').addEventListener('change', function(){ cfg.target=parseInt(this.value,10); cfg._save(); });
    boardEl.style.width = '100%'; boardEl.style.maxWidth='420px';
    reset();
    onUnmount(boardEl, function(){ document.removeEventListener('keydown', keyHandler); window.removeEventListener('resize', renderTiles); });
  });
}
PLAYABLES['2048'] = mount2048;

/* ==================================================================
   games / flappy
   ================================================================== */
/* FLAPPY */
function mountFlappy(container){
  mountEmbed(container, 'PLAY / FLAPPY', function(body){
    body.innerHTML =
      '<div class="snake-wrap">'+
        '<div class="snake-hud"><span id="fl-score">SCORE 0</span><span id="fl-best">BEST 0</span></div>'+
        '<canvas id="fl-canvas" width="320" height="440"></canvas>'+
        '<div class="tool-row"><span class="tool-msg">Click / tap / Space to flap</span><button class="game-btn secondary" id="fl-clear">Clear best</button></div>'+
      '</div>';
    var canvas = body.querySelector('#fl-canvas'), ctx = canvas.getContext('2d');
    var W=320,H=440, BIRD_X=60,BIRD_R=14,GRAVITY=0.38,FLAP=-7,PIPE_W=52,GAP=130,SPEED=2.2;
    var best=lsGet('vs-flappy-best',0);
    body.querySelector('#fl-best').textContent='BEST '+best;
    var bird, pipes, score, state='idle', frame=0, raf;

    function reset(){ bird={y:H/2,vy:0,angle:0}; pipes=[]; score=0; frame=0; body.querySelector('#fl-score').textContent='SCORE 0'; }
    function flap(){
      if(state==='idle'||state==='dead'){ reset(); state='playing'; raf=requestAnimationFrame(loop); }
      else if(state==='playing'){ bird.vy=FLAP; }
    }
    function addPipe(){ var top=60+Math.random()*(H-GAP-140); pipes.push({x:W, topH:top, botY:top+GAP, scored:false}); }
    function loop(){
      if(state!=='playing') return;
      frame++;
      if(frame%75===0) addPipe();
      bird.vy+=GRAVITY; bird.y+=bird.vy;
      bird.angle = Math.min(Math.PI/3, Math.max(-Math.PI/4, bird.vy*0.06));
      pipes.forEach(function(p){
        p.x-=SPEED;
        if(!p.scored && p.x+PIPE_W<BIRD_X-BIRD_R){ p.scored=true; score++; body.querySelector('#fl-score').textContent='SCORE '+score; }
      });
      pipes = pipes.filter(function(p){return p.x>-PIPE_W;});
      if(bird.y+BIRD_R>H-24 || bird.y-BIRD_R<0){ die(); return; }
      for(var i=0;i<pipes.length;i++){
        var p=pipes[i];
        if(BIRD_X+BIRD_R>p.x && BIRD_X-BIRD_R<p.x+PIPE_W){
          if(bird.y-BIRD_R<p.topH || bird.y+BIRD_R>p.botY){ die(); return; }
        }
      }
      draw(); raf=requestAnimationFrame(loop);
    }
    function die(){
      state='dead';
      if(score>best){ best=score; lsSet('vs-flappy-best',best); body.querySelector('#fl-best').textContent='BEST '+best; }
      draw();
    }
    function draw(){
      var accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()||'#3b82f6';
      var sky = ctx.createLinearGradient(0,0,0,H);
      sky.addColorStop(0,'#07060f'); sky.addColorStop(1,'#141228');
      ctx.fillStyle=sky; ctx.fillRect(0,0,W,H);
      ctx.fillStyle='rgba(167,139,250,.4)';
      for(var i=0;i<30;i++){ var sx=(i*73+frame*0.2)%W, sy=(i*37)%(H*0.6); ctx.fillRect(sx,sy,1,1); }
      ctx.fillStyle='#1c1935'; ctx.fillRect(0,H-24,W,24);
      pipes.forEach(function(p){
        ctx.fillStyle=accent; ctx.globalAlpha=.85;
        ctx.fillRect(p.x,0,PIPE_W,p.topH);
        ctx.fillRect(p.x,p.botY,PIPE_W,H-24-p.botY);
        ctx.globalAlpha=1;
        ctx.fillStyle='rgba(255,255,255,.15)';
        ctx.fillRect(p.x-4,p.topH-16,PIPE_W+8,16);
        ctx.fillRect(p.x-4,p.botY,PIPE_W+8,16);
      });
      ctx.save(); ctx.translate(BIRD_X,bird.y); ctx.rotate(bird.angle);
      ctx.fillStyle = state==='dead' ? '#ff535e' : '#fbbf24';
      ctx.beginPath(); ctx.ellipse(0,0,BIRD_R,BIRD_R-2,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(6,-4,5,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#1f2937'; ctx.beginPath(); ctx.arc(8,-4,3,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#f97316'; ctx.beginPath(); ctx.moveTo(12,-1); ctx.lineTo(20,0); ctx.lineTo(12,3); ctx.fill();
      ctx.fillStyle='#f59e0b'; ctx.beginPath(); ctx.ellipse(-2,4,8,5,Math.PI/6,0,Math.PI*2); ctx.fill();
      ctx.restore();
      ctx.fillStyle='#fff'; ctx.font='bold 26px sans-serif'; ctx.textAlign='center';
      ctx.fillText(score, W/2, 46);
      if(state==='idle'){ ctx.font='16px sans-serif'; ctx.fillStyle='#a78bfa'; ctx.fillText('Tap, click or Space to start', W/2, H/2); }
      if(state==='dead'){ ctx.font='bold 18px sans-serif'; ctx.fillStyle='#ff8f97'; ctx.fillText('GAME OVER — tap to retry', W/2, H/2); }
    }
    canvas.addEventListener('click', flap);
    canvas.addEventListener('touchstart', function(e){ e.preventDefault(); flap(); }, {passive:false});
    function keyHandler(e){
      if(e.key===' '||e.key==='ArrowUp'){ e.preventDefault(); flap(); }
      else if((e.key==='r'||e.key==='R') && state!=='playing'){ reset(); draw(); }
    }
    document.addEventListener('keydown', keyHandler);
    body.querySelector('#fl-clear').addEventListener('click', function(){ best=0; lsSet('vs-flappy-best',0); body.querySelector('#fl-best').textContent='BEST 0'; });
    reset(); draw();
    onUnmount(canvas, function(){ document.removeEventListener('keydown', keyHandler); cancelAnimationFrame(raf); });
  });
}
PLAYABLES['flappy'] = mountFlappy;

/* ==================================================================
   games / hangman
   ================================================================== */
/* HANGMAN */
function mountHangman(container){
  mountEmbed(container, 'PLAY / HANGMAN', function(body){
    var WORDS = {
      animals:[['ELEPHANT','Largest land animal'],['PENGUIN','Flightless Antarctic bird'],['DOLPHIN','Intelligent marine mammal'],['GIRAFFE','Tallest land animal'],['CHEETAH','Fastest land animal'],['OCTOPUS','Eight-armed sea creature']],
      tech:[['ALGORITHM','Step-by-step problem solving'],['DATABASE','Organised data store'],['ENCRYPTION','Encoding data for security'],['JAVASCRIPT','The language of the web'],['PROTOCOL','Set of network rules']],
      countries:[['AUSTRALIA','Home of kangaroos'],['BRAZIL','Largest South American country'],['FINLAND','Land of a thousand lakes'],['MONGOLIA','Land of Genghis Khan']],
      food:[['AVOCADO','Trendy toast topping'],['CROISSANT','French buttery pastry'],['HUMMUS','Chickpea dip'],['LASAGNA','Layered Italian pasta bake']],
    };
    WORDS.mixed = [].concat(WORDS.animals, WORDS.tech, WORDS.countries, WORDS.food);
    var stats = lsGet('vs-hangman-stats', {wins:0, losses:0});
    body.innerHTML =
      '<div class="mine-wrap">'+
        '<div class="tool-row">'+
          '<select id="hm-cat" class="cat-sort-select" style="width:auto"><option value="mixed">Mixed</option><option value="animals">Animals</option><option value="tech">Technology</option><option value="countries">Countries</option><option value="food">Food</option><option value="custom">Custom word</option></select>'+
          '<select id="hm-max" class="cat-sort-select" style="width:auto"><option value="4">4 chances</option><option value="6" selected>6 chances</option><option value="8">8 chances</option></select>'+
          '<input type="text" id="hm-custom" placeholder="Custom word" style="display:none;background:var(--surface-2);border:1px solid var(--line);color:var(--text);padding:6px 8px;border-radius:var(--rad)">'+
        '</div>'+
        '<div class="tool-row"><label style="font:11px monospace"><input type="checkbox" id="hm-show-hint" checked> Hints</label><label style="font:11px monospace"><input type="checkbox" id="hm-show-cat"> Category</label></div>'+
        '<canvas id="hm-canvas" width="140" height="140"></canvas>'+
        '<div id="hm-hint" class="tool-msg" style="min-height:16px"></div>'+
        '<div id="hm-word" style="display:flex;gap:8px;font:20px var(--font-mono);letter-spacing:2px"></div>'+
        '<div id="hm-wrong" class="tool-msg">Wrong: 0/6</div>'+
        '<div id="hm-keyboard" class="hm-keyboard"></div>'+
        '<div id="hm-result" class="tool-msg"></div>'+
        '<div class="snake-hud"><span id="hm-wins">WINS '+stats.wins+'</span><span id="hm-losses">LOSSES '+stats.losses+'</span></div>'+
        '<button class="game-btn secondary" id="hm-new">New word</button>'+
      '</div>';
    var canvas = body.querySelector('#hm-canvas'), ctx = canvas.getContext('2d');
    var word, hintText, guessed, wrong, maxWrong=6;

    function drawGallows(w){
      ctx.clearRect(0,0,140,140);
      var accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()||'#3b82f6';
      ctx.strokeStyle=accent; ctx.lineWidth=2; ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(15,130); ctx.lineTo(120,130); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(40,130); ctx.lineTo(40,15); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(40,15); ctx.lineTo(90,15); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(90,15); ctx.lineTo(90,32); ctx.stroke();
      var parts = [
        function(){ ctx.strokeStyle='#ff535e'; ctx.beginPath(); ctx.arc(90,42,10,0,Math.PI*2); ctx.stroke(); },
        function(){ ctx.strokeStyle='#ff535e'; ctx.beginPath(); ctx.moveTo(90,52); ctx.lineTo(90,80); ctx.stroke(); },
        function(){ ctx.strokeStyle='#ff535e'; ctx.beginPath(); ctx.moveTo(90,60); ctx.lineTo(75,72); ctx.stroke(); },
        function(){ ctx.strokeStyle='#ff535e'; ctx.beginPath(); ctx.moveTo(90,60); ctx.lineTo(105,72); ctx.stroke(); },
        function(){ ctx.strokeStyle='#ff535e'; ctx.beginPath(); ctx.moveTo(90,80); ctx.lineTo(75,98); ctx.stroke(); },
        function(){ ctx.strokeStyle='#ff535e'; ctx.beginPath(); ctx.moveTo(90,80); ctx.lineTo(105,98); ctx.stroke(); },
      ];
      for(var i=0;i<w;i++){ var idx=Math.floor(i/maxWrong*parts.length); if(parts[idx]) parts[idx](); }
    }
    function start(){
      maxWrong = parseInt(body.querySelector('#hm-max').value,10);
      var cat = body.querySelector('#hm-cat').value;
      var entry;
      if(cat==='custom'){
        var cw = body.querySelector('#hm-custom').value.trim().toUpperCase().replace(/[^A-Z]/g,'');
        entry = [cw||'VELOCITY','Custom word'];
      } else {
        var pool = WORDS[cat]||WORDS.mixed;
        entry = pool[Math.floor(Math.random()*pool.length)];
      }
      word = entry[0]; hintText = entry[1];
      guessed = new Set(); wrong=0;
      var parts=[];
      if(body.querySelector('#hm-show-cat').checked) parts.push('Category: '+cat);
      parts.push(word.length+' letters');
      if(body.querySelector('#hm-show-hint').checked) parts.push('Hint: '+hintText);
      body.querySelector('#hm-hint').textContent = parts.join(' · ');
      body.querySelector('#hm-result').textContent='';
      body.querySelector('#hm-wrong').textContent='Wrong: 0/'+maxWrong;
      drawGallows(0); renderWord(); renderKeyboard();
    }
    function renderWord(){
      body.querySelector('#hm-word').innerHTML = word.split('').map(function(ch){
        return '<span style="border-bottom:2px solid var(--line);width:20px;text-align:center">'+(guessed.has(ch)?ch:'')+'</span>';
      }).join('');
    }
    function renderKeyboard(){
      body.querySelector('#hm-keyboard').innerHTML = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(function(ch){
        var g = guessed.has(ch);
        var cls = g ? (word.indexOf(ch)>-1 ? 'game-btn' : 'game-btn secondary') : 'game-btn secondary';
        return '<button class="hm-key '+cls+'" data-letter="'+ch+'" '+(g?'disabled':'')+'>'+ch+'</button>';
      }).join('');
      qsa2(body,'[data-letter]').forEach(function(b){ b.addEventListener('click', function(){ guess(b.getAttribute('data-letter')); }); });
    }
    function saveStats(){ lsSet('vs-hangman-stats', stats); }
    function guess(ch){
      if(guessed.has(ch)) return;
      guessed.add(ch);
      if(word.indexOf(ch)===-1){ wrong++; drawGallows(wrong); body.querySelector('#hm-wrong').textContent='Wrong: '+wrong+'/'+maxWrong; }
      renderWord(); renderKeyboard();
      if(word.split('').every(function(c){return guessed.has(c);})){
        stats.wins++; saveStats(); body.querySelector('#hm-wins').textContent='WINS '+stats.wins;
        body.querySelector('#hm-result').textContent='You win!';
        notify('Hangman — you got it!','ok');
      } else if(wrong>=maxWrong){
        stats.losses++; saveStats(); body.querySelector('#hm-losses').textContent='LOSSES '+stats.losses;
        body.querySelector('#hm-result').textContent='Game over — word was '+word;
        word.split('').forEach(function(c){guessed.add(c);}); renderWord(); renderKeyboard();
      }
    }
    body.querySelector('#hm-cat').addEventListener('change', function(){
      body.querySelector('#hm-custom').style.display = this.value==='custom' ? 'block' : 'none';
    });
    function keyHandler(e){
      // Note: plain letter keys are reserved for guessing (including R), so
      // restart stays on the button only here — no keyboard shortcut clash.
      if(/^[a-zA-Z]$/.test(e.key) && document.activeElement.tagName!=='INPUT') guess(e.key.toUpperCase());
    }
    document.addEventListener('keydown', keyHandler);
    body.querySelector('#hm-new').addEventListener('click', start);
    start();
    onUnmount(canvas, function(){ document.removeEventListener('keydown', keyHandler); });
  });
}
PLAYABLES['hangman'] = mountHangman;

/* ==================================================================
   games / memory
   ================================================================== */
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
PLAYABLES['memory'] = mountMemory;

/* ==================================================================
   games / minesweeper
   ================================================================== */
/* MINESWEEPER — presets + custom size, flag mode, long-press, timer,
   cascade animation, coloured numbers, result banner, best times */
function mountMinesweeper(container){
  mountEmbed(container, 'PLAY / MINESWEEPER', function(body){
    var DIFFS = {
      easy:   {rows:9,  cols:9,  mines:10},
      medium: {rows:16, cols:16, mines:40},
      hard:   {rows:16, cols:30, mines:99},
      custom: {rows:12, cols:12, mines:24},
    };
    var cfg = gameSettings('minesweeper', {diff:'easy', cols:12, rows:12, mines:24, timeLimit:0, flagLimit:0});
    DIFFS.custom = {rows:cfg.rows, cols:cfg.cols, mines:cfg.mines};

    body.innerHTML =
      '<div class="mine-wrap">'+
        '<div class="tool-row" style="justify-content:center">'+
          ['easy','medium','hard','custom'].map(function(d){
            var lbl = d==='easy'?'Easy 9×9':d==='medium'?'Medium 16×16':d==='hard'?'Hard 30×16':'Custom';
            return '<button class="game-btn'+(cfg.diff===d?'':' secondary')+'" data-diff="'+d+'">'+lbl+'</button>';
          }).join('')+
          '<button class="game-btn secondary" id="mine-flagmode">🚩 Flag mode</button>'+
        '</div>'+
        '<div class="opt-panel" id="mine-custom" style="display:none">'+
          '<div class="opt-panel-title">Custom board</div>'+
          '<div class="opt-grid">'+
            '<label>Columns <input type="number" id="mc-cols" min="5" max="40" value="'+cfg.cols+'" style="width:70px"></label>'+
            '<label>Rows <input type="number" id="mc-rows" min="5" max="30" value="'+cfg.rows+'" style="width:70px"></label>'+
            '<label>Mines <input type="number" id="mc-mines" min="1" max="400" value="'+cfg.mines+'" style="width:70px"></label>'+
            '<label>Time limit s (0=off) <input type="number" id="mc-time" min="0" max="3600" value="'+cfg.timeLimit+'" style="width:70px"></label>'+
            '<label>Flag limit (0=off) <input type="number" id="mc-flags" min="0" max="400" value="'+cfg.flagLimit+'" style="width:70px"></label>'+
          '</div>'+
          '<div class="tool-row" style="margin-top:12px"><button class="game-btn" id="mc-apply">Apply</button></div>'+
        '</div>'+
        '<div class="mine-hud">'+
          '<span id="mine-count">MINES 10</span>'+
          '<span id="mine-flagsleft" style="display:none">FLAGS —</span>'+
          '<span id="mine-timer">TIME 0s</span>'+
          '<span id="mine-best">BEST —</span>'+
        '</div>'+
        '<div class="mine-grid" id="mine-grid"></div>'+
        '<div class="tool-row" style="justify-content:center"><button class="game-btn secondary" id="mine-new">New game (R)</button></div>'+
        '<div class="result-banner" id="mine-banner">'+
          '<span id="mine-banner-icon" style="font-size:22px"></span>'+
          '<div><div id="mine-banner-title"></div><div class="tool-msg" id="mine-banner-sub"></div></div>'+
        '</div>'+
        '<span class="tool-msg">Click to reveal · right-click or long-press to flag · R new game · F flag mode</span>'+
      '</div>';

    var grid = body.querySelector('#mine-grid');
    var rows, cols, mineCount, timeLimit, flagLimit;
    var board, revealed, flagged, gameOver, firstClick, flagMode=false, flagsUsed=0;
    var timerInt=null, seconds=0, hitR=null, hitC=null;

    function neighbors(r,c){
      var out=[];
      for(var dr=-1;dr<=1;dr++) for(var dc=-1;dc<=1;dc++){
        if(dr===0&&dc===0) continue;
        var nr=r+dr, nc=c+dc;
        if(nr>=0&&nc>=0&&nr<rows&&nc<cols) out.push([nr,nc]);
      }
      return out;
    }
    function bestKey(){ return 'vs-mine-best-'+cfg.diff+'-'+cols+'x'+rows+'-'+mineCount; }
    function showBest(){
      var b = lsGet(bestKey(), null);
      body.querySelector('#mine-best').textContent = 'BEST '+(b===null?'—':b+'s');
    }
    function placeMines(safeR,safeC){
      var candidates=[];
      for(var r=0;r<rows;r++) for(var c=0;c<cols;c++)
        if(Math.abs(r-safeR)>1||Math.abs(c-safeC)>1) candidates.push([r,c]);
      if(candidates.length < mineCount){
        candidates=[];
        for(r=0;r<rows;r++) for(c=0;c<cols;c++) if(r!==safeR||c!==safeC) candidates.push([r,c]);
      }
      for(var i=candidates.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)); var t=candidates[i]; candidates[i]=candidates[j]; candidates[j]=t; }
      for(i=0;i<mineCount;i++) board[candidates[i][0]][candidates[i][1]] = -1;
      for(r=0;r<rows;r++) for(c=0;c<cols;c++) if(board[r][c]!==-1)
        board[r][c] = neighbors(r,c).filter(function(n){return board[n[0]][n[1]]===-1;}).length;
    }
    function build(){
      var d = DIFFS[cfg.diff];
      rows=d.rows; cols=d.cols; mineCount=d.mines;
      timeLimit = cfg.diff==='custom' ? cfg.timeLimit : 0;
      flagLimit = cfg.diff==='custom' ? cfg.flagLimit : 0;
      board = Array.from({length:rows}, function(){ return Array(cols).fill(0); });
      revealed = Array.from({length:rows}, function(){ return Array(cols).fill(false); });
      flagged  = Array.from({length:rows}, function(){ return Array(cols).fill(false); });
      gameOver=false; firstClick=true; seconds=0; flagsUsed=0; hitR=null; hitC=null;
      clearInterval(timerInt);
      grid.classList.remove('shake','win-glow');
      body.querySelector('#mine-count').textContent = 'MINES '+mineCount;
      body.querySelector('#mine-timer').textContent = timeLimit>0 ? 'TIME '+timeLimit+'s' : 'TIME 0s';
      body.querySelector('#mine-banner').className = 'result-banner';
      var fl = body.querySelector('#mine-flagsleft');
      if(flagLimit>0){ fl.style.display=''; fl.textContent='FLAGS '+flagLimit; } else fl.style.display='none';
      showBest();
      renderAll();
    }
    function startTimer(){
      if(timeLimit>0){
        var remaining = timeLimit;
        timerInt = setInterval(function(){
          remaining--;
          body.querySelector('#mine-timer').textContent='TIME '+remaining+'s';
          if(remaining<=0){ clearInterval(timerInt); endGame(false,'TIME'); }
        },1000);
      } else {
        timerInt = setInterval(function(){ seconds++; body.querySelector('#mine-timer').textContent='TIME '+seconds+'s'; },1000);
      }
    }
    function cellEl(r,c){ return grid.children[r*cols+c]; }
    function paintCell(r,c,delay){
      var el = cellEl(r,c); if(!el) return;
      var isMine = board[r][c]===-1;
      var cls = 'mine-cell';
      if(revealed[r][c]){
        cls += ' revealed';
        if(isMine) cls += ' mine';
        else if(board[r][c]>0) cls += ' n'+board[r][c];
      } else if(flagged[r][c]) cls += ' flag';
      el.className = cls;
      el.style.animationDelay = (delay||0)+'ms';
      if(revealed[r][c]) el.textContent = isMine ? '✳' : (board[r][c]>0 ? board[r][c] : '');
      else el.textContent = flagged[r][c] ? '⚑' : '';
    }
    function reveal(r,c,ox,oy){
      if(gameOver||revealed[r][c]||flagged[r][c]) return;
      if(firstClick){ firstClick=false; placeMines(r,c); startTimer(); }
      if(ox===undefined){ ox=r; oy=c; }
      revealed[r][c]=true;
      var dist = Math.hypot(r-ox, c-oy);
      paintCell(r,c, Math.min(dist*28, 240));
      if(board[r][c]===-1){ hitR=r; hitC=c; endGame(false); return; }
      if(board[r][c]===0) neighbors(r,c).forEach(function(n){ reveal(n[0],n[1],ox,oy); });
      checkWin();
    }
    function toggleFlag(r,c){
      if(gameOver||revealed[r][c]) return;
      if(!flagged[r][c] && flagLimit>0 && flagsUsed>=flagLimit){ notify('Flag limit reached ('+flagLimit+')','warn'); return; }
      flagged[r][c]=!flagged[r][c];
      flagsUsed += flagged[r][c] ? 1 : -1;
      // force the pop animation to replay
      var el = cellEl(r,c); el.classList.remove('flag'); void el.offsetWidth;
      paintCell(r,c,0);
      var count=0; for(var rr=0;rr<rows;rr++) for(var cc=0;cc<cols;cc++) if(flagged[rr][cc]) count++;
      body.querySelector('#mine-count').textContent='MINES '+(mineCount-count);
      if(flagLimit>0) body.querySelector('#mine-flagsleft').textContent='FLAGS '+Math.max(0,flagLimit-flagsUsed);
    }
    function checkWin(){
      var left=0;
      for(var r=0;r<rows;r++) for(var c=0;c<cols;c++) if(!revealed[r][c] && board[r][c]!==-1) left++;
      if(left===0) endGame(true);
    }
    function endGame(won, reason){
      gameOver=true; clearInterval(timerInt);
      if(!won){
        grid.classList.remove('shake'); void grid.offsetWidth; grid.classList.add('shake');
        var ox = hitR===null?0:hitR, oy = hitC===null?0:hitC;
        for(var r=0;r<rows;r++) for(var c=0;c<cols;c++)
          if(board[r][c]===-1 && !flagged[r][c] && !revealed[r][c]){
            revealed[r][c]=true;
            paintCell(r,c, Math.min(Math.hypot(r-ox,c-oy)*32, 300));
          }
      } else {
        grid.classList.remove('win-glow'); void grid.offsetWidth; grid.classList.add('win-glow');
        var prev = lsGet(bestKey(), null);
        if(timeLimit===0 && (prev===null || seconds<prev)){ lsSet(bestKey(), seconds); showBest(); }
      }
      var banner = body.querySelector('#mine-banner');
      banner.className = 'result-banner show '+(won?'win':'lose');
      body.querySelector('#mine-banner-icon').textContent = won?'🏆':'💥';
      body.querySelector('#mine-banner-title').textContent = won?'Board cleared!':'Mine detonated';
      body.querySelector('#mine-banner-sub').textContent = won
        ? 'Completed in '+seconds+'s — '+mineCount+' mines avoided.'
        : reason==='TIME' ? 'Time ran out.' : 'Survived '+seconds+'s — try again.';
      notify(won?'Minesweeper cleared in '+seconds+'s':'Minesweeper — you hit a mine', won?'ok':'warn');
    }
    /* Cell size: as big as fits the screen (44px max on touch devices, never below 32px there); wider boards scroll sideways. */
    function fitCells(){
      var avail = ((grid.parentNode && grid.parentNode.clientWidth) || body.clientWidth || 360) - 14;
      var fit = Math.floor((avail - (cols - 1) * 2) / cols);
      var coarse = window.matchMedia && matchMedia('(pointer:coarse)').matches;
      var size = coarse ? Math.max(34, Math.min(44, fit)) : Math.max(28, Math.min(36, fit));
      grid.style.setProperty('--ms-cell', size + 'px');
    }
    window.addEventListener('resize', fitCells);
    onUnmount(grid, function(){ window.removeEventListener('resize', fitCells); });
    function renderAll(){
      fitCells();
      grid.style.gridTemplateColumns='repeat('+cols+',var(--ms-cell,30px))';
      grid.innerHTML='';
      for(var r=0;r<rows;r++) for(var c=0;c<cols;c++){
        var el=document.createElement('div');
        el.className='mine-cell';
        (function(rr,cc){
          el.addEventListener('click', function(){ if(flagMode) toggleFlag(rr,cc); else reveal(rr,cc); });
          el.addEventListener('contextmenu', function(e){ e.preventDefault(); toggleFlag(rr,cc); });
          // long-press to flag on touch, cancelled if the user is scrolling
          var timer=null, moved=false, fired=false, sx=0, sy=0;
          el.addEventListener('touchstart', function(e){
            moved=false; fired=false;
            sx=e.touches[0].clientX; sy=e.touches[0].clientY;
            timer=setTimeout(function(){ if(!moved){ fired=true; toggleFlag(rr,cc); } }, 420);
          }, {passive:true});
          el.addEventListener('touchmove', function(e){
            if(Math.abs(e.touches[0].clientX-sx)>8||Math.abs(e.touches[0].clientY-sy)>8){ moved=true; clearTimeout(timer); }
          }, {passive:true});
          el.addEventListener('touchend', function(e){
            clearTimeout(timer);
            if(fired){ e.preventDefault(); fired=false; }
          }, {passive:false});
          el.addEventListener('touchcancel', function(){ clearTimeout(timer); });
        })(r,c);
        grid.appendChild(el);
      }
      for(var rr2=0;rr2<rows;rr2++) for(var cc2=0;cc2<cols;cc2++) paintCell(rr2,cc2,0);
    }

    qsa2(body,'[data-diff]').forEach(function(b){
      b.addEventListener('click', function(){
        cfg.diff = b.getAttribute('data-diff'); cfg._save();
        qsa2(body,'[data-diff]').forEach(function(x){x.classList.add('secondary');});
        b.classList.remove('secondary');
        body.querySelector('#mine-custom').style.display = cfg.diff==='custom' ? '' : 'none';
        build();
      });
    });
    body.querySelector('#mine-custom').style.display = cfg.diff==='custom' ? '' : 'none';
    body.querySelector('#mc-apply').addEventListener('click', function(){
      cfg.cols = Math.min(40, Math.max(5, parseInt(body.querySelector('#mc-cols').value,10)||12));
      cfg.rows = Math.min(30, Math.max(5, parseInt(body.querySelector('#mc-rows').value,10)||12));
      cfg.mines = Math.min(cfg.cols*cfg.rows-9, Math.max(1, parseInt(body.querySelector('#mc-mines').value,10)||24));
      cfg.timeLimit = Math.max(0, parseInt(body.querySelector('#mc-time').value,10)||0);
      cfg.flagLimit = Math.max(0, parseInt(body.querySelector('#mc-flags').value,10)||0);
      body.querySelector('#mc-mines').value = cfg.mines;
      cfg._save();
      DIFFS.custom = {rows:cfg.rows, cols:cfg.cols, mines:cfg.mines};
      build();
    });
    body.querySelector('#mine-flagmode').addEventListener('click', function(){
      flagMode=!flagMode;
      this.classList.toggle('secondary', !flagMode);
      notify(flagMode?'Flag mode on — taps place flags':'Flag mode off — taps reveal', flagMode?'warn':'ok');
    });
    body.querySelector('#mine-new').addEventListener('click', build);
    function keyHandler(e){
      if(e.target.tagName==='INPUT') return;
      if(e.key==='r'||e.key==='R') build();
      if(e.key==='f'||e.key==='F') body.querySelector('#mine-flagmode').click();
    }
    document.addEventListener('keydown', keyHandler);
    build();
    onUnmount(grid, function(){ document.removeEventListener('keydown', keyHandler); clearInterval(timerInt); });
  });
}
PLAYABLES['minesweeper'] = mountMinesweeper;

/* ==================================================================
   games / minesweeper-coop
   ================================================================== */
/* =========================================================
   MINESWEEPER CO-OP — real peer-to-peer multiplayer, no backend.
   Uses PeerJS (WebRTC) lazy-loaded from a CDN only when this game is
   opened; the connection itself is direct browser-to-browser. The host's
   browser holds the authoritative board and referees every move; guests
   send move requests and receive the resulting board state. This only
   works while the host's tab stays open — there is no server to fall
   back to, by design (matches the rest of the site: no backend).
   ========================================================= */
function mountMinesweeperCoop(container){
  mountEmbed(container, 'PLAY / MINESWEEPER CO-OP', function(body){
    var PLAYER_COLORS = ['#3b82f6','#ff535e','#36c979','#fbbf24'];
    var DIFFS = { easy:{rows:9,cols:9,mines:10}, medium:{rows:14,cols:14,mines:32}, hard:{rows:16,cols:20,mines:60} };

    body.innerHTML = '<div class="mine-wrap" id="ms-coop-root"></div>';
    var root = body.querySelector('#ms-coop-root');

    var myId = 'p'+Math.random().toString(36).slice(2,8);
    var myColor = PLAYER_COLORS[Math.floor(Math.random()*PLAYER_COLORS.length)];
    var myName = 'You';
    var role = null; // 'host' | 'guest'
    var peer = null, conns = {}, hostConn = null;
    var players = [];
    var rows, cols, mineCount, board, revealed, flagged, owner, gameOver;
    var roomCode = '';

    function ensurePeerJS(cb, onerr){
      if(window.Peer){ cb(); return; }
      var s = document.createElement('script');
      s.src = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js';
      s.onload = cb;
      s.onerror = onerr;
      document.head.appendChild(s);
    }
    function genRoomCode(){
      var chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789', out='';
      for(var i=0;i<5;i++) out += chars[Math.floor(Math.random()*chars.length)];
      return out;
    }

    function renderLobby(err){
      root.innerHTML =
        '<div style="width:100%;max-width:640px;display:grid;grid-template-columns:1fr 1fr;gap:16px">'+
          '<div class="opt-panel"><div class="opt-panel-title">Host a room</div>'+
            '<p class="tool-msg">Your browser holds the board. Share the room code with up to 3 friends.</p>'+
            '<div class="tool-row"><select id="mc-diff" class="cat-sort-select" style="width:auto">'+
              '<option value="easy">Easy 9×9</option><option value="medium" selected>Medium 14×14</option><option value="hard">Hard 20×16</option>'+
            '</select></div>'+
            '<button class="game-btn" id="mc-host">Host a room</button>'+
          '</div>'+
          '<div class="opt-panel"><div class="opt-panel-title">Join a room</div>'+
            '<p class="tool-msg">Ask the host for their 5-character room code.</p>'+
            '<div class="tool-row"><input type="text" id="mc-code" maxlength="5" placeholder="ROOM CODE" style="text-transform:uppercase;letter-spacing:2px;width:120px"></div>'+
            '<button class="game-btn secondary" id="mc-join">Join room</button>'+
          '</div>'+
        '</div>'+
        (err ? '<div class="tool-msg err" style="margin-top:12px">'+esc(err)+'</div>' : '')+
        '<div class="tool-msg" style="margin-top:14px;max-width:640px">No accounts, no server for gameplay — connections run peer-to-peer directly between browsers over WebRTC (via PeerJS&#39;s free public signalling relay just to introduce the two browsers to each other). If the host closes their tab, the game ends for everyone.</div>';
      root.querySelector('#mc-host').addEventListener('click', function(){ startHost(root.querySelector('#mc-diff').value); });
      root.querySelector('#mc-join').addEventListener('click', function(){
        var code = root.querySelector('#mc-code').value.trim().toUpperCase();
        if(code.length!==5){ notify('Enter the 5-character room code','warn'); return; }
        startJoin(code);
      });
    }

    function neighbors(r,c){
      var out=[];
      for(var dr=-1;dr<=1;dr++) for(var dc=-1;dc<=1;dc++){
        if(dr===0&&dc===0) continue;
        var nr=r+dr, nc=c+dc;
        if(nr>=0&&nc>=0&&nr<rows&&nc<cols) out.push([nr,nc]);
      }
      return out;
    }
    function placeMines(safeR,safeC){
      var candidates=[];
      for(var r=0;r<rows;r++) for(var c=0;c<cols;c++) if(Math.abs(r-safeR)>1||Math.abs(c-safeC)>1) candidates.push([r,c]);
      for(var i=candidates.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)); var t=candidates[i]; candidates[i]=candidates[j]; candidates[j]=t; }
      for(i=0;i<mineCount;i++) board[candidates[i][0]][candidates[i][1]] = -1;
      for(r=0;r<rows;r++) for(c=0;c<cols;c++) if(board[r][c]!==-1)
        board[r][c] = neighbors(r,c).filter(function(n){return board[n[0]][n[1]]===-1;}).length;
    }
    var firstClick;
    function initBoard(diffKey){
      var d = DIFFS[diffKey]||DIFFS.medium;
      rows=d.rows; cols=d.cols; mineCount=d.mines;
      board = Array.from({length:rows}, function(){ return Array(cols).fill(0); });
      revealed = Array.from({length:rows}, function(){ return Array(cols).fill(false); });
      flagged  = Array.from({length:rows}, function(){ return Array(cols).fill(null); });
      owner    = Array.from({length:rows}, function(){ return Array(cols).fill(null); });
      firstClick = true; gameOver=false;
    }
    function hostReveal(r,c,pid){
      if(gameOver || revealed[r][c] || flagged[r][c]) return;
      if(firstClick){ firstClick=false; placeMines(r,c); }
      revealed[r][c]=true; owner[r][c]=pid;
      if(board[r][c]===-1){ endGame(false); return; }
      if(board[r][c]===0) neighbors(r,c).forEach(function(n){ hostReveal(n[0],n[1],pid); });
      checkWin();
    }
    function hostFlag(r,c,pid){
      if(gameOver||revealed[r][c]) return;
      flagged[r][c] = flagged[r][c] ? null : pid;
    }
    function checkWin(){
      var left=0;
      for(var r=0;r<rows;r++) for(var c=0;c<cols;c++) if(!revealed[r][c] && board[r][c]!==-1) left++;
      if(left===0) endGame(true);
    }
    function endGame(won){
      gameOver=true;
      if(!won) for(var r=0;r<rows;r++) for(var c=0;c<cols;c++) if(board[r][c]===-1) revealed[r][c]=true;
      notify(won ? 'Co-op board cleared!' : 'Co-op — a mine was hit', won?'ok':'warn');
    }
    function serializeState(){
      var maskedBoard = [];
      for(var r=0;r<rows;r++){ var row=[]; for(var c=0;c<cols;c++){ row.push(revealed[r][c] ? board[r][c] : null); } maskedBoard.push(row); }
      return {type:'state', rows:rows, cols:cols, mineCount:mineCount, board:maskedBoard, flagged:flagged, owner:owner, gameOver:gameOver, players:players};
    }
    function broadcastState(){
      var msg = serializeState();
      Object.keys(conns).forEach(function(pid){ try{ conns[pid].send(msg); }catch(e){} });
      renderGame(msg);
    }

    function startHost(diffKey){
      ensurePeerJS(function(){
        players = [{id:myId, name:myName, color:myColor, host:true}];
        initBoard(diffKey);
        roomCode = genRoomCode();
        peer = new window.Peer('vs-ms-'+roomCode.toLowerCase());
        peer.on('open', function(){
          role='host';
          renderGame(serializeState());
          notify('Room hosted — share the code!','ok');
        });
        peer.on('connection', function(conn){
          conn.on('open', function(){ conns[conn.peer]=conn; });
          conn.on('data', function(msg){ handleHostMessage(conn, msg); });
          conn.on('close', function(){
            delete conns[conn.peer];
            players = players.filter(function(p){ return p.pid!==conn.peer; });
            broadcastState();
          });
        });
        peer.on('error', function(e){ renderLobby('Connection error: '+(e&&e.type||e)); });
      }, function(){ renderLobby('Could not load the multiplayer library — check your internet connection.'); });
    }
    function handleHostMessage(conn, msg){
      if(msg.type==='hello'){
        var pid = conn.peer;
        var color = PLAYER_COLORS[players.length % PLAYER_COLORS.length];
        players.push({id:pid, pid:pid, name:msg.name||'Player', color:color, host:false});
        conn.send({type:'welcome', roomCode:roomCode, yourColor:color});
        broadcastState();
      } else if(msg.type==='action'){
        if(msg.action==='reveal') hostReveal(msg.r, msg.c, conn.peer);
        else if(msg.action==='flag') hostFlag(msg.r, msg.c, conn.peer);
        broadcastState();
      }
    }
    function startJoin(code){
      ensurePeerJS(function(){
        peer = new window.Peer();
        peer.on('open', function(){
          var conn = peer.connect('vs-ms-'+code.toLowerCase(), {reliable:true});
          hostConn = conn;
          conn.on('open', function(){
            role='guest'; roomCode=code;
            conn.send({type:'hello', name:myName});
          });
          conn.on('data', function(msg){
            if(msg.type==='welcome'){ myColor = msg.yourColor; }
            else if(msg.type==='state'){ renderGame(msg); }
          });
          conn.on('close', function(){ renderLobby('Host closed the room.'); });
          conn.on('error', function(){ renderLobby('Could not reach that room — check the code.'); });
        });
        peer.on('error', function(e){ renderLobby('Connection error: '+(e&&e.type||e)); });
      }, function(){ renderLobby('Could not load the multiplayer library — check your internet connection.'); });
    }

    function sendAction(action, r, c){
      if(role==='host'){
        if(action==='reveal') hostReveal(r,c,myId); else hostFlag(r,c,myId);
        broadcastState();
      } else if(role==='guest' && hostConn){
        hostConn.send({type:'action', action:action, r:r, c:c});
      }
    }

    function renderGame(state){
      var playersHtml = (state.players||players).map(function(p){
        return '<span class="player-chip"><span class="player-dot" style="background:'+p.color+'"></span>'+esc(p.name||'Player')+(p.host?' <span style="color:var(--muted);font-size:9px">HOST</span>':'')+'</span>';
      }).join('');
      root.innerHTML =
        '<div class="tool-row" style="justify-content:center">'+
          '<div class="room-code-display" id="mc-roomcode" title="Click to copy">'+roomCode+'</div>'+
        '</div>'+
        '<div class="tool-row" style="justify-content:center">'+playersHtml+'</div>'+
        '<div class="mine-hud"><span>MINES '+state.mineCount+'</span></div>'+
        '<div class="mine-grid" id="mc-grid"></div>'+
        '<div class="tool-msg" id="mc-result">'+(state.gameOver ? (checkAllSafeRevealed(state) ? 'Board cleared! 🏆' : 'A mine was hit 💥') : '')+'</div>'+
        '<div class="tool-row" style="justify-content:center"><button class="game-btn secondary" id="mc-leave">Leave room</button></div>';

      root.querySelector('#mc-roomcode').addEventListener('click', function(){
        navigator.clipboard.writeText(roomCode).then(function(){ notify('Room code copied','ok'); });
      });
      root.querySelector('#mc-leave').addEventListener('click', function(){
        if(peer) peer.destroy();
        conns={}; hostConn=null; role=null;
        renderLobby();
      });

      var grid = root.querySelector('#mc-grid');
      grid.style.gridTemplateColumns = 'repeat('+state.cols+',26px)';
      grid.innerHTML='';
      for(var r=0;r<state.rows;r++) for(var c=0;c<state.cols;c++){
        var val = state.board[r][c];
        var isRevealed = val !== null;
        var flagOwner = state.flagged[r][c];
        var el = document.createElement('div');
        el.className = 'mine-cell'+(isRevealed?' revealed':'')+(isRevealed&&val===-1?' mine':'')+(flagOwner&&!isRevealed?' flag':'');
        if(isRevealed){ el.textContent = val===-1?'💣':(val>0?val:''); if(val>0) el.classList.add('n'+val); }
        else if(flagOwner){
          el.textContent='⚑';
          var owner = (state.players||players).filter(function(p){return p.id===flagOwner||p.pid===flagOwner;})[0];
          if(owner) el.style.color = owner.color;
        }
        (function(rr,cc){
          el.addEventListener('click', function(){ sendAction('reveal', rr, cc); });
          el.addEventListener('contextmenu', function(e){ e.preventDefault(); sendAction('flag', rr, cc); });
        })(r,c);
        grid.appendChild(el);
      }
    }
    function checkAllSafeRevealed(state){
      for(var r=0;r<state.rows;r++) for(var c=0;c<state.cols;c++) if(state.board[r][c]===-1) return false;
      return true;
    }

    renderLobby();
    onUnmount(root, function(){ if(peer){ try{ peer.destroy(); }catch(e){} } });
  });
}
PLAYABLES['minesweeper-coop'] = mountMinesweeperCoop;

/* ==================================================================
   games / simon
   ================================================================== */
/* SIMON SAYS */
function mountSimon(container){
  mountEmbed(container, 'PLAY / SIMON SAYS', function(body){
    var COLORS = ['#ff535e','#36c979','#3b82f6','#fbbf24'];
    var FREQS = [329,415,261,392];
    body.innerHTML =
      '<div class="snake-wrap">'+
        '<div class="snake-hud"><span id="si-round">ROUND 0</span><span id="si-best">BEST 0</span><span id="si-streak">STREAK 0</span></div>'+
        '<div class="tool-row" id="si-speeds"></div>'+
        '<div id="si-board" class="si-board"></div>'+
        '<button class="game-btn secondary" id="si-start">Start</button>'+
      '</div>';
    var board = body.querySelector('#si-board');
    var best = lsGet('vs-simon-best',0), streak=lsGet('vs-simon-streak',0);
    body.querySelector('#si-best').textContent='BEST '+best;
    body.querySelector('#si-streak').textContent='STREAK '+streak;
    var cfg = gameSettings('simon', {speed:500});
    var speed=cfg.speed, sequence, playerIdx, round, playing;
    var actx=null;
    function beep(freq,dur){
      try{
        if(!actx) actx = new (window.AudioContext||window.webkitAudioContext)();
        var o=actx.createOscillator(), g=actx.createGain();
        o.connect(g); g.connect(actx.destination);
        o.frequency.value=freq; g.gain.setValueAtTime(.25, actx.currentTime);
        g.gain.exponentialRampToValueAtTime(.001, actx.currentTime+dur);
        o.start(); o.stop(actx.currentTime+dur);
      } catch(e){}
    }
    [['Slow',800],['Normal',500],['Fast',280],['Insane',150]].forEach(function(s,i){
      var b=document.createElement('button');
      b.className='game-btn'+(i===1?'':' secondary'); b.textContent=s[0];
      if(s[1]===cfg.speed){ b.className='game-btn'; } else { b.className='game-btn secondary'; }
      b.addEventListener('click', function(){ speed=s[1]; cfg.speed=s[1]; cfg._save(); qsa2(body,'#si-speeds button').forEach(function(x){x.classList.add('secondary');}); b.classList.remove('secondary'); });
      body.querySelector('#si-speeds').appendChild(b);
    });
    [0,1,2,3].forEach(function(i){
      var b=document.createElement('button');
      b.style.cssText='border:2px solid var(--line);border-radius:8px;background:'+COLORS[i]+';opacity:.55;cursor:pointer';
      b.setAttribute('aria-label', 'Simon pad ' + (i + 1));
      b.addEventListener('pointerdown', function(e){ e.preventDefault(); press(i); });   // fires on touch-down, no tap delay
      b.addEventListener('click', function(e){ if(e.detail === 0) press(i); });        // keyboard activation
      board.appendChild(b);
    });
    function btn(i){ return board.children[i]; }
    function light(i,on){ btn(i).style.opacity = on?'1':'.55'; }
    function wait(ms){ return new Promise(function(r){ setTimeout(r,ms); }); }
    function start(){ sequence=[]; round=0; playing=true; streak=0; body.querySelector('#si-streak').textContent='STREAK 0'; nextRound(); }
    function nextRound(){ round++; body.querySelector('#si-round').textContent='ROUND '+round; sequence.push(Math.floor(Math.random()*4)); playSeq(); }
    async function playSeq(){
      for(var i=0;i<sequence.length;i++){ light(sequence[i],true); beep(FREQS[sequence[i]], speed*.8/1000); await wait(speed*.8); light(sequence[i],false); await wait(speed*.3); }
      playerIdx=0;
    }
    function press(i){
      if(!playing||playerIdx===undefined) return;
      light(i,true); beep(FREQS[i],0.2); setTimeout(function(){light(i,false);},150);
      if(i===sequence[playerIdx]){
        playerIdx++;
        if(playerIdx===sequence.length){
          streak++; lsSet('vs-simon-streak',streak); body.querySelector('#si-streak').textContent='STREAK '+streak;
          if(round>best){ best=round; lsSet('vs-simon-best',best); body.querySelector('#si-best').textContent='BEST '+best; }
          playerIdx=undefined; setTimeout(nextRound,500);
        }
      } else {
        playing=false; beep(80,.4);
        body.querySelector('#si-start').textContent='Try again';
      }
    }
    body.querySelector('#si-start').addEventListener('click', start);
    function keyHandler(e){ if(e.key==='r'||e.key==='R') start(); }
    document.addEventListener('keydown', keyHandler);
    onUnmount(board, function(){ document.removeEventListener('keydown', keyHandler); });
  });
}
PLAYABLES['simon'] = mountSimon;

/* ==================================================================
   games / sliding-puzzle
   ================================================================== */
/* SLIDING PUZZLE */
function mountSliding(container){
  mountEmbed(container, 'PLAY / SLIDING PUZZLE', function(body){
    body.innerHTML =
      '<div class="mine-wrap">'+
        '<div class="tool-row"><select id="sl-size" class="cat-sort-select" style="width:auto"><option value="3">3×3</option><option value="4" selected>4×4</option><option value="5">5×5</option></select></div>'+
        '<div class="mine-hud"><span id="sl-moves">MOVES 0</span><span id="sl-time">TIME 0s</span><span id="sl-best">BEST —</span></div>'+
        '<div id="sl-board" style="display:grid;gap:4px"></div>'+
        '<div class="tool-row"><button class="game-btn secondary" id="sl-new">Shuffle</button><button class="game-btn secondary" id="sl-hint">Hint</button></div>'+
        '<div class="tool-msg" id="sl-msg"></div>'+
      '</div>';
    var board = body.querySelector('#sl-board');
    var cfg = gameSettings('sliding', {size:4});
    body.querySelector('#sl-size').value = String(cfg.size);
    body.querySelector('#sl-size').addEventListener('change', function(){ cfg.size=parseInt(this.value,10); cfg._save(); });
    var N, tiles, moves, won, timerInt, elapsed;
    function isSolvable(t,n){
      var flat=t.filter(function(x){return x!==0;});
      var inv=0;
      for(var i=0;i<flat.length;i++) for(var j=i+1;j<flat.length;j++) if(flat[i]>flat[j]) inv++;
      var blankRow = Math.floor(t.indexOf(0)/n);
      if(n%2===1) return inv%2===0;
      return ((inv+blankRow)%2===0) !== (n%2===0);
    }
    function shuffleNew(){
      N = parseInt(body.querySelector('#sl-size').value,10);
      moves=0; won=false; elapsed=0;
      clearInterval(timerInt);
      var best = lsGet('vs-sliding-best-'+N, null);
      body.querySelector('#sl-best').textContent='BEST '+(best===null?'—':best);
      body.querySelector('#sl-moves').textContent='MOVES 0';
      body.querySelector('#sl-time').textContent='TIME 0s';
      body.querySelector('#sl-msg').textContent='';
      do {
        tiles = Array.from({length:N*N}, function(_,i){return i;});
        for(var i=tiles.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)); var t=tiles[i]; tiles[i]=tiles[j]; tiles[j]=t; }
      } while(!isSolvable(tiles,N));
      timerInt = setInterval(function(){ elapsed++; body.querySelector('#sl-time').textContent='TIME '+elapsed+'s'; }, 1000);
      render();
    }
    function render(){
      var sz = N===3?70 : N===4?56 : 46;
      board.style.gridTemplateColumns='repeat('+N+','+sz+'px)';
      board.innerHTML='';
      tiles.forEach(function(t,i){
        var el=document.createElement('div');
        el.className='mine-cell'+(t===0?'':' revealed');
        el.style.width=sz+'px'; el.style.height=sz+'px'; el.style.fontSize=(sz*.35)+'px'; el.style.cursor='pointer';
        el.textContent=t||'';
        el.addEventListener('click', function(){ click(i); });
        board.appendChild(el);
      });
    }
    function click(idx){
      if(won) return;
      var blank=tiles.indexOf(0);
      var r=Math.floor(idx/N),c=idx%N,br=Math.floor(blank/N),bc=blank%N;
      if((Math.abs(r-br)===1&&c===bc)||(r===br&&Math.abs(c-bc)===1)){
        var tmp=tiles[blank]; tiles[blank]=tiles[idx]; tiles[idx]=tmp;
        moves++; body.querySelector('#sl-moves').textContent='MOVES '+moves;
        render();
        if(tiles.every(function(t,i){return t===(i===N*N-1?0:i+1);})){
          won=true; clearInterval(timerInt);
          var best = lsGet('vs-sliding-best-'+N, null);
          if(best===null||moves<best) lsSet('vs-sliding-best-'+N, moves);
          body.querySelector('#sl-msg').textContent='Solved in '+moves+' moves · '+elapsed+'s!';
          notify('Sliding puzzle solved in '+moves+' moves','ok');
        }
      }
    }
    function hint(){
      var blank=tiles.indexOf(0);
      var br=Math.floor(blank/N), bc=blank%N;
      var neighborsArr=[[br-1,bc],[br+1,bc],[br,bc-1],[br,bc+1]];
      var best=null, bestDist=Infinity;
      neighborsArr.forEach(function(n){
        var r=n[0],c=n[1];
        if(r<0||r>=N||c<0||c>=N) return;
        var t=tiles[r*N+c]; if(t===0) return;
        var goalR=Math.floor((t-1)/N), goalC=(t-1)%N;
        var dist=Math.abs(r-goalR)+Math.abs(c-goalC);
        if(dist<bestDist){ bestDist=dist; best=[r,c]; }
      });
      if(best) click(best[0]*N+best[1]);
    }
    body.querySelector('#sl-size').addEventListener('change', shuffleNew);
    body.querySelector('#sl-new').addEventListener('click', shuffleNew);
    body.querySelector('#sl-hint').addEventListener('click', hint);
    function keyHandler(e){
      if(e.key==='r'||e.key==='R'){ shuffleNew(); return; }
      if(won) return;
      var blank=tiles.indexOf(0), br=Math.floor(blank/N), bc=blank%N;
      var dirs={ArrowUp:[br+1,bc],ArrowDown:[br-1,bc],ArrowLeft:[br,bc+1],ArrowRight:[br,bc-1],w:[br+1,bc],s:[br-1,bc],a:[br,bc+1],d:[br,bc-1]};
      var d=dirs[e.key];
      if(d && d[0]>=0 && d[0]<N && d[1]>=0 && d[1]<N){ e.preventDefault(); click(d[0]*N+d[1]); }
    }
    document.addEventListener('keydown', keyHandler);
    shuffleNew();
    onUnmount(board, function(){ document.removeEventListener('keydown', keyHandler); clearInterval(timerInt); });
  });
}
PLAYABLES['sliding-puzzle'] = mountSliding;

/* ==================================================================
   games / snake
   ================================================================== */
//
// Smooth Snake. The rules still advance one cell per "step", but drawing runs on
// requestAnimationFrame and slides every segment between its old and new cell, so
// movement is continuous instead of jumping. Direction presses are buffered (two
// deep) so quick turns never get dropped.

function mountSnake(container){
  mountEmbed(container, 'PLAY / SNAKE', function(body){
    body.innerHTML =
      '<div class="snake-wrap">'+
        '<div class="snake-hud"><span id="sn-score">SCORE 0</span><span id="sn-best">BEST 0</span><span id="sn-level">LEVEL 1</span></div>'+
        '<canvas id="snake-canvas" aria-label="Snake game board"></canvas>'+
        '<div class="tool-row">'+
          '<button class="game-btn" id="sn-start">Start</button>'+
          '<button class="game-btn secondary" id="sn-pause" disabled>Pause</button>'+
          '<select id="sn-apples" class="cat-sort-select" style="width:auto"><option value="1">1 apple</option><option value="3" selected>3 apples</option><option value="5">5 apples</option></select>'+
          '<label class="sn-range">Speed <b id="sn-speedv">4</b><input type="range" id="sn-diff" min="1" max="10" step="1" value="4" aria-label="Snake speed"></label>'+
          '<label class="sn-turnlbl">Turning <select id="sn-turn" class="cat-sort-select" style="width:auto" aria-label="Turn responsiveness"><option value="smooth">Smooth</option><option value="quick">Quick</option><option value="instant">Instant</option></select></label>'+
          '<label><input type="checkbox" id="sn-wrap"> Wrap walls</label>'+
          '<button class="game-btn secondary" id="sn-clear">Clear best</button>'+
        '</div>'+
        '<p class="hint" style="margin:0;text-align:center">Arrow keys or WASD · Space to pause · swipe on touch screens</p>'+
      '</div>';

    var COLS = 20, ROWS = 20, CELL = 20, SIZE = COLS * CELL;
    var canvas = body.querySelector('#snake-canvas'), ctx = canvas.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = SIZE * dpr; canvas.height = SIZE * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var cfg = gameSettings('snake', {apples:3, level:4, turn:'quick', wrap:false});
    var LEVELS = [230, 185, 155, 130, 110, 92, 76, 62, 50, 40];
    function baseMs(){ return LEVELS[Math.min(10, Math.max(1, parseInt($('#sn-diff').value, 10) || 4)) - 1]; }
    var $ = function(sel){ return body.querySelector(sel); };
    $('#sn-apples').value = String(cfg.apples);
    $('#sn-diff').value = String(cfg.level || 4); $('#sn-speedv').textContent = $('#sn-diff').value; $('#sn-turn').value = cfg.turn || 'quick';
    $('#sn-wrap').checked = !!cfg.wrap;
    $('#sn-apples').addEventListener('change', function(){ cfg.apples = parseInt(this.value, 10); cfg._save(); });
    $('#sn-diff').addEventListener('input', function(){ $('#sn-speedv').textContent = this.value; if(state !== 'running') stepMs = baseMs(); });
    $('#sn-diff').addEventListener('change', function(){ cfg.level = parseInt(this.value, 10); cfg._save(); this.blur(); });
    $('#sn-turn').addEventListener('change', function(){ cfg.turn = this.value; cfg._save(); this.blur(); });
    ['#sn-apples', '#sn-wrap'].forEach(function(s){ $(s).addEventListener('change', function(){ this.blur(); }); });
    $('#sn-wrap').addEventListener('change', function(){ cfg.wrap = this.checked; cfg._save(); });

    var snake = [], prev = [], dir = {x:1, y:0}, queue = [], foods = [];
    var score = 0, best = lsGet('vs-snake-best', 0);
    var state = 'idle';            // idle | running | paused | over
    var stepMs = 130, acc = 0, last = 0, raf = null;
    $('#sn-best').textContent = 'BEST ' + best;

    function css(v, fb){ return getComputedStyle(document.documentElement).getPropertyValue(v).trim() || fb; }
    function rgb(){ return (css('--accent-rgb', '107 152 230')).split(/\s+/).map(Number); }
    function same(a, b){ return a.x === b.x && a.y === b.y; }

    /* ---- game rules ---- */
    function placeFood(){
      var pos, tries = 0;
      do { pos = {x:Math.floor(Math.random() * COLS), y:Math.floor(Math.random() * ROWS), born:performance.now()}; tries++; }
      while(tries < 500 && (snake.some(function(s){ return same(s, pos); }) || foods.some(function(f){ return same(f, pos); })));
      return pos;
    }
    function reset(){
      var mid = Math.floor(COLS / 2);
      snake = [{x:mid, y:mid}, {x:mid - 1, y:mid}, {x:mid - 2, y:mid}];
      prev = snake.map(function(s){ return {x:s.x, y:s.y}; });
      dir = {x:1, y:0}; queue = []; foods = []; score = 0; acc = 0;
      var n = parseInt($('#sn-apples').value, 10) || 3;
      for(var i = 0; i < n; i++) foods.push(placeFood());
      stepMs = baseMs();
      $('#sn-score').textContent = 'SCORE 0';
      $('#sn-level').textContent = 'LEVEL 1';
    }
    function setDir(dx, dy){
      var ref = queue.length ? queue[queue.length - 1] : dir;
      if(dx === -ref.x && dy === -ref.y) return;   // can't reverse into yourself
      if(dx === ref.x && dy === ref.y) return;     // already heading that way
      if(queue.length < 3) queue.push({x:dx, y:dy});
      /* "Instant" turning: if the snake is already a good way through its cell, step right now instead of waiting. */
      if(cfg.turn === 'instant' && state === 'running' && queue.length === 1 && acc > stepMs * .3) acc = stepMs;
    }
    /* Responsiveness: once a turn is queued, the snake covers the rest of its current cell about
       three times faster instead of finishing it at normal speed, so a key press shows up almost at once. */
    function catchUpSpeed(){ return cfg.turn !== 'smooth' && queue.length && acc > stepMs * .25 ? 3.2 : 1; }
    function step(){
      prev = snake.map(function(s){ return {x:s.x, y:s.y}; });
      if(queue.length) dir = queue.shift();
      canvas.dataset.dir = dir.x + ',' + dir.y;
      var head = {x:snake[0].x + dir.x, y:snake[0].y + dir.y};
      if(cfg.wrap){
        head.x = (head.x + COLS) % COLS; head.y = (head.y + ROWS) % ROWS;
      } else if(head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS){ die(); return; }

      var ateIdx = -1;
      for(var i = 0; i < foods.length; i++) if(same(foods[i], head)){ ateIdx = i; break; }
      // The tail cell is vacated this step, so moving into it is safe unless we just ate.
      var bodyCells = ateIdx > -1 ? snake : snake.slice(0, -1);
      if(bodyCells.some(function(s){ return same(s, head); })){ die(); return; }

      snake.unshift(head);
      if(ateIdx > -1){
        score++;
        $('#sn-score').textContent = 'SCORE ' + score;
        $('#sn-level').textContent = 'LEVEL ' + (Math.floor(score / 5) + 1);
        if(score > best){ best = score; lsSet('vs-snake-best', best); $('#sn-best').textContent = 'BEST ' + best; }
        foods.splice(ateIdx, 1); foods.push(placeFood());
        stepMs = Math.max(36, baseMs() - Math.floor(score / 5) * 6);
      } else {
        snake.pop();
      }
    }
    function die(){
      state = 'over';
      stopLoop();
      draw(1);
      overlay('GAME OVER', 'Score ' + score + ' — press Start or Enter to retry', 'rgba(255,83,94,.18)');
      $('#sn-pause').disabled = true;
      notify('Snake — game over, score ' + score, 'warn');
    }

    /* ---- drawing ---- */
    function lerpPoint(i, t){
      var to = snake[i], from = prev[i] || to;
      var dx = to.x - from.x, dy = to.y - from.y;
      // A wrap-around move jumps COLS-1 cells; take the short way across the edge instead.
      if(Math.abs(dx) > 1) dx -= Math.sign(dx) * COLS;
      if(Math.abs(dy) > 1) dy -= Math.sign(dy) * ROWS;
      return {x:from.x + dx * t, y:from.y + dy * t};
    }
    function overlay(title, sub, tint){
      ctx.fillStyle = tint; ctx.fillRect(0, 0, SIZE, SIZE);
      ctx.fillStyle = css('--text', '#fff'); ctx.textAlign = 'center';
      ctx.font = '700 26px ' + css('--font-ui', 'sans-serif'); ctx.fillText(title, SIZE / 2, SIZE / 2 - 8);
      ctx.fillStyle = css('--muted', '#aaa'); ctx.font = '12px ' + css('--font-mono', 'monospace'); ctx.fillText(sub, SIZE / 2, SIZE / 2 + 18);
    }
    function draw(t){
      var surface1 = css('--surface-1', '#101014'), c = rgb(), text = css('--text', '#f2f2f7');
      ctx.fillStyle = surface1; ctx.fillRect(0, 0, SIZE, SIZE);
      ctx.strokeStyle = 'rgba(' + c.join(',') + ',.07)'; ctx.lineWidth = 1;
      ctx.beginPath();
      for(var g = 0; g <= COLS; g++){ ctx.moveTo(g * CELL + .5, 0); ctx.lineTo(g * CELL + .5, SIZE); ctx.moveTo(0, g * CELL + .5); ctx.lineTo(SIZE, g * CELL + .5); }
      ctx.stroke();

      var now = performance.now();
      var palette = ['#36c979', '#ff8fc4', '#fb923c', '#60a5fa', '#a78bfa'];
      foods.forEach(function(f, i){
        var grow = Math.min(1, (now - (f.born || 0)) / 160);
        var r = (CELL / 2 - 3) * (.35 + .65 * grow);
        var cx = f.x * CELL + CELL / 2, cy = f.y * CELL + CELL / 2;
        ctx.fillStyle = palette[i % palette.length];
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.35)';
        ctx.beginPath(); ctx.arc(cx - r * .35, cy - r * .35, r * .25, 0, Math.PI * 2); ctx.fill();
      });

      // Continuous path through the interpolated segments. Each point is placed on the
      // wrapped copy nearest the previous one so the line never streaks across the board.
      var pts = [lerpPoint(0, t)];
      for(var i = 1; i < snake.length; i++){
        var p = lerpPoint(i, t), q = pts[i - 1];
        if(cfg.wrap){
          if(p.x - q.x > COLS / 2) p.x -= COLS; else if(q.x - p.x > COLS / 2) p.x += COLS;
          if(p.y - q.y > ROWS / 2) p.y -= ROWS; else if(q.y - p.y > ROWS / 2) p.y += ROWS;
        }
        pts.push(p);
      }
      var offs = cfg.wrap ? [-1, 0, 1] : [0];
      var width = CELL - 4;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = width;
      offs.forEach(function(ox){ offs.forEach(function(oy){
        for(var i = pts.length - 1; i > 0; i--){
          var shade = .6 + .4 * (1 - i / pts.length);
          ctx.strokeStyle = 'rgb(' + c.map(function(v){ return Math.round(v * shade); }).join(',') + ')';
          ctx.beginPath();
          ctx.moveTo((pts[i].x + ox * COLS) * CELL + CELL / 2, (pts[i].y + oy * ROWS) * CELL + CELL / 2);
          ctx.lineTo((pts[i - 1].x + ox * COLS) * CELL + CELL / 2, (pts[i - 1].y + oy * ROWS) * CELL + CELL / 2);
          ctx.stroke();
        }
        // Head, with eyes that look where the snake is going.
        var hx = (pts[0].x + ox * COLS) * CELL + CELL / 2, hy = (pts[0].y + oy * ROWS) * CELL + CELL / 2;
        ctx.fillStyle = 'rgb(' + c.join(',') + ')';
        ctx.beginPath(); ctx.arc(hx, hy, width / 2 + .5, 0, Math.PI * 2); ctx.fill();
        var sx = -dir.y, sy = dir.x;
        ctx.fillStyle = text;
        [-1, 1].forEach(function(side){
          ctx.beginPath(); ctx.arc(hx + dir.x * 3.5 + sx * side * 3.6, hy + dir.y * 3.5 + sy * side * 3.6, 1.9, 0, Math.PI * 2); ctx.fill();
        });
      }); });
    }

    /* ---- loop ---- */
    function frame(now){
      raf = requestAnimationFrame(frame);
      var dt = Math.min(now - last, 250); last = now;
      if(state === 'running'){
        acc += dt * catchUpSpeed();
        while(acc >= stepMs && state === 'running'){ acc -= stepMs; step(); }
        if(state === 'running') draw(acc / stepMs);
      }
    }
    function startLoop(){ if(raf) return; last = performance.now(); raf = requestAnimationFrame(frame); }
    function stopLoop(){ if(raf){ cancelAnimationFrame(raf); raf = null; } }

    function start(){
      reset();
      state = 'running';
      $('#sn-start').textContent = 'Restart';
      $('#sn-pause').disabled = false; $('#sn-pause').textContent = 'Pause';
      stopLoop(); startLoop();
    }
    function togglePause(){
      if(state === 'running'){
        state = 'paused'; draw(acc / stepMs); overlay('PAUSED', 'Press Space to resume', 'rgba(0,0,0,.35)');
        $('#sn-pause').textContent = 'Resume';
      } else if(state === 'paused'){
        state = 'running'; last = performance.now();
        $('#sn-pause').textContent = 'Pause';
      }
    }

    /* ---- input ---- */
    var KEYS = {ArrowLeft:[-1,0], a:[-1,0], A:[-1,0], ArrowRight:[1,0], d:[1,0], D:[1,0], ArrowUp:[0,-1], w:[0,-1], W:[0,-1], ArrowDown:[0,1], s:[0,1], S:[0,1]};
    function keyHandler(e){
      var tag = e.target && e.target.tagName;
      if(tag === 'SELECT' || tag === 'TEXTAREA' || (tag === 'INPUT' && e.target.type !== 'checkbox')) return;
      if(KEYS[e.key]){ e.preventDefault(); if(state === 'running') setDir(KEYS[e.key][0], KEYS[e.key][1]); return; }
      if(e.key === ' '){ e.preventDefault(); if(state === 'running' || state === 'paused') togglePause(); else start(); return; }
      if(e.key === 'Enter' && (state === 'idle' || state === 'over')){ e.preventDefault(); start(); return; }
      if((e.key === 'r' || e.key === 'R') && state !== 'idle') start();
    }
    document.addEventListener('keydown', keyHandler);

    var touch = null, SWIPE = 14;
    canvas.addEventListener('touchstart', function(e){ var t = e.changedTouches[0]; touch = {x:t.clientX, y:t.clientY, moved:false}; }, {passive:true});
    canvas.addEventListener('touchmove', function(e){
      e.preventDefault();
      if(!touch) return;
      var t = e.changedTouches[0], dx = t.clientX - touch.x, dy = t.clientY - touch.y;
      if(Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE) return;
      touch.moved = true;
      if(state === 'running'){ if(Math.abs(dx) > Math.abs(dy)) setDir(dx > 0 ? 1 : -1, 0); else setDir(0, dy > 0 ? 1 : -1); }
      touch.x = t.clientX; touch.y = t.clientY;   // new origin, so a zig-zag swipe can turn several times
    }, {passive:false});
    canvas.addEventListener('touchend', function(e){
      var tt = touch; touch = null;
      if(tt && !tt.moved && (state === 'idle' || state === 'over')) start();
      else if(tt && !tt.moved && state === 'paused') togglePause();
    });
    canvas.addEventListener('touchcancel', function(){ touch = null; });

    $('#sn-start').addEventListener('click', start);
    $('#sn-pause').addEventListener('click', togglePause);
    $('#sn-clear').addEventListener('click', function(){ best = 0; lsSet('vs-snake-best', 0); $('#sn-best').textContent = 'BEST 0'; notify('Snake best score cleared', 'ok'); });
    document.addEventListener('visibilitychange', function(){ if(document.hidden && state === 'running') togglePause(); });
    onUnmount(canvas, function(){ document.removeEventListener('keydown', keyHandler); stopLoop(); });

    reset(); draw(1);
    overlay('SNAKE', 'Press Start, Space or tap to play', 'rgba(0,0,0,.35)');
  });
}
PLAYABLES['snake'] = mountSnake;

/* ==================================================================
   games / tetris
   ================================================================== */
/* ---------------- Tetris ---------------- */
function mountTetris(container){
  mountEmbed(container, 'PLAY / TETRIS', function(body){
    body.innerHTML =
      '<div class="tt-wrap">'+
        '<div class="snake-hud"><span id="tet-score">SCORE 0</span><span id="tet-lines">LINES 0</span><span id="tet-level">LEVEL 1</span><span id="tet-best">BEST 0</span></div>'+
        '<div class="tt-layout">'+
          '<div class="tt-side"><div class="tool-msg">Hold<span class="kbd-hint"> · C</span></div><canvas id="tet-hold" aria-label="Held piece"></canvas>'+
            '<ul class="tt-keys"><li><b>← →</b> move</li><li><b>↓</b> soft drop</li><li><b>Space</b> hard drop</li><li><b>R · ↑ · X</b> rotate</li><li><b>Z</b> rotate back</li><li><b>C · Shift</b> hold</li><li><b>P · Esc</b> pause</li><li><b>N</b> new game</li></ul></div>'+
          '<canvas id="tet-canvas" aria-label="Tetris board"></canvas>'+
          '<div class="tt-side"><div class="tool-msg">Next</div><canvas id="tet-next" aria-label="Next pieces"></canvas></div>'+
        '</div>'+
        '<div class="tool-row" style="justify-content:center"><button class="game-btn" id="tet-start">Start</button><button class="game-btn secondary" id="tet-pause" disabled>Pause</button></div>'+
        '<div class="tt-touch" id="tet-touch">'+
          '<button type="button" data-a="left" aria-label="Move left">◀</button><button type="button" data-a="rot" aria-label="Rotate">⟳</button><button type="button" data-a="right" aria-label="Move right">▶</button>'+
          '<button type="button" data-a="hold" aria-label="Hold">Hold</button><button type="button" data-a="down" aria-label="Soft drop">▼</button><button type="button" data-a="drop" aria-label="Hard drop">⤓</button>'+
        '</div>'+
      '</div>';
    var $ = function(s){ return body.querySelector(s); };
    var canvas = $('#tet-canvas'), ctx = canvas.getContext('2d');
    var holdC = $('#tet-hold'), hctx = holdC.getContext('2d'), nextC = $('#tet-next'), nctx = nextC.getContext('2d');
    var COLS = 10, ROWS = 20, CELL = 24, dpr = Math.min(window.devicePixelRatio || 1, 3);
    var SHAPES = {
      I:{m:[[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], c:'#22d3ee'}, O:{m:[[1,1],[1,1]], c:'#fbbf24'}, T:{m:[[0,1,0],[1,1,1],[0,0,0]], c:'#9b7bff'},
      S:{m:[[0,1,1],[1,1,0],[0,0,0]], c:'#36c979'}, Z:{m:[[1,1,0],[0,1,1],[0,0,0]], c:'#ff535e'}, J:{m:[[1,0,0],[1,1,1],[0,0,0]], c:'#3b82f6'}, L:{m:[[0,0,1],[1,1,1],[0,0,0]], c:'#f97316'}
    };
    var KICKS = [[0,0],[-1,0],[1,0],[0,-1],[-2,0],[2,0],[-1,-1],[1,-1]];
    var board, piece, queue = [], bag = [], hold = null, canHold = true, score = 0, lines = 0, level = 1;
    var state = 'idle', raf = null, last = 0, grav = 0, lockT = 0, lockResets = 0, flashRows = [], flashT = 0;
    var best = lsGet('vs-tetris-best', 0);
    $('#tet-best').textContent = 'BEST ' + best;
    function css(v, fb){ return getComputedStyle(document.documentElement).getPropertyValue(v).trim() || fb; }

    /* ---- sizing: the board grows to fill the room, up to the screen height ---- */
    function fit(){
      var full = !!(document.fullscreenElement || document.webkitFullscreenElement || document.querySelector('.pseudo-full'));
      var coarse = window.matchMedia && matchMedia('(pointer:coarse)').matches;
      var narrow = window.innerWidth < 700, shortLand = coarse && window.innerHeight < 520 && window.innerWidth > window.innerHeight;
      /* phones: Hold and Next sit either side of the board; landscape phones also put the touch pad beside it */
      var availW = Math.max(160, body.clientWidth - (shortLand ? 2 * 70 + 2 * 150 : narrow ? 2 * 68 : 2 * 150));
      var availH = shortLand ? window.innerHeight - (full ? 76 : 150) : Math.max(320, window.innerHeight - (full ? 280 : (narrow ? 300 : 250)));
      CELL = Math.max(shortLand ? 12 : 16, Math.min(46, Math.floor(Math.min(availW / COLS, availH / ROWS))));
      canvas.width = COLS * CELL * dpr; canvas.height = ROWS * CELL * dpr;
      canvas.style.width = COLS * CELL + 'px'; canvas.style.height = ROWS * CELL + 'px';
      var s = Math.max(14, Math.round(CELL * .62));
      holdC.width = nextC.width = 4 * s * dpr; holdC.height = 3 * s * dpr; nextC.height = 9 * s * dpr;
      holdC.style.width = nextC.style.width = 4 * s + 'px'; holdC.style.height = 3 * s + 'px'; nextC.style.height = 9 * s + 'px';
      holdC._s = nextC._s = s;
      draw();
    }
    window.addEventListener('resize', fit);

    /* ---- pieces ---- */
    function newBag(){ var b = ['I','O','T','S','Z','J','L']; for(var i = b.length - 1; i > 0; i--){ var j = Math.floor(Math.random() * (i + 1)), t = b[i]; b[i] = b[j]; b[j] = t; } return b; }
    function take(){ if(!bag.length) bag = newBag(); return bag.pop(); }
    function make(type){ var m = SHAPES[type].m.map(function(r){ return r.slice(); }); return {type:type, m:m, x:Math.floor((COLS - m.length) / 2), y:type === 'I' ? -1 : 0}; }
    function rotM(m, cw){
      var n = m.length, o = []; for(var r = 0; r < n; r++){ o.push([]); for(var c = 0; c < n; c++) o[r].push(cw ? m[n - 1 - c][r] : m[c][n - 1 - r]); } return o;
    }
    function hits(p, dx, dy, m){
      m = m || p.m;
      for(var r = 0; r < m.length; r++) for(var c = 0; c < m.length; c++){
        if(!m[r][c]) continue;
        var x = p.x + c + dx, y = p.y + r + dy;
        if(x < 0 || x >= COLS || y >= ROWS) return true;
        if(y >= 0 && board[y][x]) return true;
      }
      return false;
    }
    function grounded(){ return hits(piece, 0, 1); }
    function touched(){ if(grounded()){ if(lockResets < 14){ lockT = 0; lockResets++; } } }
    function spawn(type){
      piece = make(type || queue.shift()); while(queue.length < 5) queue.push(take());
      canHold = true; grav = 0; lockT = 0; lockResets = 0;
      if(hits(piece, 0, 0)){ over(); return; }
      drawSide();
    }

    /* ---- moves ---- */
    function move(dx){ if(state !== 'run' || !piece || hits(piece, dx, 0)) return false; piece.x += dx; touched(); return true; }
    function soft(){ if(state !== 'run' || hits(piece, 0, 1)) return false; piece.y++; score++; grav = 0; hud(); return true; }
    function rotate(cw){
      if(state !== 'run' || piece.type === 'O') return;
      var m = rotM(piece.m, cw);
      for(var i = 0; i < KICKS.length; i++){
        var k = KICKS[i];
        if(!hits(piece, k[0], k[1], m)){ piece.m = m; piece.x += k[0]; piece.y += k[1]; touched(); return; }
      }
    }
    function drop(){
      if(state !== 'run') return;
      var n = 0; while(!hits(piece, 0, 1)){ piece.y++; n++; }
      score += n * 2; lock();
    }
    function swapHold(){
      if(state !== 'run' || !canHold) return;
      var t = piece.type;
      if(hold){ var h = hold; hold = t; spawn(h); } else { hold = t; spawn(); }
      canHold = false; drawSide();
    }
    function lock(){
      piece.m.forEach(function(row, r){ row.forEach(function(v, c){ if(v && piece.y + r >= 0) board[piece.y + r][piece.x + c] = SHAPES[piece.type].c; }); });
      var full = []; for(var r = 0; r < ROWS; r++) if(board[r].every(Boolean)) full.push(r);
      if(full.length){
        flashRows = full; flashT = 130; state = 'clear'; piece = null;
        score += [0, 100, 300, 500, 800][full.length] * level; lines += full.length;
        level = Math.floor(lines / 10) + 1;
      } else spawn();
      hud();
    }
    function finishClear(){
      flashRows.slice().sort(function(a, b){ return b - a; }).forEach(function(r){ board.splice(r, 1); board.unshift(Array(COLS).fill(0)); });
      flashRows = []; state = 'run'; spawn();
    }
    function hud(){
      $('#tet-score').textContent = 'SCORE ' + score; $('#tet-lines').textContent = 'LINES ' + lines; $('#tet-level').textContent = 'LEVEL ' + level;
      if(score > best){ best = score; lsSet('vs-tetris-best', best); $('#tet-best').textContent = 'BEST ' + best; }
    }
    function over(){
      state = 'over'; piece = null; stop(); draw();
      $('#tet-start').textContent = 'Play again'; $('#tet-pause').disabled = true;
      notify('Tetris — game over, score ' + score, 'warn');
    }

    /* ---- drawing ---- */
    function cell(c, x, y, s, color, a){
      c.globalAlpha = a == null ? 1 : a; c.fillStyle = color; c.fillRect(x + 1, y + 1, s - 2, s - 2);
      c.fillStyle = 'rgba(255,255,255,.22)'; c.fillRect(x + 1, y + 1, s - 2, Math.max(2, s * .14));
      c.fillStyle = 'rgba(0,0,0,.22)'; c.fillRect(x + 1, y + s - 1 - Math.max(2, s * .14), s - 2, Math.max(2, s * .14));
      c.globalAlpha = 1;
    }
    function ghostY(){ var n = 0; while(!hits(piece, 0, n + 1)) n++; return piece.y + n; }
    function draw(){
      if(!board) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = css('--surface-1', '#101014'); ctx.fillRect(0, 0, COLS * CELL, ROWS * CELL);
      ctx.strokeStyle = 'rgba(128,128,128,.12)'; ctx.lineWidth = 1; ctx.beginPath();
      for(var x = 1; x < COLS; x++){ ctx.moveTo(x * CELL + .5, 0); ctx.lineTo(x * CELL + .5, ROWS * CELL); }
      for(var y = 1; y < ROWS; y++){ ctx.moveTo(0, y * CELL + .5); ctx.lineTo(COLS * CELL, y * CELL + .5); }
      ctx.stroke();
      board.forEach(function(row, r){ row.forEach(function(v, c){ if(v) cell(ctx, c * CELL, r * CELL, CELL, v); }); });
      if(piece){
        var gy = ghostY();
        piece.m.forEach(function(row, r){ row.forEach(function(v, c){
          if(!v) return;
          ctx.strokeStyle = SHAPES[piece.type].c; ctx.globalAlpha = .5; ctx.lineWidth = 2;
          ctx.strokeRect((piece.x + c) * CELL + 2, (gy + r) * CELL + 2, CELL - 4, CELL - 4); ctx.globalAlpha = 1;
        }); });
        piece.m.forEach(function(row, r){ row.forEach(function(v, c){ if(v && piece.y + r >= 0) cell(ctx, (piece.x + c) * CELL, (piece.y + r) * CELL, CELL, SHAPES[piece.type].c); }); });
      }
      flashRows.forEach(function(r){ ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.fillRect(0, r * CELL, COLS * CELL, CELL); });
      if(state === 'idle' || state === 'over' || state === 'pause'){
        ctx.fillStyle = state === 'pause' ? 'rgba(0,0,0,.55)' : 'rgba(0,0,0,.35)'; ctx.fillRect(0, 0, COLS * CELL, ROWS * CELL);
        ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = '700 ' + Math.round(CELL * .8) + 'px ' + css('--font-ui', 'sans-serif');
        ctx.fillText(state === 'over' ? 'GAME OVER' : state === 'pause' ? 'PAUSED' : 'TETRIS', COLS * CELL / 2, ROWS * CELL / 2 - 4);
        ctx.font = Math.round(CELL * .46) + 'px ' + css('--font-mono', 'monospace'); ctx.fillStyle = '#ddd';
        ctx.fillText(state === 'pause' ? 'P or Esc to resume' : 'Enter to ' + (state === 'over' ? 'play again' : 'start'), COLS * CELL / 2, ROWS * CELL / 2 + CELL * .8);
      }
    }
    function mini(c, cv, types, per){
      var s = cv._s || 16; c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.fillStyle = css('--surface-1', '#101014'); c.fillRect(0, 0, cv.width / dpr, cv.height / dpr);
      types.forEach(function(t, i){
        if(!t) return;
        var m = SHAPES[t].m, minR = 9, maxR = 0, minC = 9, maxC = 0;
        m.forEach(function(row, r){ row.forEach(function(v, cc){ if(v){ minR = Math.min(minR, r); maxR = Math.max(maxR, r); minC = Math.min(minC, cc); maxC = Math.max(maxC, cc); } }); });
        var w = (maxC - minC + 1) * s, h = (maxR - minR + 1) * s, ox = (4 * s - w) / 2, oy = i * per * s + ((per * s) - h) / 2;
        m.forEach(function(row, r){ row.forEach(function(v, cc){ if(v) cell(c, ox + (cc - minC) * s, oy + (r - minR) * s, s, SHAPES[t].c, (t === hold && !canHold && c === hctx) ? .35 : 1); }); });
      });
    }
    function drawSide(){ mini(hctx, holdC, [hold], 3); mini(nctx, nextC, queue.slice(0, 3), 3); }

    /* ---- loop, with key-repeat of our own so holding ← → feels crisp ---- */
    var held = {left: 0, right: 0, down: 0};   // time each direction has been held (ms), 0 = not held
    var DAS = 150, ARR = 38, repeat = {left: 0, right: 0};
    function frame(now){
      raf = requestAnimationFrame(frame);
      var dt = Math.min(now - last, 100); last = now;
      if(state === 'clear'){ flashT -= dt; if(flashT <= 0) finishClear(); draw(); return; }
      if(state !== 'run') return;
      ['left', 'right'].forEach(function(k){
        if(!held[k]) return;
        held[k] += dt;
        if(held[k] > DAS){ repeat[k] += dt; while(repeat[k] >= ARR){ repeat[k] -= ARR; if(!move(k === 'left' ? -1 : 1)) break; } }
      });
      var gms = Math.max(50, 780 * Math.pow(.82, level - 1));
      if(held.down){ held.down += dt; grav += dt * 18; } else grav += dt;
      while(grav >= gms){ grav -= gms; if(!grounded()) { piece.y++; if(held.down) score++; } else break; }
      if(grounded()){ lockT += dt; if(lockT >= 450){ lock(); } } else lockT = 0;
      draw();
    }
    function run(){ if(!raf){ last = performance.now(); raf = requestAnimationFrame(frame); } }
    function stop(){ if(raf){ cancelAnimationFrame(raf); raf = null; } }

    function start(){
      board = Array.from({length:ROWS}, function(){ return Array(COLS).fill(0); });
      queue = []; bag = []; hold = null; score = 0; lines = 0; level = 1; flashRows = [];
      held = {left: 0, right: 0, down: 0}; repeat = {left: 0, right: 0};
      while(queue.length < 5) queue.push(take());
      state = 'run'; hud(); $('#tet-start').textContent = 'Restart'; $('#tet-pause').disabled = false; $('#tet-pause').textContent = 'Pause';
      spawn(); drawSide(); stop(); run(); draw();
    }
    function pause(){
      if(state === 'run'){ state = 'pause'; $('#tet-pause').textContent = 'Resume'; draw(); }
      else if(state === 'pause'){ state = 'run'; last = performance.now(); $('#tet-pause').textContent = 'Pause'; }
    }

    /* ---- input ---- */
    var KEY = {ArrowLeft:'left', a:'left', A:'left', ArrowRight:'right', d:'right', D:'right', ArrowDown:'down', s:'down', S:'down'};
    function keydown(e){
      var tag = e.target && e.target.tagName;
      if(tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if(e.ctrlKey || e.metaKey || e.altKey) return;
      var k = e.key, dirn = KEY[k];
      if(k === 'Enter' && (state === 'idle' || state === 'over')){ e.preventDefault(); start(); return; }
      if(k === 'n' || k === 'N'){ e.preventDefault(); start(); return; }
      if(k === 'p' || k === 'P' || k === 'Escape'){ if(state === 'run' || state === 'pause'){ e.preventDefault(); pause(); } return; }
      if(state !== 'run') return;
      if(dirn || k === ' ' || k === 'ArrowUp' || k === 'w' || k === 'W' || k === 'x' || k === 'X' || k === 'z' || k === 'Z' || k === 'r' || k === 'R' || k === 'c' || k === 'C' || k === 'Shift') e.preventDefault();
      if(e.repeat) return;
      if(dirn === 'left'){ held.left = 1; repeat.left = 0; held.right = 0; move(-1); }
      else if(dirn === 'right'){ held.right = 1; repeat.right = 0; held.left = 0; move(1); }
      else if(dirn === 'down'){ held.down = 1; soft(); }
      else if(k === ' ') drop();
      else if(k === 'ArrowUp' || k === 'w' || k === 'W' || k === 'x' || k === 'X' || k === 'r' || k === 'R') rotate(true);
      else if(k === 'z' || k === 'Z') rotate(false);
      else if(k === 'c' || k === 'C' || k === 'Shift') swapHold();
      draw();
    }
    function keyup(e){ var d = KEY[e.key]; if(d) held[d] = 0; }
    document.addEventListener('keydown', keydown); document.addEventListener('keyup', keyup);
    window.addEventListener('blur', function(){ held = {left: 0, right: 0, down: 0}; if(state === 'run') pause(); });

    /* touch buttons: hold ◀ ▶ ▼ to repeat */
    function act(a, on){
      if(state !== 'run') return;
      if(a === 'left'){ held.left = on ? 1 : 0; repeat.left = 0; if(on) move(-1); }
      else if(a === 'right'){ held.right = on ? 1 : 0; repeat.right = 0; if(on) move(1); }
      else if(a === 'down'){ held.down = on ? 1 : 0; if(on) soft(); }
      else if(!on) return;
      else if(a === 'rot') rotate(true); else if(a === 'drop') drop(); else if(a === 'hold') swapHold();
      draw();
    }
    qsa2(body, '#tet-touch button').forEach(function(b){
      var a = b.getAttribute('data-a');
      b.addEventListener('pointerdown', function(e){ e.preventDefault(); if(state === 'idle' || state === 'over'){ start(); return; } act(a, true); });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach(function(t){ b.addEventListener(t, function(){ act(a, false); }); });
    });
    canvas.addEventListener('pointerdown', function(){ if(state === 'idle' || state === 'over') start(); });
    $('#tet-start').addEventListener('click', start); $('#tet-pause').addEventListener('click', pause);
    onUnmount(canvas, function(){ document.removeEventListener('keydown', keydown); document.removeEventListener('keyup', keyup); stop(); });

    board = Array.from({length:ROWS}, function(){ return Array(COLS).fill(0); });
    fit(); drawSide();
  });
}
PLAYABLES['tetris'] = mountTetris;

/* ==================================================================
   games / wordle
   ================================================================== */
/* WORDLE — green/orange tiles, flip + shake + win animations,
   length/guess selectors, hard mode, custom word, persisted stats */
function mountWordle(container){
  mountEmbed(container, 'PLAY / WORDLE', function(body){
    var WORD_BANK = {
      4:['FIRE','WORD','GAME','CODE','BYTE','CHIP','DISK','PORT','SYNC','GRID','NODE','LOOP','HASH','FLAG','HEAP','BOOT'],
      5:['GAMES','CODES','BYTES','CHIPS','GRIDS','NODES','LOOPS','TORCH','SWORD','MAGIC','CRAFT','TRICK','STORM','CRANE','SNAKE','PIXEL','SONIC','BRAVE','GHOST','PRISM','STACK','QUEUE','PARSE','CACHE','FETCH','PATCH','DEBUG','FRAME','LOGIC','QUERY','SHIFT','SCOPE','CLASS','TOKEN','REGEX','INDEX','ROUTE','BUILD','LIMIT','CLICK'],
      6:['POWERS','CODING','GAMING','SYSTEM','PURPLE','ENTITY','MATRIX','BINARY','SIGNAL','DRIVER','KERNEL','SERVER','ROUTER','BUFFER','SHADER','COMMIT','BRANCH','DEPLOY','SOCKET','THREAD','PACKET','CIPHER','HEADER','SYNTAX','OBJECT','LAMBDA','STATIC','IMPORT','EXPORT'],
      7:['CONSOLE','MONITOR','NETWORK','HACKING','MODULES','CACHING','THREADS','PACKETS','BOOLEAN','INTEGER','POINTER','VIRTUAL','RUNTIME','COMPILE','PAYLOAD','ENCRYPT','LIBRARY','PROMISE','PROXIES'],
    };
    var cfg = gameSettings('wordle', {len:5, guesses:6, hard:false});
    var stats = lsGet('vs-wordle-stats', {wins:0, streak:0, best:0, played:0});

    body.innerHTML =
      '<div class="snake-wrap">'+
        '<div class="tool-row" style="justify-content:center">'+
          '<label>Length <select id="wd-len" class="cat-sort-select" style="width:auto">'+
            [4,5,6,7].map(function(n){return '<option value="'+n+'"'+(cfg.len===n?' selected':'')+'>'+n+'</option>';}).join('')+
          '</select></label>'+
          '<label>Guesses <select id="wd-guesses" class="cat-sort-select" style="width:auto">'+
            [4,6,8].map(function(n){return '<option value="'+n+'"'+(cfg.guesses===n?' selected':'')+'>'+n+'</option>';}).join('')+
          '</select></label>'+
          '<label><input type="checkbox" id="wd-hard"'+(cfg.hard?' checked':'')+'> Hard mode</label>'+
          '<button class="game-btn" id="wd-new">New word</button>'+
        '</div>'+
        '<div class="tool-row" style="justify-content:center">'+
          '<input type="text" id="wd-custom" placeholder="Set a custom word (optional)" style="width:230px">'+
          '<button class="game-btn secondary" id="wd-setcustom">Use word</button>'+
        '</div>'+
        '<div class="tool-row" style="justify-content:center;font:11px var(--font-mono);color:var(--muted)">'+
          '<span><i style="display:inline-block;width:11px;height:11px;background:#16a34a;vertical-align:-1px;margin-right:5px"></i>Right spot</span>'+
          '<span><i style="display:inline-block;width:11px;height:11px;background:#d97706;vertical-align:-1px;margin-right:5px"></i>Wrong spot</span>'+
          '<span><i style="display:inline-block;width:11px;height:11px;background:#4b5563;vertical-align:-1px;margin-right:5px"></i>Not in word</span>'+
        '</div>'+
        '<div id="wd-grid" style="display:flex;flex-direction:column;gap:6px"></div>'+
        '<div id="wd-msg" class="tool-msg" style="min-height:18px"></div>'+
        '<div id="wd-keyboard" style="display:flex;flex-direction:column;gap:6px;align-items:center"></div>'+
        '<div class="snake-hud">'+
          '<span id="wd-wins">WINS '+stats.wins+'</span>'+
          '<span id="wd-streak">STREAK '+stats.streak+'</span>'+
          '<span id="wd-best">BEST '+(stats.best||0)+'</span>'+
          '<span id="wd-played">PLAYED '+stats.played+'</span>'+
        '</div>'+
      '</div>';

    var target, guesses, current, keyState, LEN, MAX, locked=false, customWord=null;

    function saveStats(){ lsSet('vs-wordle-stats', stats); }
    function refreshStats(){
      body.querySelector('#wd-wins').textContent='WINS '+stats.wins;
      body.querySelector('#wd-streak').textContent='STREAK '+stats.streak;
      body.querySelector('#wd-best').textContent='BEST '+(stats.best||0);
      body.querySelector('#wd-played').textContent='PLAYED '+stats.played;
    }
    function start(){
      LEN = parseInt(body.querySelector('#wd-len').value,10);
      MAX = parseInt(body.querySelector('#wd-guesses').value,10);
      cfg.len=LEN; cfg.guesses=MAX; cfg.hard=body.querySelector('#wd-hard').checked; cfg._save();
      if(customWord && customWord.length===LEN){ target = customWord; customWord = null; }
      else { var pool=WORD_BANK[LEN]; target = pool[Math.floor(Math.random()*pool.length)]; }
      guesses=[]; current=''; keyState={}; locked=false;
      body.querySelector('#wd-msg').textContent='';
      renderGrid(); renderKeyboard();
    }
    function renderGrid(){
      var g = body.querySelector('#wd-grid');
      g.innerHTML='';
      for(var r=0;r<MAX;r++){
        var row=document.createElement('div');
        row.className='wd-row'; row.style.cssText='display:flex;gap:6px';
        var entry = guesses[r];
        var word = entry ? entry.word : (r===guesses.length ? current : '');
        for(var c=0;c<LEN;c++){
          var cell=document.createElement('div');
          cell.className='wd-cell'+(entry?' '+entry.marks[c]:'')+(!entry&&word[c]?' filled':'');
          cell.textContent = word[c]||'';
          row.appendChild(cell);
        }
        g.appendChild(row);
      }
    }
    function renderKeyboard(){
      var rows=['QWERTYUIOP','ASDFGHJKL','ZXCVBNM'];
      var kb=body.querySelector('#wd-keyboard'); kb.innerHTML='';
      rows.forEach(function(rowStr,ri){
        var rd=document.createElement('div'); rd.style.cssText='display:flex;gap:5px;justify-content:center';
        if(ri===2){
          var ent=document.createElement('button'); ent.className='wd-key wide'; ent.textContent='ENTER';
          ent.addEventListener('click', submit); rd.appendChild(ent);
        }
        rowStr.split('').forEach(function(ch){
          var b=document.createElement('button');
          b.className='wd-key'+(keyState[ch]?' '+keyState[ch]:'');
          b.textContent=ch;
          b.addEventListener('click', function(){ typeChar(ch); });
          rd.appendChild(b);
        });
        if(ri===2){
          var bk=document.createElement('button'); bk.className='wd-key wide'; bk.textContent='⌫';
          bk.addEventListener('click', backspace); rd.appendChild(bk);
        }
        kb.appendChild(rd);
      });
    }
    function currentRowEl(){ return body.querySelectorAll('#wd-grid .wd-row')[guesses.length]; }
    function typeChar(ch){
      if(locked || guesses.length>=MAX) return;
      if(current.length>=LEN) return;
      current+=ch;
      renderGrid();
      var row=currentRowEl();
      if(row){ var cell=row.children[current.length-1]; cell.classList.add('typed'); }
    }
    function backspace(){ if(locked) return; current=current.slice(0,-1); renderGrid(); }
    function shakeRow(msg){
      body.querySelector('#wd-msg').textContent=msg;
      var row=currentRowEl();
      if(row){ row.classList.remove('shake'); void row.offsetWidth; row.classList.add('shake'); }
    }
    function hardModeError(){
      // Hard mode: every revealed hint must be reused in the next guess.
      if(!body.querySelector('#wd-hard').checked || !guesses.length) return null;
      var last = guesses[guesses.length-1];
      for(var i=0;i<LEN;i++){
        if(last.marks[i]==='correct' && current[i]!==last.word[i])
          return 'Hard mode: position '+(i+1)+' must be '+last.word[i];
      }
      for(i=0;i<LEN;i++){
        if(last.marks[i]==='present' && current.indexOf(last.word[i])===-1)
          return 'Hard mode: guess must contain '+last.word[i];
      }
      return null;
    }
    function scoreGuess(guess){
      // Two-pass so duplicate letters are marked the way real Wordle does.
      var marks = new Array(LEN).fill('absent');
      var pool = target.split('');
      for(var i=0;i<LEN;i++) if(guess[i]===target[i]){ marks[i]='correct'; pool[i]=null; }
      for(i=0;i<LEN;i++){
        if(marks[i]==='correct') continue;
        var idx = pool.indexOf(guess[i]);
        if(idx>-1){ marks[i]='present'; pool[idx]=null; }
      }
      return marks;
    }
    function submit(){
      if(locked || guesses.length>=MAX) return;
      if(current.length!==LEN){ shakeRow('Not enough letters'); return; }
      var hardErr = hardModeError();
      if(hardErr){ shakeRow(hardErr); return; }
      var marks = scoreGuess(current);
      var guessWord = current;
      guesses.push({word:guessWord, marks:marks});
      current=''; locked=true;
      renderGrid();
      // staggered flip reveal
      var rowEl = body.querySelectorAll('#wd-grid .wd-row')[guesses.length-1];
      var motionOn = document.documentElement.dataset.motion !== 'off';
      var step = motionOn ? 260 : 0;
      for(var i=0;i<LEN;i++){
        (function(i){
          setTimeout(function(){
            var cell=rowEl.children[i];
            if(cell) cell.classList.add('reveal');
          }, i*step);
        })(i);
      }
      setTimeout(function(){
        guessWord.split('').forEach(function(ch,i){
          var m=marks[i];
          if(m==='correct') keyState[ch]='correct';
          else if(m==='present' && keyState[ch]!=='correct') keyState[ch]='present';
          else if(!keyState[ch]) keyState[ch]='absent';
        });
        renderKeyboard();
        locked=false;
        var won = guessWord===target;
        if(won){
          stats.wins++; stats.streak++; stats.played++;
          if(stats.streak>(stats.best||0)) stats.best=stats.streak;
          saveStats(); refreshStats();
          body.querySelector('#wd-msg').textContent='Solved in '+guesses.length+' guess'+(guesses.length>1?'es':'')+'!';
          if(motionOn){
            var wr=body.querySelectorAll('#wd-grid .wd-row')[guesses.length-1];
            Array.prototype.forEach.call(wr.children, function(cell,i){
              setTimeout(function(){ cell.classList.add('win'); }, i*90);
            });
          }
          notify('Wordle solved in '+guesses.length+'!','ok');
          locked=true;
        } else if(guesses.length>=MAX){
          stats.streak=0; stats.played++; saveStats(); refreshStats();
          body.querySelector('#wd-msg').textContent='Out of guesses — the word was '+target;
          notify('Wordle — the word was '+target,'warn');
          locked=true;
        }
      }, LEN*step + (motionOn?260:0));
    }
    function keyHandler(e){
      if(e.target.tagName==='INPUT') return;
      if(/^[a-zA-Z]$/.test(e.key)) typeChar(e.key.toUpperCase());
      else if(e.key==='Enter') submit();
      else if(e.key==='Backspace') backspace();
    }
    document.addEventListener('keydown', keyHandler);
    body.querySelector('#wd-new').addEventListener('click', start);
    body.querySelector('#wd-len').addEventListener('change', start);
    body.querySelector('#wd-guesses').addEventListener('change', start);
    body.querySelector('#wd-hard').addEventListener('change', function(){ cfg.hard=this.checked; cfg._save(); });
    body.querySelector('#wd-setcustom').addEventListener('click', function(){
      var w = body.querySelector('#wd-custom').value.trim().toUpperCase().replace(/[^A-Z]/g,'');
      if(!w){ notify('Enter a word first','warn'); return; }
      body.querySelector('#wd-len').value = String(w.length);
      if(!WORD_BANK[w.length]){ notify('Word must be 4–7 letters','err'); return; }
      customWord = w;
      body.querySelector('#wd-custom').value='';
      start();
      notify('Custom word set','ok');
    });
    start();
    onUnmount(body, function(){ document.removeEventListener('keydown', keyHandler); });
  });
}
PLAYABLES['wordle'] = mountWordle;

/* ---------- start the one this page is for ---------- */
(function(){
  var id = document.body.getAttribute('data-id'), slot = document.getElementById('embed-slot');
  if(slot && PLAYABLES[id]) PLAYABLES[id](slot);
})();
