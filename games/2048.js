// games/2048.js — loaded by games/2048.html. Shared helpers come from assets/js/play.js.

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
    var tx=0,ty=0;
    boardEl.addEventListener('touchstart', function(e){ tx=e.touches[0].clientX; ty=e.touches[0].clientY; }, {passive:true});
    boardEl.addEventListener('touchend', function(e){
      var dx=e.changedTouches[0].clientX-tx, dy=e.changedTouches[0].clientY-ty;
      if(Math.abs(dx)<24 && Math.abs(dy)<24) return;
      if(Math.abs(dx)>Math.abs(dy)) move(dx>0?'right':'left'); else move(dy>0?'down':'up');
    }, {passive:true});
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

mount2048(document.getElementById('embed-slot'));
