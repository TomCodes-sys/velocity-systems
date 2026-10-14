// tools/contrast-checker.js — loaded by tools/contrast-checker.html.

function mountContrast(container){
  mountEmbed(container, 'TOOL / CONTRAST CHECKER', function(body){
    body.innerHTML =
      '<div class="tool-grid"><div class="field"><label for="cc-fg">Text colour</label><input id="cc-fg" type="color" class="big" value="#eef0f4"></div>'+
      '<div class="field"><label for="cc-bg">Background colour</label><input id="cc-bg" type="color" class="big" value="#0b0c0f"></div>'+
      '<div class="field"><span class="field-label">&nbsp;</span><button class="game-btn secondary" id="cc-swap" style="height:42px">⇄ Swap</button></div></div>'+
      '<div class="contrast-preview" id="cc-prev"><b>Sample heading</b>The quick brown fox jumps over the lazy dog.</div>'+
      '<div class="result-card"><div class="result-big" id="cc-ratio"></div><div class="result-sub">contrast ratio</div>'+
      '<dl class="kv" style="margin-top:14px"><dt>Normal text</dt><dd class="badge-row" id="cc-n"></dd><dt>Large text</dt><dd class="badge-row" id="cc-l"></dd><dt>UI components</dt><dd class="badge-row" id="cc-u"></dd></dl></div>';
    var $ = function(s){ return body.querySelector(s); };
    function lum(hex){
      var c = [1, 3, 5].map(function(i){ var v = parseInt(hex.substr(i, 2), 16) / 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); });
      return .2126 * c[0] + .7152 * c[1] + .0722 * c[2];
    }
    function badge(ok, label){ return '<span class="'+(ok ? 'pass' : 'fail')+'">'+label+' '+(ok ? 'PASS' : 'FAIL')+'</span>'; }
    function update(){
      var fg = $('#cc-fg').value, bg = $('#cc-bg').value, a = lum(fg), b = lum(bg);
      var r = (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
      $('#cc-ratio').textContent = (Math.floor(r * 100) / 100).toFixed(2) + ' : 1';
      $('#cc-prev').style.cssText = 'color:'+fg+';background:'+bg;
      $('#cc-n').innerHTML = badge(r >= 4.5, 'AA') + badge(r >= 7, 'AAA');
      $('#cc-l').innerHTML = badge(r >= 3, 'AA') + badge(r >= 4.5, 'AAA');
      $('#cc-u').innerHTML = badge(r >= 3, 'AA');
    }
    $('#cc-swap').addEventListener('click', function(){
      var t = $('#cc-fg').value; $('#cc-fg').value = $('#cc-bg').value; $('#cc-bg').value = t;
      $('#cc-fg').dispatchEvent(new Event('input', {bubbles:true})); update();
    });
    body.addEventListener('input', update); update();
  });
}

mountContrast(document.getElementById('embed-slot'));
