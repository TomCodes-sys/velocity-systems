// games/tetris.js — loaded by games/tetris.html. Shared helpers come from assets/js/play.js.

/* TETRIS */
function mountTetris(container){
  mountEmbed(container, 'PLAY / TETRIS', function(body){
    body.innerHTML =
      '<div class="snake-wrap">'+
        '<div class="snake-hud"><span id="tet-score">SCORE 0</span><span id="tet-lines">LINES 0</span><span id="tet-level">LEVEL 1</span><span id="tet-best">BEST 0</span></div>'+
        '<div style="display:flex;gap:16px;align-items:flex-start">'+
          '<canvas id="tet-canvas" width="200" height="400"></canvas>'+
          '<div><div class="tool-msg">Next</div><canvas id="tet-next" width="80" height="80"></canvas></div>'+
        '</div>'+
        '<div class="tool-row"><button class="game-btn secondary" id="tet-start">Start</button><button class="game-btn secondary" id="tet-pause" disabled>Pause</button></div>'+
        '<span class="tool-msg">← → move · ↑ rotate · ↓ soft drop · Space hard drop · P pause</span>'+
      '</div>';
    var canvas = body.querySelector('#tet-canvas'), ctx = canvas.getContext('2d');
    var nextCanvas = body.querySelector('#tet-next'), nctx = nextCanvas.getContext('2d');
    var COLS=10, ROWS=20, SZ=20;
    var PIECES = [
      {shape:[[1,1,1,1]], color:'#3b82f6'},
      {shape:[[1,1],[1,1]], color:'#fbbf24'},
      {shape:[[0,1,0],[1,1,1]], color:'#9b7bff'},
      {shape:[[0,1,1],[1,1,0]], color:'#36c979'},
      {shape:[[1,1,0],[0,1,1]], color:'#ff535e'},
      {shape:[[1,0,0],[1,1,1]], color:'#f97316'},
      {shape:[[0,0,1],[1,1,1]], color:'#22d3ee'},
    ];
    var board, piece, next, score, lines, level, running, paused, dropTimer;
    var best = lsGet('vs-tetris-best',0);
    body.querySelector('#tet-best').textContent='BEST '+best;

    function randomPiece(){ var p=PIECES[Math.floor(Math.random()*PIECES.length)]; return {shape:p.shape.map(function(r){return r.slice();}), color:p.color, x:3, y:0}; }
    function collides(p){
      return p.shape.some(function(row,r){ return row.some(function(v,c){
        if(!v) return false;
        var nx=p.x+c, ny=p.y+r;
        return ny>=ROWS||nx<0||nx>=COLS||(ny>=0 && board[ny][nx]);
      }); });
    }
    function spawn(){ piece = next || randomPiece(); next = randomPiece(); drawNext(); if(collides(piece)) gameOver(); }
    function moveH(dx){ piece.x+=dx; if(collides(piece)) piece.x-=dx; }
    function moveDown(){ piece.y++; if(collides(piece)){ piece.y--; lock(); return false; } return true; }
    function hardDrop(){ while(!collides(piece)) piece.y++; piece.y--; lock(); }
    function rotate(){
      var orig=piece.shape, rows=orig.length, cols=orig[0].length;
      var rot=[];
      for(var c=0;c<cols;c++){ var row=[]; for(var r=rows-1;r>=0;r--) row.push(orig[r][c]); rot.push(row); }
      var old=piece.shape; piece.shape=rot;
      var kicks=[0,-1,1,-2,2], ok=false;
      for(var k=0;k<kicks.length;k++){ piece.x+=kicks[k]; if(!collides(piece)){ ok=true; break; } piece.x-=kicks[k]; }
      if(!ok) piece.shape=old;
    }
    function lock(){
      piece.shape.forEach(function(row,r){ row.forEach(function(v,c){ if(v && piece.y+r>=0) board[piece.y+r][piece.x+c]=piece.color; }); });
      var cleared=0;
      for(var r=ROWS-1;r>=0;){
        if(board[r].every(function(c){return c;})){ board.splice(r,1); board.unshift(Array(COLS).fill(0)); cleared++; }
        else r--;
      }
      if(cleared){
        score += [0,100,300,500,800][cleared]*level;
        lines += cleared; level = Math.floor(lines/10)+1;
        body.querySelector('#tet-score').textContent='SCORE '+score;
        body.querySelector('#tet-lines').textContent='LINES '+lines;
        body.querySelector('#tet-level').textContent='LEVEL '+level;
        if(score>best){ best=score; lsSet('vs-tetris-best',best); body.querySelector('#tet-best').textContent='BEST '+best; }
        restartDropTimer();
      }
      spawn();
    }
    function gameOver(){ running=false; clearInterval(dropTimer); body.querySelector('#tet-start').textContent='Play again'; body.querySelector('#tet-pause').disabled=true; draw(); notify('Tetris — game over, score '+score,'warn'); }
    function ghostPiece(){
      var g = {x:piece.x, y:piece.y, shape:piece.shape};
      while(!collides({x:g.x, y:g.y+1, shape:g.shape})) g.y++;
      return g;
    }
    function draw(){
      var css = getComputedStyle(document.documentElement);
      ctx.fillStyle = css.getPropertyValue('--surface-1').trim()||'#101014';
      ctx.fillRect(0,0,canvas.width,canvas.height);
      board.forEach(function(row,r){ row.forEach(function(v,c){ if(v){ ctx.fillStyle=v; ctx.fillRect(c*SZ+1,r*SZ+1,SZ-2,SZ-2); } }); });
      if(piece){
        var ghost = ghostPiece();
        ghost.shape.forEach(function(row,r){ row.forEach(function(v,c){ if(v){ ctx.fillStyle='rgba(255,255,255,.08)'; ctx.fillRect((ghost.x+c)*SZ+1,(ghost.y+r)*SZ+1,SZ-2,SZ-2); } }); });
        piece.shape.forEach(function(row,r){ row.forEach(function(v,c){ if(v){ ctx.fillStyle=piece.color; ctx.fillRect((piece.x+c)*SZ+1,(piece.y+r)*SZ+1,SZ-2,SZ-2); } }); });
      }
      if(!running){ ctx.fillStyle=css.getPropertyValue('--text').trim()||'#fff'; ctx.font='bold 14px sans-serif'; ctx.textAlign='center'; ctx.fillText(score?'GAME OVER':'Press Start', canvas.width/2, canvas.height/2); }
      if(paused){ ctx.fillStyle='rgba(0,0,0,.6)'; ctx.fillRect(0,0,canvas.width,canvas.height); ctx.fillStyle='#fff'; ctx.font='bold 16px sans-serif'; ctx.textAlign='center'; ctx.fillText('PAUSED', canvas.width/2, canvas.height/2); }
    }
    function drawNext(){
      var css=getComputedStyle(document.documentElement);
      nctx.fillStyle=css.getPropertyValue('--surface-1').trim()||'#101014'; nctx.fillRect(0,0,80,80);
      if(!next) return;
      var s=16, rows=next.shape.length, cols=next.shape[0].length;
      var ox=Math.floor((80-cols*s)/2), oy=Math.floor((80-rows*s)/2);
      next.shape.forEach(function(row,r){ row.forEach(function(v,c){ if(v){ nctx.fillStyle=next.color; nctx.fillRect(ox+c*s+1,oy+r*s+1,s-2,s-2); } }); });
    }
    function tick(){ if(!running||paused) return; moveDown(); draw(); }
    function restartDropTimer(){ clearInterval(dropTimer); dropTimer=setInterval(tick, Math.max(100, 550-level*40)); }
    function start(){
      board = Array.from({length:ROWS}, function(){ return Array(COLS).fill(0); });
      score=0; lines=0; level=1; running=true; paused=false;
      body.querySelector('#tet-score').textContent='SCORE 0';
      body.querySelector('#tet-lines').textContent='LINES 0';
      body.querySelector('#tet-level').textContent='LEVEL 1';
      body.querySelector('#tet-start').textContent='Restart';
      body.querySelector('#tet-pause').disabled=false; body.querySelector('#tet-pause').textContent='Pause';
      next=null; spawn(); draw(); restartDropTimer();
    }
    function togglePause(){
      if(!running) return;
      paused=!paused;
      body.querySelector('#tet-pause').textContent = paused?'Resume':'Pause';
      draw();
    }
    function keyHandler(e){
      if(e.key==='r'||e.key==='R'){ start(); return; }
      if(!running || paused){ if(e.key==='p'||e.key==='P') togglePause(); return; }
      if(e.key==='ArrowLeft'||e.key==='a'){ e.preventDefault(); moveH(-1); }
      else if(e.key==='ArrowRight'||e.key==='d'){ e.preventDefault(); moveH(1); }
      else if(e.key==='ArrowDown'||e.key==='s'){ e.preventDefault(); moveDown(); }
      else if(e.key==='ArrowUp'||e.key==='w'){ e.preventDefault(); rotate(); }
      else if(e.key===' '){ e.preventDefault(); hardDrop(); }
      else if(e.key==='p'||e.key==='P'){ togglePause(); }
      draw();
    }
    document.addEventListener('keydown', keyHandler);
    body.querySelector('#tet-start').addEventListener('click', start);
    body.querySelector('#tet-pause').addEventListener('click', togglePause);
    board = Array.from({length:ROWS}, function(){ return Array(COLS).fill(0); });
    running=false; draw();
    onUnmount(canvas, function(){ document.removeEventListener('keydown', keyHandler); clearInterval(dropTimer); });
  });
}

mountTetris(document.getElementById('embed-slot'));
