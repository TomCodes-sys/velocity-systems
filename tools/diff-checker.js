// tools/diff-checker.js — loaded by tools/diff-checker.html. Shared helpers come from assets/js/play.js.

/* ---------------- Diff Checker ---------------- */
function mountDiffChecker(container){
  mountEmbed(container, 'TOOL / DIFF CHECKER', function(body){
    body.innerHTML =
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'+
        '<div><div class="tool-msg">Original</div><textarea class="tool-textarea" id="diff-a"></textarea></div>'+
        '<div><div class="tool-msg">Modified</div><textarea class="tool-textarea" id="diff-b"></textarea></div>'+
      '</div>'+
      '<div class="tool-row"><button class="game-btn" id="diff-run">Compare</button></div>'+
      '<div class="tool-output" id="diff-out" style="font-family:monospace"></div>';
    function lcs(a,b){
      var m=a.length,n=b.length, dp=[];
      for(var i=0;i<=m;i++){ dp.push(new Array(n+1).fill(0)); }
      for(i=1;i<=m;i++) for(var j=1;j<=n;j++) dp[i][j] = a[i-1]===b[j-1] ? dp[i-1][j-1]+1 : Math.max(dp[i-1][j],dp[i][j-1]);
      return dp;
    }
    function backtrack(dp,a,b,i,j){
      if(i===0 && j===0) return [];
      if(i===0) return backtrack(dp,a,b,0,j-1).concat([{type:'add',line:b[j-1]}]);
      if(j===0) return backtrack(dp,a,b,i-1,0).concat([{type:'del',line:a[i-1]}]);
      if(a[i-1]===b[j-1]) return backtrack(dp,a,b,i-1,j-1).concat([{type:'ctx',line:a[i-1]}]);
      if(dp[i-1][j] >= dp[i][j-1]) return backtrack(dp,a,b,i-1,j).concat([{type:'del',line:a[i-1]}]);
      return backtrack(dp,a,b,i,j-1).concat([{type:'add',line:b[j-1]}]);
    }
    function run(){
      var a = body.querySelector('#diff-a').value.split('\n');
      var b = body.querySelector('#diff-b').value.split('\n');
      var dp = lcs(a,b);
      var ops = backtrack(dp,a,b,a.length,b.length);
      var adds=0, dels=0;
      var html = ops.map(function(o){
        if(o.type==='add') adds++;
        if(o.type==='del') dels++;
        var color = o.type==='add' ? '#36c979' : o.type==='del' ? '#ff535e' : 'var(--muted)';
        var prefix = o.type==='add' ? '+ ' : o.type==='del' ? '- ' : '  ';
        return '<div style="color:'+color+'">'+prefix+esc(o.line)+'</div>';
      }).join('');
      body.querySelector('#diff-out').innerHTML = '<div class="tool-msg">+'+adds+' added, -'+dels+' removed</div>'+html;
    }
    body.querySelector('#diff-run').addEventListener('click', run);
  });
}

mountDiffChecker(document.getElementById('embed-slot'));
