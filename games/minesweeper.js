// games/minesweeper.js — loaded by games/minesweeper.html. Shared helpers come from assets/js/play.js.

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
    function renderAll(){
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

mountMinesweeper(document.getElementById('embed-slot'));
