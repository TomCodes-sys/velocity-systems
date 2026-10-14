// tools/qr-generator.js — loaded by tools/qr-generator.html. Shared helpers come from assets/js/play.js.

/* ---------------- QR Generator (lazy-loads a small external encoder) ---------------- */
function mountQRGenerator(container){
  mountEmbed(container, 'TOOL / QR GENERATOR', function(body){
    body.innerHTML =
      '<textarea class="tool-textarea" id="qr-in" style="min-height:60px" placeholder="https://example.com"></textarea>'+
      '<div class="tool-row"><button class="game-btn" id="qr-gen">Generate</button></div>'+
      '<div id="qr-out"></div>'+
      '<div class="tool-msg" id="qr-msg"></div>';
    function ensureLib(cb){
      if(window.QRCode){ cb(); return; }
      var s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
      s.onload = cb;
      s.onerror = function(){ body.querySelector('#qr-msg').textContent = 'Could not load the QR library — check your internet connection.'; };
      document.head.appendChild(s);
    }
    body.querySelector('#qr-gen').addEventListener('click', function(){
      var text = body.querySelector('#qr-in').value.trim();
      if(!text) return;
      ensureLib(function(){
        var out = body.querySelector('#qr-out');
        out.innerHTML = '';
        new QRCode(out, {text:text, width:200, height:200});
        body.querySelector('#qr-msg').textContent = '';
      });
    });
  });
}

mountQRGenerator(document.getElementById('embed-slot'));
