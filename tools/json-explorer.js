// tools/json-explorer.js — loaded by tools/json-explorer.html. Shared helpers come from assets/js/play.js.

/* ---------------- JSON Explorer (tree view) ---------------- */
function mountJsonExplorer(container){
  mountEmbed(container, 'TOOL / JSON EXPLORER', function(body){
    body.innerHTML =
      '<textarea class="tool-textarea" id="jx-in">{"name":"Velocity Systems","tools":["Snake","Wordle","Tetris"],"stats":{"games":10,"tools":22}}</textarea>'+
      '<div class="tool-row"><button class="game-btn" id="jx-parse">Parse</button></div>'+
      '<div class="tool-output" id="jx-tree" style="font-family:monospace"></div>';
    function node(val, key, indent){
      var pad = '<span style="display:inline-block;width:'+(indent*16)+'px"></span>';
      if(val===null) return '<div>'+pad+'<b>'+key+'</b>: <span style="color:var(--muted)">null</span></div>';
      if(typeof val !== 'object') return '<div>'+pad+'<b>'+key+'</b>: <span style="color:#36c979">'+JSON.stringify(val)+'</span></div>';
      var isArr = Array.isArray(val);
      var entries = Object.entries(val);
      var header = '<div>'+pad+(key?'<b>'+key+'</b>: ':'')+(isArr?'[':'{')+entries.length+' items'+(isArr?']':'}')+'</div>';
      var children = entries.map(function(e){ return node(e[1], isArr?'['+e[0]+']':e[0], indent+1); }).join('');
      return header + children;
    }
    body.querySelector('#jx-parse').addEventListener('click', function(){
      try {
        var val = JSON.parse(body.querySelector('#jx-in').value);
        body.querySelector('#jx-tree').innerHTML = node(val, '', 0);
      } catch(e){
        body.querySelector('#jx-tree').innerHTML = '<span style="color:#ff535e">Invalid JSON — '+esc(e.message)+'</span>';
      }
    });
    body.querySelector('#jx-parse').click();
  });
}

mountJsonExplorer(document.getElementById('embed-slot'));
