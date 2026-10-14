// tools/palette-generator.js — loaded by tools/palette-generator.html. Shared helpers come from assets/js/play.js.

/* ---------------- Palette Generator ---------------- */
function mountPaletteGenerator(container){
  mountEmbed(container, 'TOOL / COLOR PALETTE', function(body){
    body.innerHTML =
      '<div id="pal-swatches" style="display:grid;grid-template-columns:repeat(5,1fr);gap:4px;margin-bottom:12px"></div>'+
      '<div class="tool-row"><button class="game-btn" id="pal-gen">Generate</button></div>'+
      '<div class="tool-output" id="pal-out"></div>';
    var colors = [];
    function rand(min,max){ return min+Math.random()*(max-min); }
    function hslToHex(h,s,l){
      h/=360; s/=100; l/=100;
      function hue2rgb(p,q,t){ if(t<0)t+=1; if(t>1)t-=1; if(t<1/6)return p+(q-p)*6*t; if(t<1/2)return q; if(t<2/3)return p+(q-p)*(2/3-t)*6; return p; }
      var r,g,b;
      if(s===0){ r=g=b=l; } else { var q=l<0.5?l*(1+s):l+s-l*s, p=2*l-q; r=hue2rgb(p,q,h+1/3); g=hue2rgb(p,q,h); b=hue2rgb(p,q,h-1/3); }
      return '#'+[r,g,b].map(function(x){ return Math.round(x*255).toString(16).padStart(2,'0'); }).join('');
    }
    function generate(){
      colors = [];
      for(var i=0;i<5;i++) colors.push(hslToHex(rand(0,360), rand(40,80), rand(30,65)));
      body.querySelector('#pal-swatches').innerHTML = colors.map(function(c){ return '<div style="aspect-ratio:1;background:'+c+';cursor:pointer" data-c="'+c+'"></div>'; }).join('');
      Array.prototype.slice.call(body.querySelectorAll('[data-c]')).forEach(function(el){ el.addEventListener('click', function(){ navigator.clipboard.writeText(el.getAttribute('data-c')); }); });
      body.querySelector('#pal-out').textContent = colors.join('  ');
    }
    body.querySelector('#pal-gen').addEventListener('click', generate);
    generate();
  });
}

mountPaletteGenerator(document.getElementById('embed-slot'));
