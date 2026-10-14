// games/snake.js — loaded by games/snake.html. Shared helpers come from assets/js/play.js.
//
// Smooth Snake. The rules still advance one cell per "step", but drawing runs on
// requestAnimationFrame and slides every segment between its old and new cell, so
// movement is continuous instead of jumping. Direction presses are buffered (two
// deep) so quick turns never get dropped.

function mountSnake(container){
  mountEmbed(container, 'PLAY / SNAKE', function(body){
    body.innerHTML =
      '<div class="snake-wrap">'+
        '<div class="snake-hud"><span id="sn-score">SCORE 0</span><span id="sn-best">BEST 0</span><span id="sn-level">LEVEL 1</span></div>'+
        '<canvas id="snake-canvas" aria-label="Snake game board"></canvas>'+
        '<div class="tool-row">'+
          '<button class="game-btn" id="sn-start">Start</button>'+
          '<button class="game-btn secondary" id="sn-pause" disabled>Pause</button>'+
          '<select id="sn-apples" class="cat-sort-select" style="width:auto"><option value="1">1 apple</option><option value="3" selected>3 apples</option><option value="5">5 apples</option></select>'+
          '<select id="sn-diff" class="cat-sort-select" style="width:auto"><option value="200">Easy</option><option value="130" selected>Normal</option><option value="80">Hard</option><option value="50">Insane</option></select>'+
          '<label><input type="checkbox" id="sn-wrap"> Wrap walls</label>'+
          '<button class="game-btn secondary" id="sn-clear">Clear best</button>'+
        '</div>'+
        '<p class="hint" style="margin:0;text-align:center">Arrow keys or WASD · Space to pause · swipe on touch screens</p>'+
      '</div>';

    var COLS = 20, ROWS = 20, CELL = 20, SIZE = COLS * CELL;
    var canvas = body.querySelector('#snake-canvas'), ctx = canvas.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = SIZE * dpr; canvas.height = SIZE * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var cfg = gameSettings('snake', {apples:3, speed:130, wrap:false});
    var $ = function(sel){ return body.querySelector(sel); };
    $('#sn-apples').value = String(cfg.apples);
    $('#sn-diff').value = String(cfg.speed);
    $('#sn-wrap').checked = !!cfg.wrap;
    $('#sn-apples').addEventListener('change', function(){ cfg.apples = parseInt(this.value, 10); cfg._save(); });
    $('#sn-diff').addEventListener('change', function(){ cfg.speed = parseInt(this.value, 10); cfg._save(); });
    $('#sn-wrap').addEventListener('change', function(){ cfg.wrap = this.checked; cfg._save(); });

    var snake = [], prev = [], dir = {x:1, y:0}, queue = [], foods = [];
    var score = 0, best = lsGet('vs-snake-best', 0);
    var state = 'idle';            // idle | running | paused | over
    var stepMs = 130, acc = 0, last = 0, raf = null;
    $('#sn-best').textContent = 'BEST ' + best;

    function css(v, fb){ return getComputedStyle(document.documentElement).getPropertyValue(v).trim() || fb; }
    function rgb(){ return (css('--accent-rgb', '107 152 230')).split(/\s+/).map(Number); }
    function same(a, b){ return a.x === b.x && a.y === b.y; }

    /* ---- game rules ---- */
    function placeFood(){
      var pos, tries = 0;
      do { pos = {x:Math.floor(Math.random() * COLS), y:Math.floor(Math.random() * ROWS), born:performance.now()}; tries++; }
      while(tries < 500 && (snake.some(function(s){ return same(s, pos); }) || foods.some(function(f){ return same(f, pos); })));
      return pos;
    }
    function reset(){
      var mid = Math.floor(COLS / 2);
      snake = [{x:mid, y:mid}, {x:mid - 1, y:mid}, {x:mid - 2, y:mid}];
      prev = snake.map(function(s){ return {x:s.x, y:s.y}; });
      dir = {x:1, y:0}; queue = []; foods = []; score = 0; acc = 0;
      var n = parseInt($('#sn-apples').value, 10) || 3;
      for(var i = 0; i < n; i++) foods.push(placeFood());
      stepMs = parseInt($('#sn-diff').value, 10) || 130;
      $('#sn-score').textContent = 'SCORE 0';
      $('#sn-level').textContent = 'LEVEL 1';
    }
    function setDir(dx, dy){
      var ref = queue.length ? queue[queue.length - 1] : dir;
      if(dx === -ref.x && dy === -ref.y) return;   // can't reverse into yourself
      if(dx === ref.x && dy === ref.y) return;     // already heading that way
      if(queue.length < 2) queue.push({x:dx, y:dy});
    }
    function step(){
      prev = snake.map(function(s){ return {x:s.x, y:s.y}; });
      if(queue.length) dir = queue.shift();
      var head = {x:snake[0].x + dir.x, y:snake[0].y + dir.y};
      if(cfg.wrap){
        head.x = (head.x + COLS) % COLS; head.y = (head.y + ROWS) % ROWS;
      } else if(head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS){ die(); return; }

      var ateIdx = -1;
      for(var i = 0; i < foods.length; i++) if(same(foods[i], head)){ ateIdx = i; break; }
      // The tail cell is vacated this step, so moving into it is safe unless we just ate.
      var bodyCells = ateIdx > -1 ? snake : snake.slice(0, -1);
      if(bodyCells.some(function(s){ return same(s, head); })){ die(); return; }

      snake.unshift(head);
      if(ateIdx > -1){
        score++;
        $('#sn-score').textContent = 'SCORE ' + score;
        $('#sn-level').textContent = 'LEVEL ' + (Math.floor(score / 5) + 1);
        if(score > best){ best = score; lsSet('vs-snake-best', best); $('#sn-best').textContent = 'BEST ' + best; }
        foods.splice(ateIdx, 1); foods.push(placeFood());
        var base = parseInt($('#sn-diff').value, 10) || 130;
        stepMs = Math.max(50, base - Math.floor(score / 5) * 10);
      } else {
        snake.pop();
      }
    }
    function die(){
      state = 'over';
      stopLoop();
      draw(1);
      overlay('GAME OVER', 'Score ' + score + ' — press Start or Enter to retry', 'rgba(255,83,94,.18)');
      $('#sn-pause').disabled = true;
      notify('Snake — game over, score ' + score, 'warn');
    }

    /* ---- drawing ---- */
    function lerpPoint(i, t){
      var to = snake[i], from = prev[i] || to;
      var dx = to.x - from.x, dy = to.y - from.y;
      // A wrap-around move jumps COLS-1 cells; take the short way across the edge instead.
      if(Math.abs(dx) > 1) dx -= Math.sign(dx) * COLS;
      if(Math.abs(dy) > 1) dy -= Math.sign(dy) * ROWS;
      return {x:from.x + dx * t, y:from.y + dy * t};
    }
    function overlay(title, sub, tint){
      ctx.fillStyle = tint; ctx.fillRect(0, 0, SIZE, SIZE);
      ctx.fillStyle = css('--text', '#fff'); ctx.textAlign = 'center';
      ctx.font = '700 26px ' + css('--font-ui', 'sans-serif'); ctx.fillText(title, SIZE / 2, SIZE / 2 - 8);
      ctx.fillStyle = css('--muted', '#aaa'); ctx.font = '12px ' + css('--font-mono', 'monospace'); ctx.fillText(sub, SIZE / 2, SIZE / 2 + 18);
    }
    function draw(t){
      var surface1 = css('--surface-1', '#101014'), c = rgb(), text = css('--text', '#f2f2f7');
      ctx.fillStyle = surface1; ctx.fillRect(0, 0, SIZE, SIZE);
      ctx.strokeStyle = 'rgba(' + c.join(',') + ',.07)'; ctx.lineWidth = 1;
      ctx.beginPath();
      for(var g = 0; g <= COLS; g++){ ctx.moveTo(g * CELL + .5, 0); ctx.lineTo(g * CELL + .5, SIZE); ctx.moveTo(0, g * CELL + .5); ctx.lineTo(SIZE, g * CELL + .5); }
      ctx.stroke();

      var now = performance.now();
      var palette = ['#36c979', '#ff8fc4', '#fb923c', '#60a5fa', '#a78bfa'];
      foods.forEach(function(f, i){
        var grow = Math.min(1, (now - (f.born || 0)) / 160);
        var r = (CELL / 2 - 3) * (.35 + .65 * grow);
        var cx = f.x * CELL + CELL / 2, cy = f.y * CELL + CELL / 2;
        ctx.fillStyle = palette[i % palette.length];
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.35)';
        ctx.beginPath(); ctx.arc(cx - r * .35, cy - r * .35, r * .25, 0, Math.PI * 2); ctx.fill();
      });

      // Continuous path through the interpolated segments. Each point is placed on the
      // wrapped copy nearest the previous one so the line never streaks across the board.
      var pts = [lerpPoint(0, t)];
      for(var i = 1; i < snake.length; i++){
        var p = lerpPoint(i, t), q = pts[i - 1];
        if(cfg.wrap){
          if(p.x - q.x > COLS / 2) p.x -= COLS; else if(q.x - p.x > COLS / 2) p.x += COLS;
          if(p.y - q.y > ROWS / 2) p.y -= ROWS; else if(q.y - p.y > ROWS / 2) p.y += ROWS;
        }
        pts.push(p);
      }
      var offs = cfg.wrap ? [-1, 0, 1] : [0];
      var width = CELL - 4;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = width;
      offs.forEach(function(ox){ offs.forEach(function(oy){
        for(var i = pts.length - 1; i > 0; i--){
          var shade = .6 + .4 * (1 - i / pts.length);
          ctx.strokeStyle = 'rgb(' + c.map(function(v){ return Math.round(v * shade); }).join(',') + ')';
          ctx.beginPath();
          ctx.moveTo((pts[i].x + ox * COLS) * CELL + CELL / 2, (pts[i].y + oy * ROWS) * CELL + CELL / 2);
          ctx.lineTo((pts[i - 1].x + ox * COLS) * CELL + CELL / 2, (pts[i - 1].y + oy * ROWS) * CELL + CELL / 2);
          ctx.stroke();
        }
        // Head, with eyes that look where the snake is going.
        var hx = (pts[0].x + ox * COLS) * CELL + CELL / 2, hy = (pts[0].y + oy * ROWS) * CELL + CELL / 2;
        ctx.fillStyle = 'rgb(' + c.join(',') + ')';
        ctx.beginPath(); ctx.arc(hx, hy, width / 2 + .5, 0, Math.PI * 2); ctx.fill();
        var sx = -dir.y, sy = dir.x;
        ctx.fillStyle = text;
        [-1, 1].forEach(function(side){
          ctx.beginPath(); ctx.arc(hx + dir.x * 3.5 + sx * side * 3.6, hy + dir.y * 3.5 + sy * side * 3.6, 1.9, 0, Math.PI * 2); ctx.fill();
        });
      }); });
    }

    /* ---- loop ---- */
    function frame(now){
      raf = requestAnimationFrame(frame);
      var dt = Math.min(now - last, 250); last = now;
      if(state === 'running'){
        acc += dt;
        while(acc >= stepMs && state === 'running'){ acc -= stepMs; step(); }
        if(state === 'running') draw(acc / stepMs);
      }
    }
    function startLoop(){ if(raf) return; last = performance.now(); raf = requestAnimationFrame(frame); }
    function stopLoop(){ if(raf){ cancelAnimationFrame(raf); raf = null; } }

    function start(){
      reset();
      state = 'running';
      $('#sn-start').textContent = 'Restart';
      $('#sn-pause').disabled = false; $('#sn-pause').textContent = 'Pause';
      stopLoop(); startLoop();
    }
    function togglePause(){
      if(state === 'running'){
        state = 'paused'; draw(acc / stepMs); overlay('PAUSED', 'Press Space to resume', 'rgba(0,0,0,.35)');
        $('#sn-pause').textContent = 'Resume';
      } else if(state === 'paused'){
        state = 'running'; last = performance.now();
        $('#sn-pause').textContent = 'Pause';
      }
    }

    /* ---- input ---- */
    var KEYS = {ArrowLeft:[-1,0], a:[-1,0], A:[-1,0], ArrowRight:[1,0], d:[1,0], D:[1,0], ArrowUp:[0,-1], w:[0,-1], W:[0,-1], ArrowDown:[0,1], s:[0,1], S:[0,1]};
    function keyHandler(e){
      var tag = e.target && e.target.tagName;
      if(tag === 'SELECT' || tag === 'TEXTAREA' || (tag === 'INPUT' && e.target.type !== 'checkbox')) return;
      if(KEYS[e.key]){ e.preventDefault(); if(state === 'running') setDir(KEYS[e.key][0], KEYS[e.key][1]); return; }
      if(e.key === ' '){ e.preventDefault(); if(state === 'running' || state === 'paused') togglePause(); else start(); return; }
      if(e.key === 'Enter' && (state === 'idle' || state === 'over')){ e.preventDefault(); start(); return; }
      if((e.key === 'r' || e.key === 'R') && state !== 'idle') start();
    }
    document.addEventListener('keydown', keyHandler);

    var touch = null;
    canvas.addEventListener('touchstart', function(e){ var t = e.changedTouches[0]; touch = {x:t.clientX, y:t.clientY}; }, {passive:true});
    canvas.addEventListener('touchmove', function(e){ e.preventDefault(); }, {passive:false});
    canvas.addEventListener('touchend', function(e){
      if(!touch) return;
      var t = e.changedTouches[0], dx = t.clientX - touch.x, dy = t.clientY - touch.y; touch = null;
      if(Math.max(Math.abs(dx), Math.abs(dy)) < 24){ if(state === 'idle' || state === 'over') start(); return; }
      if(state !== 'running') return;
      if(Math.abs(dx) > Math.abs(dy)) setDir(dx > 0 ? 1 : -1, 0); else setDir(0, dy > 0 ? 1 : -1);
    });

    $('#sn-start').addEventListener('click', start);
    $('#sn-pause').addEventListener('click', togglePause);
    $('#sn-clear').addEventListener('click', function(){ best = 0; lsSet('vs-snake-best', 0); $('#sn-best').textContent = 'BEST 0'; notify('Snake best score cleared', 'ok'); });
    document.addEventListener('visibilitychange', function(){ if(document.hidden && state === 'running') togglePause(); });
    onUnmount(canvas, function(){ document.removeEventListener('keydown', keyHandler); stopLoop(); });

    reset(); draw(1);
    overlay('SNAKE', 'Press Start, Space or tap to play', 'rgba(0,0,0,.35)');
  });
}

mountSnake(document.getElementById('embed-slot'));
