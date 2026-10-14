// tools/wheel-spinner.js — loaded by tools/wheel-spinner.html. Shared helpers come from assets/js/play.js.

/* ---------------- Wheel Spinner ---------------- */
function mountSpinner(container){
  mountEmbed(container, 'TOOL / WHEEL SPINNER', function(body){
    body.innerHTML =
      '<div class="snake-wrap">'+
        '<canvas id="sp-canvas" width="280" height="280"></canvas>'+
        '<div class="tool-output" id="sp-result" style="text-align:center">—</div>'+
        '<button class="game-btn" id="sp-spin">Spin</button>'+
        '<textarea class="tool-textarea" id="sp-options" style="min-height:60px;width:100%">Option 1\nOption 2\nOption 3\nOption 4</textarea>'+
        '<button class="game-btn secondary" id="sp-update">Update options</button>'+
      '</div>';
    var canvas = body.querySelector('#sp-canvas'), ctx = canvas.getContext('2d');
    var colors = ['#3b82f6','#36c979','#ff535e','#fbbf24','#9b7bff','#22d3ee'];
    var segments = ['Option 1','Option 2','Option 3','Option 4'];
    var angle = 0, spinning=false;
    var hist = toolHistory('wheel-spinner');
    function draw(highlight){
      var cx=140,cy=140,r=120;
      ctx.clearRect(0,0,280,280);
      var n = segments.length, arc = (2*Math.PI)/n;
      segments.forEach(function(seg,i){
        var start = angle + i*arc - Math.PI/2, end = start+arc;
        ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,r,start,end); ctx.closePath();
        ctx.fillStyle = i===highlight ? '#fff' : colors[i%colors.length];
        ctx.fill();
        ctx.save(); ctx.translate(cx,cy); ctx.rotate(start+arc/2); ctx.textAlign='right'; ctx.fillStyle='#000'; ctx.font='bold 11px sans-serif';
        ctx.fillText(seg, r-10, 4); ctx.restore();
      });
    }
    function spin(){
      if(spinning) return;
      spinning = true;
      var velocity = 0.3 + Math.random()*0.2;
      function frame(){
        angle += velocity; velocity *= 0.98;
        draw(-1);
        if(velocity>0.002) requestAnimationFrame(frame);
        else {
          spinning = false;
          var n = segments.length, arc=(2*Math.PI)/n;
          var a = ((-angle)%(2*Math.PI)+2*Math.PI)%(2*Math.PI);
          var idx = Math.floor(a/arc)%n;
          draw(idx);
          body.querySelector('#sp-result').textContent = segments[idx];
          hist.add({text:segments[idx]});
        }
      }
      requestAnimationFrame(frame);
    }
    body.querySelector('#sp-spin').addEventListener('click', spin);
    hist.mount(body, {title:'Past results', format:function(e){ return {main:e.text}; }});
    body.querySelector('#sp-update').addEventListener('click', function(){
      segments = body.querySelector('#sp-options').value.split('\n').map(function(s){return s.trim();}).filter(Boolean);
      if(segments.length<2) segments=['Option 1','Option 2'];
      draw(-1);
    });
    draw(-1);
  });
}

mountSpinner(document.getElementById('embed-slot'));
