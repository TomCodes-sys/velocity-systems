// tools/pomodoro.js — loaded by tools/pomodoro.html. Shared helpers come from assets/js/play.js.

/* ---------------- Pomodoro ---------------- */
function mountPomodoro(container){
  mountEmbed(container, 'TOOL / POMODORO', function(body){
    body.innerHTML =
      '<div class="tool-output" id="pom-display" style="text-align:center;font-size:36px;font-weight:bold">25:00</div>'+
      '<div class="tool-msg" id="pom-phase" style="text-align:center">Focus</div>'+
      '<div class="tool-row" style="justify-content:center"><button class="game-btn" id="pom-toggle">Start</button><button class="game-btn secondary" id="pom-reset">Reset</button></div>'+
      '<div class="tool-row"><label style="font:11px monospace">Focus min <input type="number" id="pom-focus" value="25" min="1" max="90" style="width:50px"></label>'+
      '<label style="font:11px monospace">Break min <input type="number" id="pom-break" value="5" min="1" max="30" style="width:50px"></label></div>';
    var seconds=25*60, timer=null, running=false, phase='focus';
    function update(){
      var m=Math.floor(seconds/60), s=seconds%60;
      body.querySelector('#pom-display').textContent = m+':'+String(s).padStart(2,'0');
    }
    function tick(){
      seconds--;
      if(seconds<=0){
        phase = phase==='focus' ? 'break' : 'focus';
        var mins = phase==='focus' ? parseInt(body.querySelector('#pom-focus').value,10) : parseInt(body.querySelector('#pom-break').value,10);
        seconds = mins*60;
        body.querySelector('#pom-phase').textContent = phase==='focus' ? 'Focus' : 'Break';
      }
      update();
    }
    body.querySelector('#pom-toggle').addEventListener('click', function(){
      if(running){ running=false; clearInterval(timer); this.textContent='Resume'; }
      else { running=true; this.textContent='Pause'; timer=setInterval(tick,1000); }
    });
    body.querySelector('#pom-reset').addEventListener('click', function(){
      running=false; clearInterval(timer); phase='focus';
      seconds = (parseInt(body.querySelector('#pom-focus').value,10)||25)*60;
      body.querySelector('#pom-phase').textContent='Focus';
      body.querySelector('#pom-toggle').textContent='Start';
      update();
    });
    update();
  });
}

mountPomodoro(document.getElementById('embed-slot'));
