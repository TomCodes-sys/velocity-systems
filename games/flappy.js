// games/flappy.js — loaded by games/flappy.html. Shared helpers come from assets/js/play.js.

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
      if(state==='idle'){ ctx.font='16px sans-serif'; ctx.fillStyle='#a78bfa'; ctx.fillText('Click or Space to start', W/2, H/2); }
      if(state==='dead'){ ctx.font='bold 18px sans-serif'; ctx.fillStyle='#ff8f97'; ctx.fillText('GAME OVER — click to retry', W/2, H/2); }
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

mountFlappy(document.getElementById('embed-slot'));
