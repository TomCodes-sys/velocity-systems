// tools/reaction-timer.js — loaded by tools/reaction-timer.html. Shared helpers come from assets/js/play.js.

/* ---------------- Reaction Timer (rebuilt) ---------------- */
function mountReactionTimer(container){
  mountEmbed(container, 'TOOL / REACTION TIMER', function(body){
    body.innerHTML =
      '<div class="snake-wrap">'+
        '<div class="snake-hud">'+
          '<span id="rt-last">LAST —</span><span id="rt-best">BEST —</span>'+
          '<span id="rt-avg">AVG —</span><span id="rt-count">ROUNDS 0</span>'+
        '</div>'+
        '<div id="rt-target" role="button" tabindex="0" style="width:100%;max-width:520px;height:200px;display:flex;flex-direction:column;gap:8px;align-items:center;justify-content:center;background:var(--surface-2);border:2px solid var(--line);border-radius:var(--rad);cursor:pointer;user-select:none;text-align:center;padding:16px">'+
          '<div id="rt-msg" style="font:700 18px ui-sans-serif,system-ui,sans-serif">Click to begin</div>'+
          '<div id="rt-sub" class="tool-msg">Wait for green, then click as fast as you can</div>'+
        '</div>'+
        '<div class="tool-row" style="justify-content:center">'+
          '<label>Min delay <input type="number" id="rt-min" value="1.5" step="0.5" min="0.5" max="10" style="width:64px">s</label>'+
          '<label>Max delay <input type="number" id="rt-max" value="4" step="0.5" min="1" max="15" style="width:64px">s</label>'+
          '<button class="game-btn secondary" id="rt-reset">Reset stats</button>'+
        '</div>'+
        '<div id="rt-hist" class="tool-output" style="width:100%;max-width:520px;display:none"></div>'+
      '</div>';

    var target = body.querySelector('#rt-target');
    var saved = toolHistory('reaction-timer', {max:50});
    var state='idle', timer=null, startAt=0, results=[], best=lsGet('vs-reaction-best', null);
    if(best!==null) body.querySelector('#rt-best').textContent='BEST '+best+'ms';

    function setState(s, msg, sub, bg, border){
      state=s;
      body.querySelector('#rt-msg').textContent=msg;
      body.querySelector('#rt-sub').textContent=sub||'';
      target.style.background=bg||'var(--surface-2)';
      target.style.borderColor=border||'var(--line)';
    }
    function refresh(){
      if(!results.length) return;
      var last=results[results.length-1];
      var avg=Math.round(results.reduce(function(a,b){return a+b;},0)/results.length);
      body.querySelector('#rt-last').textContent='LAST '+last+'ms';
      body.querySelector('#rt-avg').textContent='AVG '+avg+'ms';
      body.querySelector('#rt-count').textContent='ROUNDS '+results.length;
      if(best===null||last<best){ best=last; lsSet('vs-reaction-best',best); }
      body.querySelector('#rt-best').textContent='BEST '+best+'ms';
      var hist=body.querySelector('#rt-hist');
      hist.style.display='block';
      hist.innerHTML = results.slice(-12).reverse().map(function(ms,i){
        var label = ms<200?'Excellent':ms<260?'Good':ms<350?'Average':'Slow';
        return '<div style="display:flex;justify-content:space-between;padding:3px 0"><span>Round '+(results.length-i)+' · '+label+'</span><b>'+ms+'ms</b></div>';
      }).join('');
    }
    function arm(){
      var mn=parseFloat(body.querySelector('#rt-min').value)||1.5;
      var mx=parseFloat(body.querySelector('#rt-max').value)||4;
      if(mx<mn) mx=mn+1;
      setState('waiting','Wait…','Click the moment it turns green','rgba(255,83,94,.12)','rgba(255,83,94,.45)');
      timer=setTimeout(function(){
        startAt=Date.now();
        setState('go','CLICK NOW','','rgba(54,201,121,.18)','rgba(54,201,121,.55)');
      }, (mn + Math.random()*(mx-mn))*1000);
    }
    function handle(){
      if(state==='idle'||state==='result'){ arm(); return; }
      if(state==='waiting'){
        clearTimeout(timer);
        setState('early','Too soon!','You clicked before it turned green — click to retry','rgba(251,191,36,.14)','rgba(251,191,36,.5)');
        state='result';
        return;
      }
      if(state==='early'){ arm(); return; }
      if(state==='go'){
        var ms=Date.now()-startAt;
        results.push(ms); saved.add({ms:ms}); refresh();
        setState('result', ms+'ms', 'Click to go again','var(--surface-2)','var(--line)');
        return;
      }
    }
    target.addEventListener('click', handle);
    target.addEventListener('keydown', function(e){ if(e.key===' '||e.key==='Enter'){ e.preventDefault(); handle(); } });
    body.querySelector('#rt-reset').addEventListener('click', function(){
      clearTimeout(timer); results=[]; best=null; lsSet('vs-reaction-best',null);
      ['rt-last','rt-best','rt-avg'].forEach(function(id){ body.querySelector('#'+id).textContent=id.split('-')[1].toUpperCase()+' —'; });
      body.querySelector('#rt-count').textContent='ROUNDS 0';
      body.querySelector('#rt-hist').style.display='none';
      setState('idle','Click to begin','Wait for green, then click as fast as you can');
    });
    onUnmount(target, function(){ clearTimeout(timer); });
    saved.mount(body, {title:'All attempts', format:function(e){ return {main:e.ms+' ms', sub:e.ms<200?'Excellent':e.ms<260?'Good':e.ms<350?'Average':'Slow'}; }});
  });
}

mountReactionTimer(document.getElementById('embed-slot'));
