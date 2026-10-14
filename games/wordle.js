// games/wordle.js — loaded by games/wordle.html. Shared helpers come from assets/js/play.js.

/* WORDLE — green/orange tiles, flip + shake + win animations,
   length/guess selectors, hard mode, custom word, persisted stats */
function mountWordle(container){
  mountEmbed(container, 'PLAY / WORDLE', function(body){
    var WORD_BANK = {
      4:['FIRE','WORD','GAME','CODE','BYTE','CHIP','DISK','PORT','SYNC','GRID','NODE','LOOP','HASH','FLAG','HEAP','BOOT'],
      5:['GAMES','CODES','BYTES','CHIPS','GRIDS','NODES','LOOPS','TORCH','SWORD','MAGIC','CRAFT','TRICK','STORM','CRANE','SNAKE','PIXEL','SONIC','BRAVE','GHOST','PRISM','STACK','QUEUE','PARSE','CACHE','FETCH','PATCH','DEBUG','FRAME','LOGIC','QUERY','SHIFT','SCOPE','CLASS','TOKEN','REGEX','INDEX','ROUTE','BUILD','LIMIT','CLICK'],
      6:['POWERS','CODING','GAMING','SYSTEM','PURPLE','ENTITY','MATRIX','BINARY','SIGNAL','DRIVER','KERNEL','SERVER','ROUTER','BUFFER','SHADER','COMMIT','BRANCH','DEPLOY','SOCKET','THREAD','PACKET','CIPHER','HEADER','SYNTAX','OBJECT','LAMBDA','STATIC','IMPORT','EXPORT'],
      7:['CONSOLE','MONITOR','NETWORK','HACKING','MODULES','CACHING','THREADS','PACKETS','BOOLEAN','INTEGER','POINTER','VIRTUAL','RUNTIME','COMPILE','PAYLOAD','ENCRYPT','LIBRARY','PROMISE','PROXIES'],
    };
    var cfg = gameSettings('wordle', {len:5, guesses:6, hard:false});
    var stats = lsGet('vs-wordle-stats', {wins:0, streak:0, best:0, played:0});

    body.innerHTML =
      '<div class="snake-wrap">'+
        '<div class="tool-row" style="justify-content:center">'+
          '<label>Length <select id="wd-len" class="cat-sort-select" style="width:auto">'+
            [4,5,6,7].map(function(n){return '<option value="'+n+'"'+(cfg.len===n?' selected':'')+'>'+n+'</option>';}).join('')+
          '</select></label>'+
          '<label>Guesses <select id="wd-guesses" class="cat-sort-select" style="width:auto">'+
            [4,6,8].map(function(n){return '<option value="'+n+'"'+(cfg.guesses===n?' selected':'')+'>'+n+'</option>';}).join('')+
          '</select></label>'+
          '<label><input type="checkbox" id="wd-hard"'+(cfg.hard?' checked':'')+'> Hard mode</label>'+
          '<button class="game-btn" id="wd-new">New word</button>'+
        '</div>'+
        '<div class="tool-row" style="justify-content:center">'+
          '<input type="text" id="wd-custom" placeholder="Set a custom word (optional)" style="width:230px">'+
          '<button class="game-btn secondary" id="wd-setcustom">Use word</button>'+
        '</div>'+
        '<div class="tool-row" style="justify-content:center;font:11px var(--font-mono);color:var(--muted)">'+
          '<span><i style="display:inline-block;width:11px;height:11px;background:#16a34a;vertical-align:-1px;margin-right:5px"></i>Right spot</span>'+
          '<span><i style="display:inline-block;width:11px;height:11px;background:#d97706;vertical-align:-1px;margin-right:5px"></i>Wrong spot</span>'+
          '<span><i style="display:inline-block;width:11px;height:11px;background:#4b5563;vertical-align:-1px;margin-right:5px"></i>Not in word</span>'+
        '</div>'+
        '<div id="wd-grid" style="display:flex;flex-direction:column;gap:6px"></div>'+
        '<div id="wd-msg" class="tool-msg" style="min-height:18px"></div>'+
        '<div id="wd-keyboard" style="display:flex;flex-direction:column;gap:6px;align-items:center"></div>'+
        '<div class="snake-hud">'+
          '<span id="wd-wins">WINS '+stats.wins+'</span>'+
          '<span id="wd-streak">STREAK '+stats.streak+'</span>'+
          '<span id="wd-best">BEST '+(stats.best||0)+'</span>'+
          '<span id="wd-played">PLAYED '+stats.played+'</span>'+
        '</div>'+
      '</div>';

    var target, guesses, current, keyState, LEN, MAX, locked=false, customWord=null;

    function saveStats(){ lsSet('vs-wordle-stats', stats); }
    function refreshStats(){
      body.querySelector('#wd-wins').textContent='WINS '+stats.wins;
      body.querySelector('#wd-streak').textContent='STREAK '+stats.streak;
      body.querySelector('#wd-best').textContent='BEST '+(stats.best||0);
      body.querySelector('#wd-played').textContent='PLAYED '+stats.played;
    }
    function start(){
      LEN = parseInt(body.querySelector('#wd-len').value,10);
      MAX = parseInt(body.querySelector('#wd-guesses').value,10);
      cfg.len=LEN; cfg.guesses=MAX; cfg.hard=body.querySelector('#wd-hard').checked; cfg._save();
      if(customWord && customWord.length===LEN){ target = customWord; customWord = null; }
      else { var pool=WORD_BANK[LEN]; target = pool[Math.floor(Math.random()*pool.length)]; }
      guesses=[]; current=''; keyState={}; locked=false;
      body.querySelector('#wd-msg').textContent='';
      renderGrid(); renderKeyboard();
    }
    function renderGrid(){
      var g = body.querySelector('#wd-grid');
      g.innerHTML='';
      for(var r=0;r<MAX;r++){
        var row=document.createElement('div');
        row.className='wd-row'; row.style.cssText='display:flex;gap:6px';
        var entry = guesses[r];
        var word = entry ? entry.word : (r===guesses.length ? current : '');
        for(var c=0;c<LEN;c++){
          var cell=document.createElement('div');
          cell.className='wd-cell'+(entry?' '+entry.marks[c]:'')+(!entry&&word[c]?' filled':'');
          cell.textContent = word[c]||'';
          row.appendChild(cell);
        }
        g.appendChild(row);
      }
    }
    function renderKeyboard(){
      var rows=['QWERTYUIOP','ASDFGHJKL','ZXCVBNM'];
      var kb=body.querySelector('#wd-keyboard'); kb.innerHTML='';
      rows.forEach(function(rowStr,ri){
        var rd=document.createElement('div'); rd.style.cssText='display:flex;gap:5px;justify-content:center';
        if(ri===2){
          var ent=document.createElement('button'); ent.className='wd-key wide'; ent.textContent='ENTER';
          ent.addEventListener('click', submit); rd.appendChild(ent);
        }
        rowStr.split('').forEach(function(ch){
          var b=document.createElement('button');
          b.className='wd-key'+(keyState[ch]?' '+keyState[ch]:'');
          b.textContent=ch;
          b.addEventListener('click', function(){ typeChar(ch); });
          rd.appendChild(b);
        });
        if(ri===2){
          var bk=document.createElement('button'); bk.className='wd-key wide'; bk.textContent='⌫';
          bk.addEventListener('click', backspace); rd.appendChild(bk);
        }
        kb.appendChild(rd);
      });
    }
    function currentRowEl(){ return body.querySelectorAll('#wd-grid .wd-row')[guesses.length]; }
    function typeChar(ch){
      if(locked || guesses.length>=MAX) return;
      if(current.length>=LEN) return;
      current+=ch;
      renderGrid();
      var row=currentRowEl();
      if(row){ var cell=row.children[current.length-1]; cell.classList.add('typed'); }
    }
    function backspace(){ if(locked) return; current=current.slice(0,-1); renderGrid(); }
    function shakeRow(msg){
      body.querySelector('#wd-msg').textContent=msg;
      var row=currentRowEl();
      if(row){ row.classList.remove('shake'); void row.offsetWidth; row.classList.add('shake'); }
    }
    function hardModeError(){
      // Hard mode: every revealed hint must be reused in the next guess.
      if(!body.querySelector('#wd-hard').checked || !guesses.length) return null;
      var last = guesses[guesses.length-1];
      for(var i=0;i<LEN;i++){
        if(last.marks[i]==='correct' && current[i]!==last.word[i])
          return 'Hard mode: position '+(i+1)+' must be '+last.word[i];
      }
      for(i=0;i<LEN;i++){
        if(last.marks[i]==='present' && current.indexOf(last.word[i])===-1)
          return 'Hard mode: guess must contain '+last.word[i];
      }
      return null;
    }
    function scoreGuess(guess){
      // Two-pass so duplicate letters are marked the way real Wordle does.
      var marks = new Array(LEN).fill('absent');
      var pool = target.split('');
      for(var i=0;i<LEN;i++) if(guess[i]===target[i]){ marks[i]='correct'; pool[i]=null; }
      for(i=0;i<LEN;i++){
        if(marks[i]==='correct') continue;
        var idx = pool.indexOf(guess[i]);
        if(idx>-1){ marks[i]='present'; pool[idx]=null; }
      }
      return marks;
    }
    function submit(){
      if(locked || guesses.length>=MAX) return;
      if(current.length!==LEN){ shakeRow('Not enough letters'); return; }
      var hardErr = hardModeError();
      if(hardErr){ shakeRow(hardErr); return; }
      var marks = scoreGuess(current);
      var guessWord = current;
      guesses.push({word:guessWord, marks:marks});
      current=''; locked=true;
      renderGrid();
      // staggered flip reveal
      var rowEl = body.querySelectorAll('#wd-grid .wd-row')[guesses.length-1];
      var motionOn = document.documentElement.dataset.motion !== 'off';
      var step = motionOn ? 260 : 0;
      for(var i=0;i<LEN;i++){
        (function(i){
          setTimeout(function(){
            var cell=rowEl.children[i];
            if(cell) cell.classList.add('reveal');
          }, i*step);
        })(i);
      }
      setTimeout(function(){
        guessWord.split('').forEach(function(ch,i){
          var m=marks[i];
          if(m==='correct') keyState[ch]='correct';
          else if(m==='present' && keyState[ch]!=='correct') keyState[ch]='present';
          else if(!keyState[ch]) keyState[ch]='absent';
        });
        renderKeyboard();
        locked=false;
        var won = guessWord===target;
        if(won){
          stats.wins++; stats.streak++; stats.played++;
          if(stats.streak>(stats.best||0)) stats.best=stats.streak;
          saveStats(); refreshStats();
          body.querySelector('#wd-msg').textContent='Solved in '+guesses.length+' guess'+(guesses.length>1?'es':'')+'!';
          if(motionOn){
            var wr=body.querySelectorAll('#wd-grid .wd-row')[guesses.length-1];
            Array.prototype.forEach.call(wr.children, function(cell,i){
              setTimeout(function(){ cell.classList.add('win'); }, i*90);
            });
          }
          notify('Wordle solved in '+guesses.length+'!','ok');
          locked=true;
        } else if(guesses.length>=MAX){
          stats.streak=0; stats.played++; saveStats(); refreshStats();
          body.querySelector('#wd-msg').textContent='Out of guesses — the word was '+target;
          notify('Wordle — the word was '+target,'warn');
          locked=true;
        }
      }, LEN*step + (motionOn?260:0));
    }
    function keyHandler(e){
      if(e.target.tagName==='INPUT') return;
      if(/^[a-zA-Z]$/.test(e.key)) typeChar(e.key.toUpperCase());
      else if(e.key==='Enter') submit();
      else if(e.key==='Backspace') backspace();
    }
    document.addEventListener('keydown', keyHandler);
    body.querySelector('#wd-new').addEventListener('click', start);
    body.querySelector('#wd-len').addEventListener('change', start);
    body.querySelector('#wd-guesses').addEventListener('change', start);
    body.querySelector('#wd-hard').addEventListener('change', function(){ cfg.hard=this.checked; cfg._save(); });
    body.querySelector('#wd-setcustom').addEventListener('click', function(){
      var w = body.querySelector('#wd-custom').value.trim().toUpperCase().replace(/[^A-Z]/g,'');
      if(!w){ notify('Enter a word first','warn'); return; }
      body.querySelector('#wd-len').value = String(w.length);
      if(!WORD_BANK[w.length]){ notify('Word must be 4–7 letters','err'); return; }
      customWord = w;
      body.querySelector('#wd-custom').value='';
      start();
      notify('Custom word set','ok');
    });
    start();
    onUnmount(body, function(){ document.removeEventListener('keydown', keyHandler); });
  });
}

mountWordle(document.getElementById('embed-slot'));
