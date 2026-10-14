// tools/gradient-generator.js — loaded by tools/gradient-generator.html. Shared helpers come from assets/js/play.js.

/* ---------------- Gradient Generator ---------------- */
function mountGradientGenerator(container){
  mountEmbed(container, 'TOOL / CSS GRADIENT', function(body){
    body.innerHTML =
      '<div id="grad-preview" style="height:120px;border:1px solid var(--line);margin-bottom:12px"></div>'+
      '<div class="tool-row">'+
        '<input type="color" id="grad-c1" value="#3b82f6"><input type="color" id="grad-c2" value="#9b7bff">'+
        '<label style="font:11px monospace">Angle <input type="range" id="grad-angle" min="0" max="360" value="135"></label>'+
      '</div>'+
      '<div class="tool-output" id="grad-out" style="cursor:pointer"></div>';
    function update(){
      var c1=body.querySelector('#grad-c1').value, c2=body.querySelector('#grad-c2').value, ang=body.querySelector('#grad-angle').value;
      var css = 'linear-gradient('+ang+'deg, '+c1+', '+c2+')';
      body.querySelector('#grad-preview').style.background = css;
      body.querySelector('#grad-out').textContent = 'background: '+css+';';
    }
    ['grad-c1','grad-c2','grad-angle'].forEach(function(id){ body.querySelector('#'+id).addEventListener('input', update); });
    body.querySelector('#grad-out').addEventListener('click', function(){ navigator.clipboard.writeText(this.textContent); });
    update();
  });
}

mountGradientGenerator(document.getElementById('embed-slot'));
