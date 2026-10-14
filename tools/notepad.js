// tools/notepad.js — loaded by tools/notepad.html. Shared helpers come from assets/js/play.js.

/* ---------------- Notepad ---------------- */
function mountNotepad(container){
  mountEmbed(container, 'TOOL / NOTEPAD', function(body){
    body.innerHTML =
      '<div style="display:grid;grid-template-columns:180px 1fr;gap:12px">'+
        '<div><div class="tool-row"><button class="game-btn secondary" id="np-new" style="width:100%">+ New note</button></div><div id="np-list" style="font:11px monospace"></div></div>'+
        '<div><input class="tool-textarea" id="np-title" style="min-height:auto;padding:8px;margin-bottom:8px" placeholder="Title">'+
        '<textarea class="tool-textarea" id="np-body" placeholder="Start writing..."></textarea></div>'+
      '</div>';
    var notes = {};
    try { notes = JSON.parse(localStorage.getItem('vs-notes')||'{}'); } catch(e){ notes = {}; }
    var currentId = null;
    function save(){ localStorage.setItem('vs-notes', JSON.stringify(notes)); }
    function genId(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,6); }
    function renderList(){
      var items = Object.entries(notes).sort(function(a,b){ return b[1].modified-a[1].modified; });
      body.querySelector('#np-list').innerHTML = items.map(function(entry){
        var id=entry[0], n=entry[1];
        return '<div class="game-btn'+(id===currentId?'':' secondary')+'" style="margin-bottom:4px;cursor:pointer;text-align:left" data-note="'+id+'">'+esc(n.title||'Untitled')+'</div>';
      }).join('') || '<div class="tool-msg">No notes yet</div>';
      Array.prototype.slice.call(body.querySelectorAll('[data-note]')).forEach(function(b){ b.addEventListener('click', function(){ open(b.getAttribute('data-note')); }); });
    }
    function open(id){
      currentId = id;
      var n = notes[id];
      body.querySelector('#np-title').value = n.title;
      body.querySelector('#np-body').value = n.body;
      renderList();
    }
    function newNote(){
      var id = genId();
      notes[id] = {title:'Untitled', body:'', modified:Date.now()};
      save(); renderList(); open(id);
    }
    function saveCurrent(){
      if(!currentId) return;
      notes[currentId].title = body.querySelector('#np-title').value || 'Untitled';
      notes[currentId].body = body.querySelector('#np-body').value;
      notes[currentId].modified = Date.now();
      save(); renderList();
    }
    body.querySelector('#np-new').addEventListener('click', newNote);
    body.querySelector('#np-title').addEventListener('input', saveCurrent);
    body.querySelector('#np-body').addEventListener('input', saveCurrent);
    renderList();
    var firstId = Object.keys(notes)[0];
    if(firstId) open(firstId); else newNote();
  }, {persist:false});
}

mountNotepad(document.getElementById('embed-slot'));
