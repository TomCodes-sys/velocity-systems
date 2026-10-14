// games/hangman.js — loaded by games/hangman.html. Shared helpers come from assets/js/play.js.

/* HANGMAN */
function mountHangman(container){
  mountEmbed(container, 'PLAY / HANGMAN', function(body){
    var WORDS = {
      animals:[['ELEPHANT','Largest land animal'],['PENGUIN','Flightless Antarctic bird'],['DOLPHIN','Intelligent marine mammal'],['GIRAFFE','Tallest land animal'],['CHEETAH','Fastest land animal'],['OCTOPUS','Eight-armed sea creature']],
      tech:[['ALGORITHM','Step-by-step problem solving'],['DATABASE','Organised data store'],['ENCRYPTION','Encoding data for security'],['JAVASCRIPT','The language of the web'],['PROTOCOL','Set of network rules']],
      countries:[['AUSTRALIA','Home of kangaroos'],['BRAZIL','Largest South American country'],['FINLAND','Land of a thousand lakes'],['MONGOLIA','Land of Genghis Khan']],
      food:[['AVOCADO','Trendy toast topping'],['CROISSANT','French buttery pastry'],['HUMMUS','Chickpea dip'],['LASAGNA','Layered Italian pasta bake']],
    };
    WORDS.mixed = [].concat(WORDS.animals, WORDS.tech, WORDS.countries, WORDS.food);
    var stats = lsGet('vs-hangman-stats', {wins:0, losses:0});
    body.innerHTML =
      '<div class="mine-wrap">'+
        '<div class="tool-row">'+
          '<select id="hm-cat" class="cat-sort-select" style="width:auto"><option value="mixed">Mixed</option><option value="animals">Animals</option><option value="tech">Technology</option><option value="countries">Countries</option><option value="food">Food</option><option value="custom">Custom word</option></select>'+
          '<select id="hm-max" class="cat-sort-select" style="width:auto"><option value="4">4 chances</option><option value="6" selected>6 chances</option><option value="8">8 chances</option></select>'+
          '<input type="text" id="hm-custom" placeholder="Custom word" style="display:none;background:var(--surface-2);border:1px solid var(--line);color:var(--text);padding:6px 8px;border-radius:var(--rad)">'+
        '</div>'+
        '<div class="tool-row"><label style="font:11px monospace"><input type="checkbox" id="hm-show-hint" checked> Hints</label><label style="font:11px monospace"><input type="checkbox" id="hm-show-cat"> Category</label></div>'+
        '<canvas id="hm-canvas" width="140" height="140"></canvas>'+
        '<div id="hm-hint" class="tool-msg" style="min-height:16px"></div>'+
        '<div id="hm-word" style="display:flex;gap:8px;font:20px var(--font-mono);letter-spacing:2px"></div>'+
        '<div id="hm-wrong" class="tool-msg">Wrong: 0/6</div>'+
        '<div id="hm-keyboard" style="display:flex;flex-wrap:wrap;gap:4px;max-width:420px;justify-content:center"></div>'+
        '<div id="hm-result" class="tool-msg"></div>'+
        '<div class="snake-hud"><span id="hm-wins">WINS '+stats.wins+'</span><span id="hm-losses">LOSSES '+stats.losses+'</span></div>'+
        '<button class="game-btn secondary" id="hm-new">New word</button>'+
      '</div>';
    var canvas = body.querySelector('#hm-canvas'), ctx = canvas.getContext('2d');
    var word, hintText, guessed, wrong, maxWrong=6;

    function drawGallows(w){
      ctx.clearRect(0,0,140,140);
      var accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()||'#3b82f6';
      ctx.strokeStyle=accent; ctx.lineWidth=2; ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(15,130); ctx.lineTo(120,130); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(40,130); ctx.lineTo(40,15); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(40,15); ctx.lineTo(90,15); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(90,15); ctx.lineTo(90,32); ctx.stroke();
      var parts = [
        function(){ ctx.strokeStyle='#ff535e'; ctx.beginPath(); ctx.arc(90,42,10,0,Math.PI*2); ctx.stroke(); },
        function(){ ctx.strokeStyle='#ff535e'; ctx.beginPath(); ctx.moveTo(90,52); ctx.lineTo(90,80); ctx.stroke(); },
        function(){ ctx.strokeStyle='#ff535e'; ctx.beginPath(); ctx.moveTo(90,60); ctx.lineTo(75,72); ctx.stroke(); },
        function(){ ctx.strokeStyle='#ff535e'; ctx.beginPath(); ctx.moveTo(90,60); ctx.lineTo(105,72); ctx.stroke(); },
        function(){ ctx.strokeStyle='#ff535e'; ctx.beginPath(); ctx.moveTo(90,80); ctx.lineTo(75,98); ctx.stroke(); },
        function(){ ctx.strokeStyle='#ff535e'; ctx.beginPath(); ctx.moveTo(90,80); ctx.lineTo(105,98); ctx.stroke(); },
      ];
      for(var i=0;i<w;i++){ var idx=Math.floor(i/maxWrong*parts.length); if(parts[idx]) parts[idx](); }
    }
    function start(){
      maxWrong = parseInt(body.querySelector('#hm-max').value,10);
      var cat = body.querySelector('#hm-cat').value;
      var entry;
      if(cat==='custom'){
        var cw = body.querySelector('#hm-custom').value.trim().toUpperCase().replace(/[^A-Z]/g,'');
        entry = [cw||'VELOCITY','Custom word'];
      } else {
        var pool = WORDS[cat]||WORDS.mixed;
        entry = pool[Math.floor(Math.random()*pool.length)];
      }
      word = entry[0]; hintText = entry[1];
      guessed = new Set(); wrong=0;
      var parts=[];
      if(body.querySelector('#hm-show-cat').checked) parts.push('Category: '+cat);
      parts.push(word.length+' letters');
      if(body.querySelector('#hm-show-hint').checked) parts.push('Hint: '+hintText);
      body.querySelector('#hm-hint').textContent = parts.join(' · ');
      body.querySelector('#hm-result').textContent='';
      body.querySelector('#hm-wrong').textContent='Wrong: 0/'+maxWrong;
      drawGallows(0); renderWord(); renderKeyboard();
    }
    function renderWord(){
      body.querySelector('#hm-word').innerHTML = word.split('').map(function(ch){
        return '<span style="border-bottom:2px solid var(--line);width:20px;text-align:center">'+(guessed.has(ch)?ch:'')+'</span>';
      }).join('');
    }
    function renderKeyboard(){
      body.querySelector('#hm-keyboard').innerHTML = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(function(ch){
        var g = guessed.has(ch);
        var cls = g ? (word.indexOf(ch)>-1 ? 'game-btn' : 'game-btn secondary') : 'game-btn secondary';
        return '<button class="'+cls+'" style="min-width:30px;padding:6px 4px" data-letter="'+ch+'" '+(g?'disabled':'')+'>'+ch+'</button>';
      }).join('');
      qsa2(body,'[data-letter]').forEach(function(b){ b.addEventListener('click', function(){ guess(b.getAttribute('data-letter')); }); });
    }
    function saveStats(){ lsSet('vs-hangman-stats', stats); }
    function guess(ch){
      if(guessed.has(ch)) return;
      guessed.add(ch);
      if(word.indexOf(ch)===-1){ wrong++; drawGallows(wrong); body.querySelector('#hm-wrong').textContent='Wrong: '+wrong+'/'+maxWrong; }
      renderWord(); renderKeyboard();
      if(word.split('').every(function(c){return guessed.has(c);})){
        stats.wins++; saveStats(); body.querySelector('#hm-wins').textContent='WINS '+stats.wins;
        body.querySelector('#hm-result').textContent='You win!';
        notify('Hangman — you got it!','ok');
      } else if(wrong>=maxWrong){
        stats.losses++; saveStats(); body.querySelector('#hm-losses').textContent='LOSSES '+stats.losses;
        body.querySelector('#hm-result').textContent='Game over — word was '+word;
        word.split('').forEach(function(c){guessed.add(c);}); renderWord(); renderKeyboard();
      }
    }
    body.querySelector('#hm-cat').addEventListener('change', function(){
      body.querySelector('#hm-custom').style.display = this.value==='custom' ? 'block' : 'none';
    });
    function keyHandler(e){
      // Note: plain letter keys are reserved for guessing (including R), so
      // restart stays on the button only here — no keyboard shortcut clash.
      if(/^[a-zA-Z]$/.test(e.key) && document.activeElement.tagName!=='INPUT') guess(e.key.toUpperCase());
    }
    document.addEventListener('keydown', keyHandler);
    body.querySelector('#hm-new').addEventListener('click', start);
    start();
    onUnmount(canvas, function(){ document.removeEventListener('keydown', keyHandler); });
  });
}

mountHangman(document.getElementById('embed-slot'));
