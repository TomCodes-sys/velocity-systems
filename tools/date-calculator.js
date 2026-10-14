// tools/date-calculator.js — loaded by tools/date-calculator.html.
// Dates are handled as UTC midnights so daylight-saving changes never skew day counts.

function mountDateCalc(container){
  mountEmbed(container, 'TOOL / DATE CALCULATOR', function(body){
    var today = new Date().toISOString().slice(0, 10);
    body.innerHTML =
      '<div class="result-card"><div class="field-label" style="margin-bottom:10px">Difference between two dates</div>'+
        '<div class="tool-grid two"><div class="field"><label for="dc-a">From</label><input id="dc-a" type="date"></div><div class="field"><label for="dc-b">To</label><input id="dc-b" type="date"></div></div>'+
        '<div id="dc-diff" class="mono-out"></div></div>'+
      '<div class="result-card"><div class="field-label" style="margin-bottom:10px">Add or subtract time</div>'+
        '<div class="tool-grid"><div class="field"><label for="dc-base">Start date</label><input id="dc-base" type="date"></div>'+
        '<div class="field"><label for="dc-op">Operation</label><select id="dc-op"><option value="1">Add</option><option value="-1">Subtract</option></select></div>'+
        '<div class="field"><label for="dc-n">Amount</label><input id="dc-n" type="number" value="30"></div>'+
        '<div class="field"><label for="dc-unit">Unit</label><select id="dc-unit"><option value="d">Days</option><option value="w">Weeks</option><option value="m">Months</option><option value="y">Years</option></select></div></div>'+
        '<div id="dc-add" class="result-big" style="font-size:24px"></div></div>';
    var $ = function(s){ return body.querySelector(s); };
    if(!$('#dc-a').value) $('#dc-a').value = today;
    if(!$('#dc-base').value) $('#dc-base').value = today;
    var hist = toolHistory('date-calculator', {same:function(a, b){ return a.text === b.text; }});
    var DAY = 86400000, WD = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    function utc(s){ var p = s.split('-'); return new Date(Date.UTC(+p[0], p[1] - 1, +p[2])); }
    function show(d){ return WD[d.getUTCDay()] + ', ' + d.getUTCDate() + ' ' + d.toLocaleString('en-AU', {month:'long', timeZone:'UTC'}) + ' ' + d.getUTCFullYear(); }
    function diff(save){
      var a = $('#dc-a').value, b = $('#dc-b').value, out = $('#dc-diff');
      if(!a || !b){ out.textContent = 'Pick two dates.'; return; }
      var A = utc(a), B = utc(b), neg = B < A; if(neg){ var t = A; A = B; B = t; }
      var days = Math.round((B - A) / DAY);
      var y = B.getUTCFullYear() - A.getUTCFullYear(), m = B.getUTCMonth() - A.getUTCMonth(), d = B.getUTCDate() - A.getUTCDate();
      if(d < 0){ m--; d += new Date(Date.UTC(B.getUTCFullYear(), B.getUTCMonth(), 0)).getUTCDate(); }
      if(m < 0){ y--; m += 12; }
      var text = (neg ? 'Earlier by ' : '') + y + ' years, ' + m + ' months, ' + d + ' days';
      out.textContent = days.toLocaleString() + ' days total  (' + Math.floor(days / 7) + ' weeks, ' + days % 7 + ' days)\n' + text;
      if(save) hist.add({text:a + ' → ' + b + ' = ' + days + ' days', sub:text});
    }
    function add(save){
      var base = $('#dc-base').value, n = parseInt($('#dc-n').value, 10), out = $('#dc-add');
      if(!base || isNaN(n)){ out.textContent = '—'; return; }
      var d = utc(base), k = n * (+$('#dc-op').value), u = $('#dc-unit').value;
      if(u === 'd') d = new Date(d.getTime() + k * DAY);
      else if(u === 'w') d = new Date(d.getTime() + k * 7 * DAY);
      else {
        var day = d.getUTCDate(); d.setUTCDate(1);
        if(u === 'm') d.setUTCMonth(d.getUTCMonth() + k); else d.setUTCFullYear(d.getUTCFullYear() + k);
        var last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate(); d.setUTCDate(Math.min(day, last));
      }
      out.textContent = show(d);
      if(save) hist.add({text:base + (k < 0 ? ' − ' : ' + ') + Math.abs(n) + ' ' + $('#dc-unit').selectedOptions[0].text.toLowerCase() + ' = ' + d.toISOString().slice(0, 10), sub:show(d)});
    }
    body.addEventListener('input', function(){ diff(false); add(false); });
    body.addEventListener('change', function(){ diff(true); add(true); });
    hist.mount(body, {title:'History', format:function(e){ return {main:e.text, sub:e.sub}; }});
    diff(false); add(false);
  });
}

mountDateCalc(document.getElementById('embed-slot'));
