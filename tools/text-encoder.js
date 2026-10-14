// tools/text-encoder.js — loaded by tools/text-encoder.html. Shared helpers come from assets/js/play.js.

/* ---------------- Base64 / Text Encoder ---------------- */
function mountBase64(container){
  mountEmbed(container, 'TOOL / TEXT ENCODER', function(body){
    var MODES = {
      base64: {encode:function(v){try{return btoa(unescape(encodeURIComponent(v)));}catch(e){return 'Error: invalid input';}}, decode:function(v){try{return decodeURIComponent(escape(atob(v)));}catch(e){return 'Error: invalid Base64';}}},
      url: {encode:function(v){return encodeURIComponent(v);}, decode:function(v){try{return decodeURIComponent(v);}catch(e){return 'Error: invalid URL encoding';}}},
      html: {encode:function(v){return v.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}, decode:function(v){return v.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"');}},
      hex: {encode:function(v){return Array.prototype.map.call(v,function(c){return c.charCodeAt(0).toString(16).padStart(2,'0');}).join(' ');}, decode:function(v){try{return v.split(/\s+/).filter(Boolean).map(function(h){return String.fromCharCode(parseInt(h,16));}).join('');}catch(e){return 'Error: invalid hex';}}},
      rot13: {encode:function(v){return v.replace(/[a-zA-Z]/g,function(c){var b=c<='Z'?65:97;return String.fromCharCode((c.charCodeAt(0)-b+13)%26+b);});}, decode:function(v){return MODES.rot13.encode(v);}},
    };
    body.innerHTML =
      '<div class="tool-row" id="b64-tabs"></div>'+
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'+
        '<div><div class="tool-msg">Input</div><textarea class="tool-textarea" id="b64-in"></textarea></div>'+
        '<div><div class="tool-msg">Output</div><textarea class="tool-textarea" id="b64-out"></textarea></div>'+
      '</div>'+
      '<div class="tool-row"><button class="game-btn" id="b64-swap">Swap</button><button class="game-btn secondary" id="b64-copy">Copy output</button></div>';
    var mode = 'base64';
    var tabs = body.querySelector('#b64-tabs'), input = body.querySelector('#b64-in'), output = body.querySelector('#b64-out');
    function renderTabs(){
      tabs.innerHTML = Object.keys(MODES).map(function(m){ return '<button class="game-btn'+(m===mode?'':' secondary')+'" data-mode="'+m+'">'+m.toUpperCase()+'</button>'; }).join('');
      Array.prototype.slice.call(tabs.querySelectorAll('[data-mode]')).forEach(function(b){ b.addEventListener('click', function(){ mode = b.getAttribute('data-mode'); renderTabs(); encodeNow(); }); });
    }
    function encodeNow(){ output.value = MODES[mode].encode(input.value); }
    input.addEventListener('input', encodeNow);
    output.addEventListener('input', function(){ input.value = MODES[mode].decode(output.value); });
    body.querySelector('#b64-swap').addEventListener('click', function(){ var t=input.value; input.value=output.value; output.value=t; encodeNow(); });
    body.querySelector('#b64-copy').addEventListener('click', function(){ navigator.clipboard.writeText(output.value); });
    renderTabs();
  });
}

mountBase64(document.getElementById('embed-slot'));
