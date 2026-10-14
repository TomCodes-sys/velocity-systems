// tools/watermark-tool.js — loaded by tools/watermark-tool.html. Shared helpers come from assets/js/play.js.

/* ---------------- Watermark Tool ---------------- */
function mountWatermark(container){
  mountEmbed(container, 'TOOL / WATERMARK', function(body){
    body.innerHTML =
      '<input type="file" accept="image/*" id="wm-file" class="tool-row">'+
      '<div class="tool-row"><input type="text" id="wm-text" value="© Velocity Systems" style="flex:1"><input type="color" id="wm-color" value="#ffffff"></div>'+
      '<canvas id="wm-canvas" style="max-width:100%;border:1px solid var(--line)"></canvas>'+
      '<div class="tool-row"><button class="game-btn" id="wm-download">Download</button></div>';
    var canvas = body.querySelector('#wm-canvas'), ctx = canvas.getContext('2d'), img=null;
    body.querySelector('#wm-file').addEventListener('change', function(e){
      var file = e.target.files[0]; if(!file) return;
      var reader = new FileReader();
      reader.onload = function(ev){ img = new Image(); img.onload = render; img.src = ev.target.result; };
      reader.readAsDataURL(file);
    });
    function render(){
      if(!img) return;
      canvas.width = img.width; canvas.height = img.height;
      ctx.drawImage(img,0,0);
      var text = body.querySelector('#wm-text').value;
      ctx.font = 'bold '+Math.round(img.width*0.04)+'px sans-serif';
      ctx.fillStyle = body.querySelector('#wm-color').value;
      ctx.globalAlpha = 0.7;
      ctx.textAlign = 'right';
      ctx.fillText(text, img.width-20, img.height-20);
      ctx.globalAlpha = 1;
    }
    ['wm-text','wm-color'].forEach(function(id){ body.querySelector('#'+id).addEventListener('input', render); });
    body.querySelector('#wm-download').addEventListener('click', function(){
      if(!img) return;
      var a = document.createElement('a'); a.download='watermarked.png'; a.href = canvas.toDataURL('image/png'); a.click();
    });
  });
}

mountWatermark(document.getElementById('embed-slot'));
