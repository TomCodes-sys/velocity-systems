// tools/color-picker.js — loaded by tools/color-picker.html. Shared helpers come from assets/js/play.js.

/* ---------------- Color Picker (image sampler) ---------------- */
function mountColorPicker(container){
  mountEmbed(container, 'TOOL / COLOR PICKER', function(body){
    body.innerHTML =
      '<input type="file" accept="image/*" id="cp-file" class="tool-row">'+
      '<canvas id="cp-canvas" style="max-width:100%;cursor:crosshair;border:1px solid var(--line)"></canvas>'+
      '<div class="tool-output" id="cp-out">Upload an image, then click it to sample a color.</div>';
    var canvas = body.querySelector('#cp-canvas'), ctx = canvas.getContext('2d');
    body.querySelector('#cp-file').addEventListener('change', function(e){
      var file = e.target.files[0]; if(!file) return;
      var reader = new FileReader();
      reader.onload = function(ev){
        var img = new Image();
        img.onload = function(){ canvas.width = img.width; canvas.height = img.height; ctx.drawImage(img,0,0); };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    });
    canvas.addEventListener('click', function(e){
      var rect = canvas.getBoundingClientRect();
      var x = Math.floor((e.clientX-rect.left) * (canvas.width/rect.width));
      var y = Math.floor((e.clientY-rect.top) * (canvas.height/rect.height));
      var d = ctx.getImageData(x,y,1,1).data;
      var hex = '#'+[d[0],d[1],d[2]].map(function(v){return v.toString(16).padStart(2,'0');}).join('');
      body.querySelector('#cp-out').innerHTML = '<span style="display:inline-block;width:16px;height:16px;background:'+hex+';vertical-align:middle;margin-right:8px"></span>'+hex+' — rgb('+d[0]+', '+d[1]+', '+d[2]+')';
    });
  });
}

mountColorPicker(document.getElementById('embed-slot'));
