// tools/stopwatch.js — loaded by tools/stopwatch.html. Shared helpers come from assets/js/play.js.

/* ---------------- Stopwatch ---------------- */
function mountStopwatch(container){
  mountEmbed(container, 'TOOL / STOPWATCH', function(body){
    body.innerHTML =
      '<div class="tool-output" id="sw-time" style="text-align:center;font-size:32px;font-weight:bold">00:00.000</div>'+
      '<div class="tool-row"><button class="game-btn" id="sw-toggle">Start</button><button class="game-btn secondary" id="sw-lap" disabled>Lap</button><button class="game-btn secondary" id="sw-reset">Reset</button></div>'+
      '<div id="sw-laps" style="font:11px monospace"></div>';
    var running=false, startTime=0, offset=0, laps=[], raf;
    var timeEl = body.querySelector('#sw-time');
    function fmt(ms){
      var m=Math.floor(ms/60000), s=Math.floor((ms%60000)/1000), cs=Math.floor(ms%1000);
      return String(m).padStart(2,'0')+':'+String(s).padStart(2,'0')+'.'+String(cs).padStart(3,'0');
    }
    function tick(){
      if(!running) return;
      timeEl.textContent = fmt(offset + (Date.now()-startTime));
      raf = requestAnimationFrame(tick);
    }
    body.querySelector('#sw-toggle').addEventListener('click', function(){
      if(running){ running=false; offset += Date.now()-startTime; cancelAnimationFrame(raf); this.textContent='Resume'; body.querySelector('#sw-lap').disabled=true; }
      else { running=true; startTime=Date.now(); this.textContent='Stop'; body.querySelector('#sw-lap').disabled=false; tick(); }
    });
    body.querySelector('#sw-lap').addEventListener('click', function(){
      if(!running) return;
      var total = offset + (Date.now()-startTime);
      laps.push(total);
      body.querySelector('#sw-laps').innerHTML = laps.slice().reverse().map(function(l,i){ return '<div>Lap '+(laps.length-i)+' — '+fmt(l)+'</div>'; }).join('');
    });
    body.querySelector('#sw-reset').addEventListener('click', function(){
      running=false; cancelAnimationFrame(raf); offset=0; laps=[];
      timeEl.textContent='00:00.000';
      body.querySelector('#sw-toggle').textContent='Start';
      body.querySelector('#sw-lap').disabled=true;
      body.querySelector('#sw-laps').innerHTML='';
    });
  });
}

mountStopwatch(document.getElementById('embed-slot'));
