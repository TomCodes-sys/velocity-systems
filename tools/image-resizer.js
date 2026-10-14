// tools/image-resizer.js — loaded by tools/image-resizer.html. Shared helpers come from assets/js/play.js.

/* ---------------- Image Resizer ---------------- */
function mountImageResizer(container){
  mountEmbed(container, 'TOOL / IMAGE RESIZER', function(body){
    body.innerHTML =
      '<input type="file" accept="image/*" id="rz-file" class="tool-row">'+
      '<div class="tool-row"><label style="font:11px monospace">Width <input type="number" id="rz-w" value="800" style="width:80px"></label>'+
      '<label style="font:11px monospace">Height <input type="number" id="rz-h" value="600" style="width:80px"></label></div>'+
      '<canvas id="rz-canvas" style="max-width:100%;border:1px solid var(--line)"></canvas>'+
      '<div class="tool-row"><button class="game-btn" id="rz-download">Download</button></div>';
    var canvas = body.querySelector('#rz-canvas'), ctx = canvas.getContext('2d'), img=null;
    body.querySelector('#rz-file').addEventListener('change', function(e){
      var file = e.target.files[0]; if(!file) return;
      var reader = new FileReader();
      reader.onload = function(ev){
        img = new Image();
        img.onload = function(){
          body.querySelector('#rz-w').value = img.width;
          body.querySelector('#rz-h').value = img.height;
          render();
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    });
    function render(){
      if(!img) return;
      var w = parseInt(body.querySelector('#rz-w').value,10) || img.width;
      var h = parseInt(body.querySelector('#rz-h').value,10) || img.height;
      canvas.width = w; canvas.height = h;
      ctx.drawImage(img,0,0,w,h);
    }
    ['rz-w','rz-h'].forEach(function(id){ body.querySelector('#'+id).addEventListener('input', render); });
    body.querySelector('#rz-download').addEventListener('click', function(){
      if(!img) return;
      var a = document.createElement('a'); a.download='resized.png'; a.href = canvas.toDataURL('image/png'); a.click();
    });
  });
}

mountImageResizer(document.getElementById('embed-slot'));
