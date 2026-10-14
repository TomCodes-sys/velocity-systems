// tools/fraction-calculator.js — loaded by tools/fraction-calculator.html.
// Exact fraction arithmetic using BigInt, so large numerators never lose precision.

function mountFractionCalc(container){
  mountEmbed(container, 'TOOL / FRACTION CALCULATOR', function(body){
    var OPS = {'+':'Add', '-':'Subtract', '×':'Multiply', '÷':'Divide'};
    function fracIn(p, label){
      return '<div class="field"><span class="field-label">'+label+'</span><div class="frac-in">'+
        '<input class="whole" id="'+p+'-w" inputmode="numeric" placeholder="0" autocomplete="off" aria-label="'+label+' whole number">'+
        '<div class="frac-stack"><input id="'+p+'-n" inputmode="numeric" placeholder="num" autocomplete="off" aria-label="'+label+' numerator"><hr>'+
        '<input id="'+p+'-d" inputmode="numeric" placeholder="den" autocomplete="off" aria-label="'+label+' denominator"></div></div></div>';
    }
    body.innerHTML =
      '<div class="frac-row">'+fracIn('a','First')+
        '<div class="field"><span class="field-label">Operation</span><div class="frac-ops" id="fc-ops">'+
          Object.keys(OPS).map(function(o){ return '<button type="button" data-op="'+o+'" title="'+OPS[o]+'" aria-label="'+OPS[o]+'">'+o+'</button>'; }).join('')+
        '</div><select id="fc-op" style="display:none"><option>+</option><option>-</option><option>×</option><option>÷</option></select></div>'+
        fracIn('b','Second')+'</div>'+
      '<div class="err-text" id="fc-err" role="alert"></div>'+
      '<div class="result-card" id="fc-result"><div class="result-sub">Enter two fractions. Mixed numbers work: put the whole part on the left.</div></div>'+
      '<div class="result-card"><div class="field-label" style="margin-bottom:8px">Decimal to fraction</div>'+
        '<div class="tool-row"><input id="fc-dec" inputmode="decimal" placeholder="e.g. 0.375" autocomplete="off" style="width:160px"><span id="fc-dec-out" class="mono-out"></span></div></div>';

    var $ = function(s){ return body.querySelector(s); };
    var hist = toolHistory('fraction-calculator', {same:function(a,b){ return a.expr === b.expr; }});
    var current = null;

    /* ---- BigInt helpers ---- */
    function abs(x){ return x < 0n ? -x : x; }
    function gcd(a, b){ a = abs(a); b = abs(b); while(b){ var t = a % b; a = b; b = t; } return a; }
    function norm(n, d){ if(d < 0n){ n = -n; d = -d; } var g = gcd(n, d) || 1n; return {n:n / g, d:d / g}; }
    function fmt(f){ return f.d === 1n ? String(f.n) : f.n + '/' + f.d; }
    function mixed(f){
      if(f.d === 1n || abs(f.n) < f.d) return fmt(f);
      var w = f.n / f.d, r = abs(f.n % f.d);
      return r === 0n ? String(w) : w + ' ' + r + '/' + f.d;
    }
    function decimal(f, digits){
      var neg = f.n < 0n, n = abs(f.n), out = (neg ? '-' : '') + (n / f.d), r = n % f.d;
      if(r === 0n) return out;
      out += '.';
      for(var i = 0; i < digits && r !== 0n; i++){ r *= 10n; out += (r / f.d); r %= f.d; }
      return r === 0n ? out : out + '…';
    }

    /* ---- reading the inputs ---- */
    function val(id){ return $('#'+id).value.trim(); }
    function readFrac(p){
      var w = val(p+'-w'), n = val(p+'-n'), d = val(p+'-d');
      if(w === '' && n === '' && d === '') return null;
      [w, n, d].forEach(function(x){ if(x !== '' && !/^-?\d+$/.test(x)) throw new Error('Use whole numbers only (no decimals) in each box.'); });
      if(w !== '' && n === '' && d !== '') throw new Error('Add a numerator, or clear the denominator.');
      var D = d === '' ? 1n : BigInt(d);
      if(D === 0n) throw new Error('A denominator cannot be zero.');
      var W = w === '' ? 0n : BigInt(w), N = n === '' ? 0n : BigInt(n);
      var neg = w.charAt(0) === '-', num;
      if((w !== '' && W !== 0n) || neg){ num = abs(W) * D + abs(N); if(neg) num = -num; } else num = N;
      return norm(num, D);
    }

    function compute(){
      $('#fc-err').textContent = '';
      var A, B;
      try { A = readFrac('a'); B = readFrac('b'); }
      catch(e){ $('#fc-err').textContent = e.message; current = null; return null; }
      if(!A || !B){ current = null; $('#fc-result').innerHTML = '<div class="result-sub">Enter two fractions. Mixed numbers work: put the whole part on the left.</div>'; return null; }
      var op = $('#fc-op').value, R, steps = [];
      var sa = mixed(A) !== fmt(A) ? mixed(A)+' = '+fmt(A) : fmt(A), sb = mixed(B) !== fmt(B) ? mixed(B)+' = '+fmt(B) : fmt(B);
      if(op === '+' || op === '-'){
        var L = A.d / gcd(A.d, B.d) * B.d, an = A.n * (L / A.d), bn = B.n * (L / B.d);
        steps.push('Common denominator: '+L);
        steps.push(fmt(A)+' → '+an+'/'+L+',  '+fmt(B)+' → '+bn+'/'+L);
        var top = op === '+' ? an + bn : an - bn;
        steps.push(an+(op === '+' ? ' + ' : ' − ')+bn+' = '+top+'  →  '+top+'/'+L);
        R = norm(top, L);
      } else if(op === '×'){
        steps.push('Multiply across: ('+A.n+' × '+B.n+') / ('+A.d+' × '+B.d+')');
        R = norm(A.n * B.n, A.d * B.d);
      } else {
        if(B.n === 0n){ $('#fc-err').textContent = 'You can’t divide by zero.'; current = null; return null; }
        steps.push('Flip the second fraction and multiply: '+fmt(A)+' × '+fmt(norm(B.d, B.n)));
        R = norm(A.n * B.d, A.d * B.n);
      }
      steps.push('Simplify to lowest terms: '+fmt(R));
      var expr = '('+mixed(A)+') '+op+' ('+mixed(B)+')';
      current = {expr:expr, result:fmt(R), mixed:mixed(R), dec:decimal(R, 10), R:R};
      $('#fc-result').innerHTML =
        '<div class="result-big">'+esc(fmt(R))+'</div>'+
        '<dl class="kv" style="margin-top:12px"><dt>Mixed</dt><dd>'+esc(mixed(R))+'</dd><dt>Decimal</dt><dd>'+esc(decimal(R, 10))+'</dd><dt>Percent</dt><dd>'+esc(decimal(norm(R.n * 100n, R.d), 6))+'%</dd></dl>'+
        '<ol class="steps"><li>Inputs: '+esc(sa)+(op === '÷' ? '  ÷  ' : '  '+op+'  ')+esc(sb)+'</li>'+steps.map(function(s){ return '<li>'+esc(s)+'</li>'; }).join('')+'</ol>'+
        '<div class="tool-row"><button class="game-btn" id="fc-save">Save to history</button><button class="game-btn secondary" id="fc-copy">Copy result</button><button class="game-btn secondary" id="fc-chain">Use as first fraction</button></div>';
      $('#fc-save').addEventListener('click', save);
      $('#fc-copy').addEventListener('click', function(){ copyText(fmt(R), 'Result'); });
      $('#fc-chain').addEventListener('click', function(){ setFrac('a', R); });
      return current;
    }
    function save(){ if(current){ hist.add({expr:current.expr, result:current.result, dec:current.dec}); notify('Saved to history', 'ok'); } }
    function setFrac(p, f){
      var w = '', n = String(f.n), d = String(f.d);
      if(f.d === 1n){ w = n; n = ''; d = ''; }
      $('#'+p+'-w').value = w; $('#'+p+'-n').value = n; $('#'+p+'-d').value = d === '' ? '' : d;
      ['w','n','d'].forEach(function(k){ $('#'+p+'-'+k).dispatchEvent(new Event('input', {bubbles:true})); });
    }

    function setOp(op){
      $('#fc-op').value = op;
      Array.prototype.forEach.call(body.querySelectorAll('#fc-ops button'), function(b){ b.classList.toggle('on', b.getAttribute('data-op') === op); });
      $('#fc-op').dispatchEvent(new Event('change', {bubbles:true}));
    }
    body.querySelector('#fc-ops').addEventListener('click', function(e){
      var b = e.target.closest('[data-op]'); if(b){ setOp(b.getAttribute('data-op')); compute(); }
    });
    body.addEventListener('input', function(e){ if(e.target.id !== 'fc-dec') compute(); });
    body.addEventListener('keydown', function(e){ if(e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.id !== 'fc-dec'){ compute(); save(); } });

    $('#fc-dec').addEventListener('input', function(){
      var v = this.value.trim(), out = $('#fc-dec-out');
      if(!v){ out.textContent = ''; return; }
      var m = /^(-?)(\d*)\.?(\d*)$/.exec(v);
      if(!m || (m[2] === '' && m[3] === '')){ out.textContent = 'Enter a number like 0.375 or 2.5'; return; }
      var places = m[3].length, n = BigInt((m[2] || '0') + m[3]) * (m[1] ? -1n : 1n);
      var f = norm(n, 10n ** BigInt(places));
      out.textContent = '= ' + fmt(f) + (abs(f.n) >= f.d && f.d !== 1n ? '   (' + mixed(f) + ')' : '');
    });

    hist.mount(body, {title:'History', format:function(e){ return {main:e.expr+' = '+e.result, sub:'≈ '+e.dec}; },
      onPick:function(e){ var parts = e.result.split('/'); setFrac('a', norm(BigInt(parts[0]), BigInt(parts[1] || '1'))); compute(); }});
    setOp($('#fc-op').value || '+');
    compute();
  });
}

mountFractionCalc(document.getElementById('embed-slot'));
