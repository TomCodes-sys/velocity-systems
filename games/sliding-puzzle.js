// games/sliding-puzzle.js — loaded by games/sliding-puzzle.html. Shared helpers come from assets/js/play.js.

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

mountSliding(document.getElementById('embed-slot'));
