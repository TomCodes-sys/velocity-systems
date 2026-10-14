// games/simon.js — loaded by games/simon.html. Shared helpers come from assets/js/play.js.

/* SIMON SAYS */
function mountSimon(container){
  mountEmbed(container, 'PLAY / SIMON SAYS', function(body){
    var COLORS = ['#ff535e','#36c979','#3b82f6','#fbbf24'];
    var FREQS = [329,415,261,392];
    body.innerHTML =
      '<div class="snake-wrap">'+
        '<div class="snake-hud"><span id="si-round">ROUND 0</span><span id="si-best">BEST 0</span><span id="si-streak">STREAK 0</span></div>'+
        '<div class="tool-row" id="si-speeds"></div>'+
        '<div id="si-board" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;width:220px;height:220px"></div>'+
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
      b.addEventListener('click', function(){ press(i); });
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

mountSimon(document.getElementById('embed-slot'));
