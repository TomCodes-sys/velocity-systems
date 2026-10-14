// tools/device-info.js — loaded by tools/device-info.html. Shared helpers come from assets/js/play.js.

/* ---------------- Device Info ---------------- */
function mountDeviceInfo(container){
  mountEmbed(container, 'TOOL / DEVICE INFO', function(body){
    body.innerHTML = '<div class="tool-output">Scanning…</div>';
    var nav = navigator, ua = nav.userAgent;
    var browser = ua.indexOf('Edg/')>-1?'Edge':ua.indexOf('Chrome/')>-1?'Chrome':ua.indexOf('Firefox/')>-1?'Firefox':ua.indexOf('Safari/')>-1?'Safari':'Unknown';
    var os = /Win/.test(ua)?'Windows':/Mac/.test(ua)?'macOS':/Linux/.test(ua)?'Linux':/Android/.test(ua)?'Android':/iPhone|iPad/.test(ua)?'iOS':'Unknown';
    var rows = [
      ['Browser', browser], ['OS', os], ['Platform', nav.platform||'—'],
      ['CPU cores', nav.hardwareConcurrency||'—'], ['Device RAM', nav.deviceMemory ? nav.deviceMemory+'GB' : '—'],
      ['Screen', screen.width+'×'+screen.height], ['Viewport', window.innerWidth+'×'+window.innerHeight],
      ['Pixel ratio', (window.devicePixelRatio||1)+'x'], ['Language', nav.language],
      ['Online', nav.onLine ? 'Yes' : 'No'], ['Cookies enabled', nav.cookieEnabled ? 'Yes' : 'No'],
      ['Touch support', nav.maxTouchPoints>0 ? 'Yes ('+nav.maxTouchPoints+' pts)' : 'No'],
    ];
    function render(publicIp){
      body.innerHTML = '<div style="font:11px monospace">'+
        (publicIp ? '<div style="margin-bottom:8px"><b>Public IP:</b> '+esc(publicIp)+'</div>' : '<div class="tool-msg">Public IP unavailable (offline or blocked)</div>')+
        rows.map(function(r){ return '<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--line)"><span style="color:var(--muted)">'+r[0]+'</span><b>'+esc(String(r[1]))+'</b></div>'; }).join('')+
      '</div>';
    }
    fetch('https://api.ipify.org?format=json').then(function(r){ return r.json(); }).then(function(d){ render(d.ip); }).catch(function(){ render(null); });
  });
}

mountDeviceInfo(document.getElementById('embed-slot'));
