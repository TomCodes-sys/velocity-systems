// tools/timestamp-converter.js — loaded by tools/timestamp-converter.html.

function mountTimestamp(container){
  mountEmbed(container, 'TOOL / TIMESTAMP CONVERTER', function(body){
    body.innerHTML =
      '<div class="result-card"><div class="field-label">Now</div><div class="result-big" id="ts-now"></div><div class="result-sub" id="ts-now-ms"></div>'+
        '<div class="tool-row"><button class="game-btn secondary" id="ts-use">Use current time</button></div></div>'+
      '<div class="tool-grid two">'+
        '<div class="field"><label for="ts-in">Unix timestamp (seconds or milliseconds)</label><input id="ts-in" inputmode="numeric" autocomplete="off" placeholder="1700000000"></div>'+
        '<div class="field"><label for="ts-dt">Date &amp; time (your timezone)</label><input id="ts-dt" type="datetime-local" step="1"></div></div>'+
      '<div class="err-text" id="ts-err" role="alert"></div><div class="result-card" id="ts-out"><div class="result-sub">Enter a timestamp or pick a date.</div></div>';
    var $ = function(s){ return body.querySelector(s); };
    function pad(n){ return String(n).padStart(2, '0'); }
    function localInput(d){ return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+'T'+pad(d.getHours())+':'+pad(d.getMinutes())+':'+pad(d.getSeconds()); }
    function rel(ms){
      var s = Math.round((ms - Date.now()) / 1000), a = Math.abs(s), u = [['year',31536000],['month',2592000],['day',86400],['hour',3600],['minute',60],['second',1]];
      for(var i = 0; i < u.length; i++) if(a >= u[i][1]){ var v = Math.floor(a / u[i][1]); return s < 0 ? v+' '+u[i][0]+(v > 1 ? 's' : '')+' ago' : 'in '+v+' '+u[i][0]+(v > 1 ? 's' : ''); }
      return 'now';
    }
    function show(ms){
      var d = new Date(ms);
      if(isNaN(d)){ $('#ts-err').textContent = 'That doesn’t look like a valid time.'; return; }
      $('#ts-err').textContent = '';
      $('#ts-out').innerHTML = '<dl class="kv"><dt>Local</dt><dd>'+esc(d.toString())+'</dd><dt>UTC</dt><dd>'+esc(d.toUTCString())+'</dd><dt>ISO 8601</dt><dd>'+esc(d.toISOString())+'</dd>'+
        '<dt>Seconds</dt><dd>'+Math.floor(ms/1000)+'</dd><dt>Milliseconds</dt><dd>'+ms+'</dd><dt>Relative</dt><dd>'+esc(rel(ms))+'</dd></dl>';
    }
    $('#ts-in').addEventListener('input', function(){
      var v = this.value.trim(); if(!v){ $('#ts-err').textContent = ''; return; }
      if(!/^-?\d+$/.test(v)){ $('#ts-err').textContent = 'Use digits only.'; return; }
      var n = Number(v), ms = Math.abs(n) >= 1e11 ? n : n * 1000;
      show(ms); if(!isNaN(new Date(ms))) $('#ts-dt').value = localInput(new Date(ms));
    });
    $('#ts-dt').addEventListener('input', function(){
      if(!this.value) return; var ms = new Date(this.value).getTime();
      $('#ts-in').value = Math.floor(ms / 1000); show(ms);
    });
    $('#ts-use').addEventListener('click', function(){
      var ms = Date.now(); $('#ts-in').value = Math.floor(ms / 1000); $('#ts-dt').value = localInput(new Date(ms)); show(ms);
    });
    function tick(){ var n = Date.now(); $('#ts-now').textContent = Math.floor(n / 1000); $('#ts-now-ms').textContent = n + ' ms · ' + new Date(n).toISOString(); }
    tick(); var iv = setInterval(tick, 1000); onUnmount(body, function(){ clearInterval(iv); });
    if($('#ts-in').value) $('#ts-in').dispatchEvent(new Event('input'));
  });
}

mountTimestamp(document.getElementById('embed-slot'));
