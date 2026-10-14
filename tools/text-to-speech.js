// tools/text-to-speech.js — loaded by tools/text-to-speech.html. Shared helpers come from assets/js/play.js.

/* ---------------- Text to Speech ---------------- */
function mountTTS(container){
  mountEmbed(container, 'TOOL / TEXT TO SPEECH', function(body){
    if(!window.speechSynthesis){ body.innerHTML = '<div class="tool-msg err">Your browser does not support the Web Speech API.</div>'; return; }
    body.innerHTML =
      '<textarea class="tool-textarea" id="tts-in">Welcome to Velocity Systems.</textarea>'+
      '<div class="tool-row"><select id="tts-voice"></select></div>'+
      '<div class="tool-row"><label style="font:11px monospace">Rate <input type="range" id="tts-rate" min="0.5" max="2" step="0.1" value="1"></label></div>'+
      '<div class="tool-row"><button class="game-btn" id="tts-speak">Speak</button><button class="game-btn secondary" id="tts-stop">Stop</button></div>';
    var synth = window.speechSynthesis;
    function loadVoices(){
      var voices = synth.getVoices();
      body.querySelector('#tts-voice').innerHTML = voices.map(function(v,i){ return '<option value="'+i+'">'+v.name+' ('+v.lang+')</option>'; }).join('');
    }
    loadVoices();
    synth.onvoiceschanged = loadVoices;
    body.querySelector('#tts-speak').addEventListener('click', function(){
      synth.cancel();
      var text = body.querySelector('#tts-in').value;
      if(!text.trim()) return;
      var u = new SpeechSynthesisUtterance(text);
      var voices = synth.getVoices();
      var idx = parseInt(body.querySelector('#tts-voice').value,10);
      if(voices[idx]) u.voice = voices[idx];
      u.rate = parseFloat(body.querySelector('#tts-rate').value);
      synth.speak(u);
    });
    body.querySelector('#tts-stop').addEventListener('click', function(){ synth.cancel(); });
  });
}

mountTTS(document.getElementById('embed-slot'));
