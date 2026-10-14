// tools/image-converter.js — loaded by tools/image-converter.html. Shared helpers come from assets/js/play.js.

/* ---------------- Image Format Converter ---------------- */
function mountImageConverter(container){
  mountEmbed(container, 'TOOL / IMAGE CONVERTER', function(body){
    body.innerHTML =
      '<input type="file" accept="image/*" id="ic-file" class="tool-row">'+
      '<div class="tool-row"><select id="ic-fmt"><option value="image/png">PNG</option><option value="image/jpeg">JPEG</option><option value="image/webp">WebP</option></select></div>'+
      '<canvas id="ic-canvas" style="max-width:100%;border:1px solid var(--line)"></canvas>'+
      '<div class="tool-row"><button class="game-btn" id="ic-download">Download</button></div>';
    var canvas = body.querySelector('#ic-canvas'), ctx = canvas.getContext('2d'), img=null;
    body.querySelector('#ic-file').addEventListener('change', function(e){
      var file = e.target.files[0]; if(!file) return;
      var reader = new FileReader();
      reader.onload = function(ev){
        img = new Image();
        img.onload = function(){ canvas.width=img.width; canvas.height=img.height; ctx.drawImage(img,0,0); };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    });
    body.querySelector('#ic-download').addEventListener('click', function(){
      if(!img) return;
      var fmt = body.querySelector('#ic-fmt').value;
      var ext = fmt==='image/png'?'png':fmt==='image/jpeg'?'jpg':'webp';
      var a = document.createElement('a'); a.download='converted.'+ext; a.href = canvas.toDataURL(fmt, 0.92); a.click();
    });
  });
}

mountImageConverter(document.getElementById('embed-slot'));
