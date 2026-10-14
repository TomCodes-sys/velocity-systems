// tools/json-formatter.js — loaded by tools/json-formatter.html. Shared helpers come from assets/js/play.js.

/* JSON Formatter (tool) */
function mountJsonFormatter(container){
  mountEmbed(container, 'TOOL / JSON FORMATTER', function(body){
    body.innerHTML =
      '<textarea class="tool-textarea" id="json-in" placeholder=\'Paste JSON here, e.g. {"a":1,"b":[1,2,3]}\'></textarea>'+
      '<div class="tool-row"><button class="game-btn" id="json-format">Format</button><button class="game-btn secondary" id="json-minify">Minify</button></div>'+
      '<div class="tool-msg" id="json-msg"></div>'+
      '<div class="tool-output" id="json-out" style="display:none"></div>';
    var input = body.querySelector('#json-in');
    var msg = body.querySelector('#json-msg');
    var out = body.querySelector('#json-out');
    function parseOrFail(){
      try {
        var val = JSON.parse(input.value);
        msg.className = 'tool-msg ok'; msg.textContent = 'Valid JSON';
        return val;
      } catch(e){
        msg.className = 'tool-msg err'; msg.textContent = 'Invalid JSON — ' + e.message;
        out.style.display = 'none';
        return undefined;
      }
    }
    body.querySelector('#json-format').addEventListener('click', function(){
      var val = parseOrFail();
      if(val === undefined) return;
      var pretty = JSON.stringify(val, null, 2);
      out.style.display = 'block'; out.textContent = pretty;
      input.value = pretty;
    });
    body.querySelector('#json-minify').addEventListener('click', function(){
      var val = parseOrFail();
      if(val === undefined) return;
      var min = JSON.stringify(val);
      out.style.display = 'block'; out.textContent = min;
      input.value = min;
    });
  });
}

mountJsonFormatter(document.getElementById('embed-slot'));
