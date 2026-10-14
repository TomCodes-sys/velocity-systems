// tools/unit-converter.js — loaded by tools/unit-converter.html. Shared helpers come from assets/js/play.js.

/* ---------------- Advanced Unit Converter (replaces basic one) ---------------- */
function mountAdvancedConverter(container){
  mountEmbed(container, 'TOOL / UNIT CONVERTER', function(body){
    var CATS = {
      Length: {units:['mm','cm','m','km','in','ft','yd','mi'], toBase:[0.001,0.01,1,1000,0.0254,0.3048,0.9144,1609.344]},
      Weight: {units:['mg','g','kg','t','oz','lb'], toBase:[0.000001,0.001,1,1000,0.0283495,0.453592]},
      Storage: {units:['b','B','KB','MB','GB','TB'], toBase:[1/8,1,1024,1048576,1073741824,1099511627776]},
      Temperature: {units:['°C','°F','K'], special:true},
      Speed: {units:['m/s','km/h','mph','knot'], toBase:[1,0.277778,0.44704,0.514444]},
      Time: {units:['ms','s','min','hr','day'], toBase:[0.001,1,60,3600,86400]},
    };
    body.innerHTML =
      '<div class="tool-row" id="conv-tabs"></div>'+
      '<div id="conv-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px"></div>';
    var currentCat = lsGet('vs-converter-cat', 'Length');
    if(!CATS[currentCat]) currentCat = 'Length';
    var tabs = body.querySelector('#conv-tabs'), grid = body.querySelector('#conv-grid');
    var lock = false;
    function renderTabs(){
      tabs.innerHTML = Object.keys(CATS).map(function(c){ return '<button class="game-btn'+(c===currentCat?'':' secondary')+'" data-cat="'+c+'">'+c+'</button>'; }).join('');
      Array.prototype.slice.call(tabs.querySelectorAll('[data-cat]')).forEach(function(b){ b.addEventListener('click', function(){ currentCat = b.getAttribute('data-cat'); lsSet('vs-converter-cat', currentCat); renderTabs(); buildGrid(); }); });
    }
    function buildGrid(){
      var cat = CATS[currentCat];
      grid.innerHTML = cat.units.map(function(u,i){
        return '<div><div class="tool-msg">'+u+'</div><input type="number" class="tool-textarea" style="min-height:auto;padding:8px" data-idx="'+i+'" placeholder="0"></div>';
      }).join('');
      Array.prototype.slice.call(grid.querySelectorAll('[data-idx]')).forEach(function(inp){
        inp.addEventListener('input', function(){ convertFrom(parseInt(this.getAttribute('data-idx'),10), this.value); });
      });
    }
    function convertFrom(fromIdx, val){
      if(lock) return;
      lock = true;
      var cat = CATS[currentCat];
      var v = parseFloat(val);
      if(isNaN(v)){ lock=false; return; }
      var base;
      if(cat.special){
        base = fromIdx===0 ? v : fromIdx===1 ? (v-32)*5/9 : v-273.15;
      } else { base = v * cat.toBase[fromIdx]; }
      Array.prototype.slice.call(grid.querySelectorAll('[data-idx]')).forEach(function(inp,i){
        if(i===fromIdx) return;
        var result;
        if(cat.special){ result = i===0?base : i===1?base*9/5+32 : base+273.15; }
        else { result = base / cat.toBase[i]; }
        inp.value = isFinite(result) ? parseFloat(result.toPrecision(8)) : '';
      });
      lock = false;
    }
    renderTabs(); buildGrid();
  });
}

mountAdvancedConverter(document.getElementById('embed-slot'));
