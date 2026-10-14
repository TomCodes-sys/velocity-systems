// tools/countdown-timer.js — loaded by tools/countdown-timer.html.
// The target time is saved, so a running countdown keeps counting if you reload or close the tab.

function mountCountdown(container){
  mountEmbed(container, 'TOOL / COUNTDOWN TIMER', function(body){
    body.innerHTML =
      '<div class="tool-row"><span class="seg" id="cd-seg"><button type="button" data-m="dur" class="on">Duration</button><button type="button" data-m="date">Target date</button></span>'+
        '<select id="cd-mode" style="display:none"><option value="dur">dur</option><option value="date">date</option></select></div>'+
      '<div id="cd-dur" class="tool-grid"><div class="field"><label for="cd-h">Hours</label><input id="cd-h" type="number" min="0" max="999" value="0"></div>'+
        '<div class="field"><label for="cd-m">Minutes</label><input id="cd-m" type="number" min="0" max="59" value="5"></div>'+
        '<div class="field"><label for="cd-s">Seconds</label><input id="cd-s" type="number" min="0" max="59" value="0"></div></div>'+
      '<div id="cd-date" class="tool-grid" hidden><div class="field"><label for="cd-target">Count down to</label><input id="cd-target" type="datetime-local"></div></div>'+
      '<div class="cd-display" id="cd-disp" role="timer" aria-live="off">00:00:00</div><p class="hint" id="cd-note" style="text-align:center"></p>'+
      '<div class="tool-row" style="justify-content:center"><button class="game-btn" id="cd-start">Start</button><button class="game-btn secondary" id="cd-reset">Reset</button><label><input type="checkbox" id="cd-sound" checked> Sound at zero</label></div>';
    var $ = function(s){ return body.querySelector(s); };
    var KEY = 'vs-countdown', st = lsGet(KEY, null), iv = null, fired = false;

    function fmt(ms){
      var t = Math.max(0, Math.ceil(ms / 1000)), d = Math.floor(t / 86400), h = Math.floor(t % 86400 / 3600), m = Math.floor(t % 3600 / 60), s = t % 60;
      var p = function(n){ return String(n).padStart(2, '0'); };
      return (d ? d + 'd ' : '') + p(h) + ':' + p(m) + ':' + p(s);
    }
    function beep(){
      try {
        var a = new (window.AudioContext || window.webkitAudioContext)(), n = 0;
        (function one(){ var o = a.createOscillator(), g = a.createGain(); o.frequency.value = 880; o.connect(g); g.connect(a.destination);
          g.gain.setValueAtTime(.2, a.currentTime); g.gain.exponentialRampToValueAtTime(.001, a.currentTime + .25); o.start(); o.stop(a.currentTime + .25);
          if(++n < 3) setTimeout(one, 350); })();
      } catch(e){}
    }
    function sync(){
      var m = $('#cd-mode').value;
      $('#cd-dur').hidden = m !== 'dur'; $('#cd-date').hidden = m !== 'date';
      Array.prototype.forEach.call(body.querySelectorAll('#cd-seg button'), function(b){ b.classList.toggle('on', b.getAttribute('data-m') === m); });
    }
    function tick(){
      if(!st){ return; }
      var left = st.end - Date.now();
      $('#cd-disp').textContent = fmt(left);
      document.title = fmt(left) + ' · Countdown';
      if(left <= 0){
        clearInterval(iv); iv = null;
        $('#cd-disp').classList.add('done'); $('#cd-note').textContent = 'Time’s up.';
        $('#cd-start').textContent = 'Start';
        if(!fired){ fired = true; if($('#cd-sound').checked) beep(); notify('Countdown finished', 'ok', {force:true}); }
        st = null; lsSet(KEY, null);
      }
    }
    function start(){
      var end;
      if($('#cd-mode').value === 'dur'){
        var ms = ((+$('#cd-h').value || 0) * 3600 + (+$('#cd-m').value || 0) * 60 + (+$('#cd-s').value || 0)) * 1000;
        if(ms <= 0){ notify('Set a duration first', 'warn'); return; }
        end = Date.now() + ms;
      } else {
        end = new Date($('#cd-target').value).getTime();
        if(isNaN(end) || end <= Date.now()){ notify('Pick a date and time in the future', 'warn'); return; }
      }
      st = {end:end}; lsSet(KEY, st); fired = false;
      $('#cd-disp').classList.remove('done'); $('#cd-note').textContent = 'Ends ' + new Date(end).toLocaleString();
      $('#cd-start').textContent = 'Restart';
      clearInterval(iv); iv = setInterval(tick, 250); tick();
    }
    function reset(){
      clearInterval(iv); iv = null; st = null; lsSet(KEY, null); fired = false; document.title = document.title.replace(/^[\d: d]+ · Countdown$/, 'Countdown Timer');
      $('#cd-disp').textContent = '00:00:00'; $('#cd-disp').classList.remove('done'); $('#cd-note').textContent = ''; $('#cd-start').textContent = 'Start';
    }
    $('#cd-seg').addEventListener('click', function(e){
      var b = e.target.closest('[data-m]'); if(!b) return;
      $('#cd-mode').value = b.getAttribute('data-m'); $('#cd-mode').dispatchEvent(new Event('change', {bubbles:true})); sync();
    });
    $('#cd-mode').addEventListener('change', sync);
    $('#cd-start').addEventListener('click', start); $('#cd-reset').addEventListener('click', reset);
    onUnmount(body, function(){ clearInterval(iv); });
    sync();
    if(st && st.end){
      if(st.end > Date.now()){ $('#cd-note').textContent = 'Ends ' + new Date(st.end).toLocaleString(); $('#cd-start').textContent = 'Restart'; iv = setInterval(tick, 250); tick(); }
      else { st = null; lsSet(KEY, null); }
    }
  });
}

mountCountdown(document.getElementById('embed-slot'));
