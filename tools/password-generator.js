// tools/password-generator.js — loaded by tools/password-generator.html. Shared helpers come from assets/js/play.js.

/* ---------------- Password Generator ---------------- */
function mountPasswordGenerator(container){
  mountEmbed(container, 'TOOL / PASSWORD GENERATOR', function(body){
    body.innerHTML =
      '<div class="tool-output" id="pw-out" style="cursor:pointer;font-size:15px;letter-spacing:1px">Click Generate</div>'+
      '<div class="tool-row">'+
        '<label style="font:11px monospace">Length <span id="pw-len-val">20</span> <input type="range" id="pw-len" min="6" max="64" value="20"></label>'+
      '</div>'+
      '<div class="tool-row">'+
        '<label style="font:11px monospace"><input type="checkbox" id="pw-upper" checked> Uppercase</label>'+
        '<label style="font:11px monospace"><input type="checkbox" id="pw-lower" checked> Lowercase</label>'+
        '<label style="font:11px monospace"><input type="checkbox" id="pw-num" checked> Numbers</label>'+
        '<label style="font:11px monospace"><input type="checkbox" id="pw-sym" checked> Symbols</label>'+
      '</div>'+
      '<div class="tool-row"><button class="game-btn" id="pw-gen">Generate</button><button class="game-btn secondary" id="pw-copy">Copy</button></div>'+
      '<div class="tool-msg" id="pw-strength"></div>';
    var UPPER='ABCDEFGHIJKLMNOPQRSTUVWXYZ', LOWER='abcdefghijklmnopqrstuvwxyz', NUMS='0123456789', SYMS='!@#$%^&*()-_=+[]{}|;:,.<>?';
    function generate(){
      var len = parseInt(body.querySelector('#pw-len').value,10);
      var pool = '';
      if(body.querySelector('#pw-upper').checked) pool += UPPER;
      if(body.querySelector('#pw-lower').checked) pool += LOWER;
      if(body.querySelector('#pw-num').checked) pool += NUMS;
      if(body.querySelector('#pw-sym').checked) pool += SYMS;
      if(!pool) pool = LOWER + NUMS;
      var pw = '';
      for(var i=0;i<len;i++) pw += pool[Math.floor(Math.random()*pool.length)];
      body.querySelector('#pw-out').textContent = pw;
      var score = 0;
      if(pw.length>=12) score++; if(pw.length>=16) score++; if(pw.length>=20) score++;
      if(/[A-Z]/.test(pw)) score++; if(/[a-z]/.test(pw)) score++; if(/[0-9]/.test(pw)) score++; if(/[^A-Za-z0-9]/.test(pw)) score++;
      var labels = ['Very weak','Weak','Fair','Strong','Very strong'];
      var idx = Math.min(4, Math.floor(score/7*5));
      body.querySelector('#pw-strength').textContent = labels[idx]+' — ~'+Math.round(pw.length*Math.log2(Math.max(pool.length,2)))+' bits entropy';
    }
    body.querySelector('#pw-len').addEventListener('input', function(){ body.querySelector('#pw-len-val').textContent=this.value; generate(); });
    ['pw-upper','pw-lower','pw-num','pw-sym'].forEach(function(id){ body.querySelector('#'+id).addEventListener('change', generate); });
    body.querySelector('#pw-gen').addEventListener('click', generate);
    body.querySelector('#pw-copy').addEventListener('click', function(){ navigator.clipboard.writeText(body.querySelector('#pw-out').textContent); });
    body.querySelector('#pw-out').addEventListener('click', function(){ navigator.clipboard.writeText(this.textContent); });
    generate();
  });
}

mountPasswordGenerator(document.getElementById('embed-slot'));
