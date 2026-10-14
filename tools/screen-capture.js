// tools/screen-capture.js — loaded by tools/screen-capture.html. Shared helpers come from assets/js/play.js.

/* ---------------- Screen Capture ---------------- */
function mountScreenshot(container){
  mountEmbed(container, 'TOOL / SCREEN CAPTURE', function(body){
    body.innerHTML =
      '<div class="tool-row"><button class="game-btn" id="sc-start">Start capture</button></div>'+
      '<canvas id="sc-canvas" style="max-width:100%;border:1px solid var(--line);display:none"></canvas>'+
      '<div class="tool-row"><button class="game-btn secondary" id="sc-download" style="display:none">Download PNG</button></div>'+
      '<div class="tool-msg">Requires browser permission to share your screen. Nothing is uploaded — the image stays in this tab.</div>';
    var canvas = body.querySelector('#sc-canvas'), ctx = canvas.getContext('2d');
    body.querySelector('#sc-start').addEventListener('click', function(){
      if(!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia){
        body.querySelector('.tool-msg').textContent = 'Screen capture is not supported in this browser.';
        return;
      }
      navigator.mediaDevices.getDisplayMedia({video:true}).then(function(stream){
        var video = document.createElement('video');
        video.srcObject = stream;
        video.play();
        video.addEventListener('loadedmetadata', function(){
          setTimeout(function(){
            canvas.width = video.videoWidth; canvas.height = video.videoHeight;
            ctx.drawImage(video,0,0);
            stream.getTracks().forEach(function(t){ t.stop(); });
            canvas.style.display = 'block';
            body.querySelector('#sc-download').style.display = 'inline-block';
          }, 200);
        });
      }).catch(function(){ body.querySelector('.tool-msg').textContent = 'Capture cancelled or denied.'; });
    });
    body.querySelector('#sc-download').addEventListener('click', function(){
      var a = document.createElement('a'); a.download='screenshot.png'; a.href = canvas.toDataURL('image/png'); a.click();
    });
  });
}

mountScreenshot(document.getElementById('embed-slot'));
