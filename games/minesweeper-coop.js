// games/minesweeper-coop.js — loaded by games/minesweeper-coop.html. Shared helpers come from assets/js/play.js.

/* =========================================================
   MINESWEEPER CO-OP — real peer-to-peer multiplayer, no backend.
   Uses PeerJS (WebRTC) lazy-loaded from a CDN only when this game is
   opened; the connection itself is direct browser-to-browser. The host's
   browser holds the authoritative board and referees every move; guests
   send move requests and receive the resulting board state. This only
   works while the host's tab stays open — there is no server to fall
   back to, by design (matches the rest of the site: no backend).
   ========================================================= */
function mountMinesweeperCoop(container){
  mountEmbed(container, 'PLAY / MINESWEEPER CO-OP', function(body){
    var PLAYER_COLORS = ['#3b82f6','#ff535e','#36c979','#fbbf24'];
    var DIFFS = { easy:{rows:9,cols:9,mines:10}, medium:{rows:14,cols:14,mines:32}, hard:{rows:16,cols:20,mines:60} };

    body.innerHTML = '<div class="mine-wrap" id="ms-coop-root"></div>';
    var root = body.querySelector('#ms-coop-root');

    var myId = 'p'+Math.random().toString(36).slice(2,8);
    var myColor = PLAYER_COLORS[Math.floor(Math.random()*PLAYER_COLORS.length)];
    var myName = 'You';
    var role = null; // 'host' | 'guest'
    var peer = null, conns = {}, hostConn = null;
    var players = [];
    var rows, cols, mineCount, board, revealed, flagged, owner, gameOver;
    var roomCode = '';

    function ensurePeerJS(cb, onerr){
      if(window.Peer){ cb(); return; }
      var s = document.createElement('script');
      s.src = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js';
      s.onload = cb;
      s.onerror = onerr;
      document.head.appendChild(s);
    }
    function genRoomCode(){
      var chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789', out='';
      for(var i=0;i<5;i++) out += chars[Math.floor(Math.random()*chars.length)];
      return out;
    }

    function renderLobby(err){
      root.innerHTML =
        '<div style="width:100%;max-width:640px;display:grid;grid-template-columns:1fr 1fr;gap:16px">'+
          '<div class="opt-panel"><div class="opt-panel-title">Host a room</div>'+
            '<p class="tool-msg">Your browser holds the board. Share the room code with up to 3 friends.</p>'+
            '<div class="tool-row"><select id="mc-diff" class="cat-sort-select" style="width:auto">'+
              '<option value="easy">Easy 9×9</option><option value="medium" selected>Medium 14×14</option><option value="hard">Hard 20×16</option>'+
            '</select></div>'+
            '<button class="game-btn" id="mc-host">Host a room</button>'+
          '</div>'+
          '<div class="opt-panel"><div class="opt-panel-title">Join a room</div>'+
            '<p class="tool-msg">Ask the host for their 5-character room code.</p>'+
            '<div class="tool-row"><input type="text" id="mc-code" maxlength="5" placeholder="ROOM CODE" style="text-transform:uppercase;letter-spacing:2px;width:120px"></div>'+
            '<button class="game-btn secondary" id="mc-join">Join room</button>'+
          '</div>'+
        '</div>'+
        (err ? '<div class="tool-msg err" style="margin-top:12px">'+esc(err)+'</div>' : '')+
        '<div class="tool-msg" style="margin-top:14px;max-width:640px">No accounts, no server for gameplay — connections run peer-to-peer directly between browsers over WebRTC (via PeerJS&#39;s free public signalling relay just to introduce the two browsers to each other). If the host closes their tab, the game ends for everyone.</div>';
      root.querySelector('#mc-host').addEventListener('click', function(){ startHost(root.querySelector('#mc-diff').value); });
      root.querySelector('#mc-join').addEventListener('click', function(){
        var code = root.querySelector('#mc-code').value.trim().toUpperCase();
        if(code.length!==5){ notify('Enter the 5-character room code','warn'); return; }
        startJoin(code);
      });
    }

    function neighbors(r,c){
      var out=[];
      for(var dr=-1;dr<=1;dr++) for(var dc=-1;dc<=1;dc++){
        if(dr===0&&dc===0) continue;
        var nr=r+dr, nc=c+dc;
        if(nr>=0&&nc>=0&&nr<rows&&nc<cols) out.push([nr,nc]);
      }
      return out;
    }
    function placeMines(safeR,safeC){
      var candidates=[];
      for(var r=0;r<rows;r++) for(var c=0;c<cols;c++) if(Math.abs(r-safeR)>1||Math.abs(c-safeC)>1) candidates.push([r,c]);
      for(var i=candidates.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)); var t=candidates[i]; candidates[i]=candidates[j]; candidates[j]=t; }
      for(i=0;i<mineCount;i++) board[candidates[i][0]][candidates[i][1]] = -1;
      for(r=0;r<rows;r++) for(c=0;c<cols;c++) if(board[r][c]!==-1)
        board[r][c] = neighbors(r,c).filter(function(n){return board[n[0]][n[1]]===-1;}).length;
    }
    var firstClick;
    function initBoard(diffKey){
      var d = DIFFS[diffKey]||DIFFS.medium;
      rows=d.rows; cols=d.cols; mineCount=d.mines;
      board = Array.from({length:rows}, function(){ return Array(cols).fill(0); });
      revealed = Array.from({length:rows}, function(){ return Array(cols).fill(false); });
      flagged  = Array.from({length:rows}, function(){ return Array(cols).fill(null); });
      owner    = Array.from({length:rows}, function(){ return Array(cols).fill(null); });
      firstClick = true; gameOver=false;
    }
    function hostReveal(r,c,pid){
      if(gameOver || revealed[r][c] || flagged[r][c]) return;
      if(firstClick){ firstClick=false; placeMines(r,c); }
      revealed[r][c]=true; owner[r][c]=pid;
      if(board[r][c]===-1){ endGame(false); return; }
      if(board[r][c]===0) neighbors(r,c).forEach(function(n){ hostReveal(n[0],n[1],pid); });
      checkWin();
    }
    function hostFlag(r,c,pid){
      if(gameOver||revealed[r][c]) return;
      flagged[r][c] = flagged[r][c] ? null : pid;
    }
    function checkWin(){
      var left=0;
      for(var r=0;r<rows;r++) for(var c=0;c<cols;c++) if(!revealed[r][c] && board[r][c]!==-1) left++;
      if(left===0) endGame(true);
    }
    function endGame(won){
      gameOver=true;
      if(!won) for(var r=0;r<rows;r++) for(var c=0;c<cols;c++) if(board[r][c]===-1) revealed[r][c]=true;
      notify(won ? 'Co-op board cleared!' : 'Co-op — a mine was hit', won?'ok':'warn');
    }
    function serializeState(){
      var maskedBoard = [];
      for(var r=0;r<rows;r++){ var row=[]; for(var c=0;c<cols;c++){ row.push(revealed[r][c] ? board[r][c] : null); } maskedBoard.push(row); }
      return {type:'state', rows:rows, cols:cols, mineCount:mineCount, board:maskedBoard, flagged:flagged, owner:owner, gameOver:gameOver, players:players};
    }
    function broadcastState(){
      var msg = serializeState();
      Object.keys(conns).forEach(function(pid){ try{ conns[pid].send(msg); }catch(e){} });
      renderGame(msg);
    }

    function startHost(diffKey){
      ensurePeerJS(function(){
        players = [{id:myId, name:myName, color:myColor, host:true}];
        initBoard(diffKey);
        roomCode = genRoomCode();
        peer = new window.Peer('vs-ms-'+roomCode.toLowerCase());
        peer.on('open', function(){
          role='host';
          renderGame(serializeState());
          notify('Room hosted — share the code!','ok');
        });
        peer.on('connection', function(conn){
          conn.on('open', function(){ conns[conn.peer]=conn; });
          conn.on('data', function(msg){ handleHostMessage(conn, msg); });
          conn.on('close', function(){
            delete conns[conn.peer];
            players = players.filter(function(p){ return p.pid!==conn.peer; });
            broadcastState();
          });
        });
        peer.on('error', function(e){ renderLobby('Connection error: '+(e&&e.type||e)); });
      }, function(){ renderLobby('Could not load the multiplayer library — check your internet connection.'); });
    }
    function handleHostMessage(conn, msg){
      if(msg.type==='hello'){
        var pid = conn.peer;
        var color = PLAYER_COLORS[players.length % PLAYER_COLORS.length];
        players.push({id:pid, pid:pid, name:msg.name||'Player', color:color, host:false});
        conn.send({type:'welcome', roomCode:roomCode, yourColor:color});
        broadcastState();
      } else if(msg.type==='action'){
        if(msg.action==='reveal') hostReveal(msg.r, msg.c, conn.peer);
        else if(msg.action==='flag') hostFlag(msg.r, msg.c, conn.peer);
        broadcastState();
      }
    }
    function startJoin(code){
      ensurePeerJS(function(){
        peer = new window.Peer();
        peer.on('open', function(){
          var conn = peer.connect('vs-ms-'+code.toLowerCase(), {reliable:true});
          hostConn = conn;
          conn.on('open', function(){
            role='guest'; roomCode=code;
            conn.send({type:'hello', name:myName});
          });
          conn.on('data', function(msg){
            if(msg.type==='welcome'){ myColor = msg.yourColor; }
            else if(msg.type==='state'){ renderGame(msg); }
          });
          conn.on('close', function(){ renderLobby('Host closed the room.'); });
          conn.on('error', function(){ renderLobby('Could not reach that room — check the code.'); });
        });
        peer.on('error', function(e){ renderLobby('Connection error: '+(e&&e.type||e)); });
      }, function(){ renderLobby('Could not load the multiplayer library — check your internet connection.'); });
    }

    function sendAction(action, r, c){
      if(role==='host'){
        if(action==='reveal') hostReveal(r,c,myId); else hostFlag(r,c,myId);
        broadcastState();
      } else if(role==='guest' && hostConn){
        hostConn.send({type:'action', action:action, r:r, c:c});
      }
    }

    function renderGame(state){
      var playersHtml = (state.players||players).map(function(p){
        return '<span class="player-chip"><span class="player-dot" style="background:'+p.color+'"></span>'+esc(p.name||'Player')+(p.host?' <span style="color:var(--muted);font-size:9px">HOST</span>':'')+'</span>';
      }).join('');
      root.innerHTML =
        '<div class="tool-row" style="justify-content:center">'+
          '<div class="room-code-display" id="mc-roomcode" title="Click to copy">'+roomCode+'</div>'+
        '</div>'+
        '<div class="tool-row" style="justify-content:center">'+playersHtml+'</div>'+
        '<div class="mine-hud"><span>MINES '+state.mineCount+'</span></div>'+
        '<div class="mine-grid" id="mc-grid"></div>'+
        '<div class="tool-msg" id="mc-result">'+(state.gameOver ? (checkAllSafeRevealed(state) ? 'Board cleared! 🏆' : 'A mine was hit 💥') : '')+'</div>'+
        '<div class="tool-row" style="justify-content:center"><button class="game-btn secondary" id="mc-leave">Leave room</button></div>';

      root.querySelector('#mc-roomcode').addEventListener('click', function(){
        navigator.clipboard.writeText(roomCode).then(function(){ notify('Room code copied','ok'); });
      });
      root.querySelector('#mc-leave').addEventListener('click', function(){
        if(peer) peer.destroy();
        conns={}; hostConn=null; role=null;
        renderLobby();
      });

      var grid = root.querySelector('#mc-grid');
      grid.style.gridTemplateColumns = 'repeat('+state.cols+',26px)';
      grid.innerHTML='';
      for(var r=0;r<state.rows;r++) for(var c=0;c<state.cols;c++){
        var val = state.board[r][c];
        var isRevealed = val !== null;
        var flagOwner = state.flagged[r][c];
        var el = document.createElement('div');
        el.className = 'mine-cell'+(isRevealed?' revealed':'')+(isRevealed&&val===-1?' mine':'')+(flagOwner&&!isRevealed?' flag':'');
        if(isRevealed){ el.textContent = val===-1?'💣':(val>0?val:''); if(val>0) el.classList.add('n'+val); }
        else if(flagOwner){
          el.textContent='⚑';
          var owner = (state.players||players).filter(function(p){return p.id===flagOwner||p.pid===flagOwner;})[0];
          if(owner) el.style.color = owner.color;
        }
        (function(rr,cc){
          el.addEventListener('click', function(){ sendAction('reveal', rr, cc); });
          el.addEventListener('contextmenu', function(e){ e.preventDefault(); sendAction('flag', rr, cc); });
        })(r,c);
        grid.appendChild(el);
      }
    }
    function checkAllSafeRevealed(state){
      for(var r=0;r<state.rows;r++) for(var c=0;c<state.cols;c++) if(state.board[r][c]===-1) return false;
      return true;
    }

    renderLobby();
    onUnmount(root, function(){ if(peer){ try{ peer.destroy(); }catch(e){} } });
  });
}

mountMinesweeperCoop(document.getElementById('embed-slot'));
