// tools/percentage-calculator.js — loaded by tools/percentage-calculator.html.

function mountPercentCalc(container){
  mountEmbed(container, 'TOOL / PERCENTAGE CALCULATOR', function(body){
    var CARDS = [
      {id:'p1', title:'What is X% of Y?', a:'Percent (X)', b:'Of (Y)',
       run:function(a,b){ var r = a / 100 * b; return {main:fmtN(r), text:a+'% of '+b+' = '+fmtN(r)}; }},
      {id:'p2', title:'X is what % of Y?', a:'Value (X)', b:'Total (Y)',
       run:function(a,b){ if(b === 0) return null; var r = a / b * 100; return {main:fmtN(r)+'%', text:a+' is '+fmtN(r)+'% of '+b}; }},
      {id:'p3', title:'% change from X to Y', a:'From (X)', b:'To (Y)',
       run:function(a,b){ if(a === 0) return null; var r = (b - a) / Math.abs(a) * 100; return {main:(r > 0 ? '+' : '')+fmtN(r)+'%', text:a+' → '+b+' is '+(r > 0 ? '+' : '')+fmtN(r)+'%'}; }},
      {id:'p4', title:'Increase Y by X%', a:'Percent (X)', b:'Amount (Y)',
       run:function(a,b){ var r = b * (1 + a / 100); return {main:fmtN(r), text:b+' + '+a+'% = '+fmtN(r)}; }},
      {id:'p5', title:'Decrease Y by X%', a:'Percent (X)', b:'Amount (Y)',
       run:function(a,b){ var r = b * (1 - a / 100); return {main:fmtN(r), text:b+' − '+a+'% = '+fmtN(r)}; }},
      {id:'p6', title:'Y is X% of what?', a:'Percent (X)', b:'Value (Y)',
       run:function(a,b){ if(a === 0) return null; var r = b / (a / 100); return {main:fmtN(r), text:b+' is '+a+'% of '+fmtN(r)}; }},
    ];
    function fmtN(n){ return String(Math.round(n * 1e8) / 1e8); }
    body.innerHTML = '<div class="tool-grid">'+CARDS.map(function(c){
      return '<div class="result-card" style="margin:0"><div class="field-label" style="margin-bottom:10px">'+c.title+'</div>'+
        '<div class="tool-grid two" style="margin-bottom:10px"><div class="field"><label for="'+c.id+'a">'+c.a+'</label><input id="'+c.id+'a" inputmode="decimal" autocomplete="off"></div>'+
        '<div class="field"><label for="'+c.id+'b">'+c.b+'</label><input id="'+c.id+'b" inputmode="decimal" autocomplete="off"></div></div>'+
        '<div class="result-big" id="'+c.id+'r" style="font-size:26px">—</div></div>';
    }).join('')+'</div>';

    var hist = toolHistory('percentage-calculator', {same:function(a,b){ return a.text === b.text; }});
    function calc(c, save){
      var a = parseFloat(body.querySelector('#'+c.id+'a').value), b = parseFloat(body.querySelector('#'+c.id+'b').value);
      var out = body.querySelector('#'+c.id+'r');
      if(isNaN(a) || isNaN(b)){ out.textContent = '—'; return; }
      var r = c.run(a, b);
      if(!r){ out.textContent = 'n/a'; return; }
      out.textContent = r.main;
      if(save) hist.add({text:r.text, main:r.main});
    }
    CARDS.forEach(function(c){
      ['a','b'].forEach(function(k){
        var el = body.querySelector('#'+c.id+k);
        el.addEventListener('input', function(){ calc(c, false); });
        el.addEventListener('change', function(){ calc(c, true); });
      });
      calc(c, false);
    });
    hist.mount(body, {title:'History', format:function(e){ return {main:e.text}; }});
  });
}

mountPercentCalc(document.getElementById('embed-slot'));
