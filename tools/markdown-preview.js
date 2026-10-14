// tools/markdown-preview.js — loaded by tools/markdown-preview.html.
// Small Markdown renderer. All text is HTML-escaped first, so raw HTML in the input is shown as text, never run.

function mountMarkdownPreview(container){
  mountEmbed(container, 'TOOL / MARKDOWN PREVIEW', function(body){
    var SAMPLE = '# Heading\n\nSome **bold**, some *italic*, and `inline code`.\n\n- A list item\n- Another one\n\n> A quote\n\n```\ncode block\n```\n\n[A link](https://example.com)';
    body.innerHTML =
      '<div class="md-split"><div class="field"><label for="md-in">Markdown</label><textarea id="md-in" spellcheck="false" style="min-height:300px">'+esc(SAMPLE)+'</textarea></div>'+
      '<div class="field"><span class="field-label">Preview</span><div class="md-out" id="md-out"></div></div></div>'+
      '<div class="tool-row" style="margin-top:12px"><button class="game-btn secondary" id="md-copy">Copy rendered HTML</button><button class="game-btn secondary" id="md-clear">Clear</button></div>';
    var $ = function(s){ return body.querySelector(s); };

    function inline(t){
      t = esc(t);
      var codes = [];
      t = t.replace(/`([^`]+)`/g, function(m, c){ codes.push(c); return '\u0000' + (codes.length - 1) + '\u0000'; });
      t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function(m, label, url){
        return /^(https?:|mailto:|\/|#|\.)/i.test(url.replace(/&amp;/g, '&')) ? '<a href="'+url+'" target="_blank" rel="noreferrer noopener">'+label+'</a>' : m;
      });
      t = t.replace(/\*\*([^*]+)\*\*|__([^_]+)__/g, function(m, a, b){ return '<strong>'+(a || b)+'</strong>'; });
      t = t.replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>').replace(/(^|[^\w_])_([^_\s][^_]*)_(?!\w)/g, '$1<em>$2</em>');
      t = t.replace(/~~([^~]+)~~/g, '<del>$1</del>');
      return t.replace(/\u0000(\d+)\u0000/g, function(m, i){ return '<code>'+codes[+i]+'</code>'; });
    }
    function render(md){
      var L = md.replace(/\r\n?/g, '\n').split('\n'), out = '', i = 0;
      while(i < L.length){
        var l = L[i], m;
        if(/^```/.test(l)){
          var code = []; i++;
          while(i < L.length && !/^```/.test(L[i])){ code.push(L[i]); i++; }
          i++; out += '<pre><code>'+esc(code.join('\n'))+'</code></pre>'; continue;
        }
        if(!l.trim()){ i++; continue; }
        if((m = /^(#{1,6})\s+(.*)$/.exec(l))){ out += '<h'+m[1].length+'>'+inline(m[2])+'</h'+m[1].length+'>'; i++; continue; }
        if(/^\s*([-*_])(\s*\1){2,}\s*$/.test(l)){ out += '<hr>'; i++; continue; }
        if(/^>\s?/.test(l)){
          var q = []; while(i < L.length && /^>\s?/.test(L[i])){ q.push(L[i].replace(/^>\s?/, '')); i++; }
          out += '<blockquote>'+inline(q.join(' '))+'</blockquote>'; continue;
        }
        if(/^\s*[-*+]\s+/.test(l)){
          var ul = []; while(i < L.length && /^\s*[-*+]\s+/.test(L[i])){ ul.push('<li>'+inline(L[i].replace(/^\s*[-*+]\s+/, ''))+'</li>'); i++; }
          out += '<ul>'+ul.join('')+'</ul>'; continue;
        }
        if(/^\s*\d+[.)]\s+/.test(l)){
          var ol = []; while(i < L.length && /^\s*\d+[.)]\s+/.test(L[i])){ ol.push('<li>'+inline(L[i].replace(/^\s*\d+[.)]\s+/, ''))+'</li>'); i++; }
          out += '<ol>'+ol.join('')+'</ol>'; continue;
        }
        var p = [];
        while(i < L.length && L[i].trim() && !/^(```|#{1,6}\s|>|\s*[-*+]\s|\s*\d+[.)]\s)/.test(L[i])){ p.push(L[i]); i++; }
        out += '<p>'+inline(p.join('\n')).replace(/\n/g, '<br>')+'</p>';
      }
      return out;
    }
    function update(){ $('#md-out').innerHTML = render($('#md-in').value); }
    $('#md-in').addEventListener('input', update);
    $('#md-copy').addEventListener('click', function(){ copyText($('#md-out').innerHTML, 'HTML'); });
    $('#md-clear').addEventListener('click', function(){ $('#md-in').value = ''; $('#md-in').dispatchEvent(new Event('input', {bubbles:true})); });
    update();
  });
}

mountMarkdownPreview(document.getElementById('embed-slot'));
