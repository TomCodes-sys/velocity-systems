// tools/calculator.js — loaded by tools/calculator.html. Shared helpers come from assets/js/play.js.

/* ---------------- Calculator ---------------- */
function mountCalculator(container){
  mountEmbed(container, 'TOOL / CALCULATOR', function(body){
    body.innerHTML =
      '<div style="max-width:280px">'+
        '<div class="tool-output" id="calc-expr" style="min-height:16px;text-align:right;color:var(--muted)"></div>'+
        '<div class="tool-output" id="calc-val" style="text-align:right;font-size:22px;font-weight:bold">0</div>'+
        '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin-top:8px">'+
          ['AC','⌫','%','÷','7','8','9','×','4','5','6','−','1','2','3','+','0','.','='].map(function(k){
            var span = k==='0' ? 'grid-column:span 2' : '';
            return '<button class="game-btn'+(['÷','×','−','+','='].indexOf(k)>-1?'':' secondary')+'" data-key="'+k+'" style="'+span+'">'+k+'</button>';
          }).join('')+
        '</div>'+
      '</div>';
    var display='0', op=null, prevVal=null, justEq=false;
    var hist = toolHistory('calculator');
    var exprEl = body.querySelector('#calc-expr'), valEl = body.querySelector('#calc-val');
    function compute(a,b,o){ a=parseFloat(a); b=parseFloat(b); var r = o==='+'?a+b:o==='−'?a-b:o==='×'?a*b:(b!==0?a/b:NaN); return Math.round(r*1e10)/1e10; }
    function press(k){
      if(/[0-9]/.test(k)){
        if(justEq){ display='0'; justEq=false; }
        if(display==='0') display='';
        display += k;
      } else if(k==='.'){
        if(display.indexOf('.')===-1) display += '.';
      } else if(k==='AC'){ display='0'; op=null; prevVal=null; justEq=false; exprEl.textContent=''; }
      else if(k==='⌫'){ display = display.length>1 ? display.slice(0,-1) : '0'; }
      else if(k==='%'){ display = String(parseFloat(display)/100); }
      else if(['÷','×','−','+'].indexOf(k)>-1){
        if(op && !justEq){ display = String(compute(prevVal, display, op)); }
        prevVal = display; op = k; exprEl.textContent = display+' '+k; display='0'; justEq=false; return;
      } else if(k==='='){
        if(op && prevVal!==null){ var r = compute(prevVal, display, op); exprEl.textContent = prevVal+' '+op+' '+display+' ='; hist.add({text:prevVal+' '+op+' '+display, result:String(r)}); display = String(r); op=null; prevVal=null; justEq=true; }
      }
      valEl.textContent = display;
    }
    Array.prototype.slice.call(body.querySelectorAll('[data-key]')).forEach(function(b){ b.addEventListener('click', function(){ press(b.getAttribute('data-key')); }); });
    hist.mount(body, {title:'History', format:function(e){ return {main:e.text+' =', sub:e.result}; }, onPick:function(e){ display = e.result; justEq = true; op = null; prevVal = null; valEl.textContent = display; }});
  });
}

mountCalculator(document.getElementById('embed-slot'));
