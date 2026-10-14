// tools/split-bill.js — loaded by tools/split-bill.html.

function mountSplitBill(container){
  mountEmbed(container, 'TOOL / TIP & SPLIT', function(body){
    body.innerHTML =
      '<div class="tool-grid">'+
        '<div class="field"><label for="sb-bill">Bill total</label><input id="sb-bill" inputmode="decimal" placeholder="0.00" autocomplete="off"></div>'+
        '<div class="field"><label for="sb-tip">Tip %</label><input id="sb-tip" inputmode="decimal" value="10" autocomplete="off"></div>'+
        '<div class="field"><label for="sb-people">People</label><input id="sb-people" type="number" min="1" max="100" value="2"></div>'+
      '</div>'+
      '<div class="tool-row"><span class="seg" id="sb-presets">'+[0,5,10,15,20].map(function(p){ return '<button type="button" data-tip="'+p+'">'+p+'%</button>'; }).join('')+'</span>'+
        '<label><input type="checkbox" id="sb-round"> Round each share up to the next dollar</label></div>'+
      '<div class="result-card" id="sb-out"></div>';
    var $ = function(s){ return body.querySelector(s); };
    function money(n){ return n.toLocaleString(undefined, {style:'currency', currency:'AUD'}); }
    function calc(){
      var bill = parseFloat($('#sb-bill').value), tip = parseFloat($('#sb-tip').value) || 0;
      var n = Math.max(1, Math.min(100, parseInt($('#sb-people').value, 10) || 1));
      Array.prototype.forEach.call(body.querySelectorAll('[data-tip]'), function(b){ b.classList.toggle('on', parseFloat(b.getAttribute('data-tip')) === tip); });
      if(isNaN(bill) || bill < 0){ $('#sb-out').innerHTML = '<div class="result-sub">Enter the bill total to see each person’s share.</div>'; return; }
      var tipAmt = bill * tip / 100, total = bill + tipAmt, share = total / n;
      if($('#sb-round').checked) share = Math.ceil(share);
      var paid = share * n;
      $('#sb-out').innerHTML = '<div class="result-sub">Each person pays</div><div class="result-big">'+money(share)+'</div>'+
        '<dl class="kv" style="margin-top:12px"><dt>Tip</dt><dd>'+money(tipAmt)+'</dd><dt>Total</dt><dd>'+money(total)+'</dd><dt>Collected</dt><dd>'+money(paid)+(paid > total + .005 ? ' (+'+money(paid - total)+' extra)' : '')+'</dd></dl>';
    }
    $('#sb-presets').addEventListener('click', function(e){
      var b = e.target.closest('[data-tip]'); if(!b) return;
      $('#sb-tip').value = b.getAttribute('data-tip'); $('#sb-tip').dispatchEvent(new Event('input', {bubbles:true}));
    });
    body.addEventListener('input', calc); body.addEventListener('change', calc);
    calc();
  });
}

mountSplitBill(document.getElementById('embed-slot'));
