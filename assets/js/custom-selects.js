/* Velocity Systems accessible animated select enhancement. Native select remains the source of truth. */
(function(){
  'use strict';
  var serial=0;
  function enhance(sel){
    if(!sel || sel.dataset.vsEnhanced || sel.multiple || sel.size>1 || sel.closest('.vs-select')) return;
    sel.dataset.vsEnhanced='1';
    var wrap=document.createElement('div'); wrap.className='vs-select';
    var trigger=document.createElement('button'); trigger.type='button'; trigger.className='vs-select-trigger'; trigger.setAttribute('aria-haspopup','listbox'); trigger.setAttribute('aria-expanded','false');
    var label=document.createElement('span'); label.className='vs-select-value';
    var arrow=document.createElement('span'); arrow.className='vs-select-arrow'; arrow.setAttribute('aria-hidden','true'); arrow.textContent='';
    trigger.append(label,arrow);
    var menu=document.createElement('div'); menu.className='vs-select-menu'; menu.id='vs-select-'+(++serial); menu.setAttribute('role','listbox'); trigger.id=sel.id?sel.id+'-custom':'vs-select-trigger-'+serial; trigger.setAttribute('aria-controls',menu.id); if(sel.getAttribute('aria-label'))trigger.setAttribute('aria-label',sel.getAttribute('aria-label')); else if(sel.labels&&sel.labels.length)trigger.setAttribute('aria-label',Array.from(sel.labels).map(function(l){return l.textContent.trim();}).join(' ')); if(sel.id)Array.from(document.getElementsByTagName('label')).filter(function(l){return l.htmlFor===sel.id;}).forEach(function(l){l.htmlFor=trigger.id;}); sel.tabIndex=-1;
    var parent=sel.parentNode; parent.insertBefore(wrap,sel); wrap.append(sel,trigger,menu); sel.classList.add('vs-select-native');
    var active=-1, typeTimer=0, typeBuffer='';
    function options(){return Array.from(sel.options).map(function(o,i){return {o:o,i:i};});}
    function sync(){var o=sel.options[sel.selectedIndex];label.textContent=o?o.textContent:'Select…';trigger.disabled=sel.disabled;wrap.classList.toggle('is-disabled',sel.disabled);Array.from(menu.children).forEach(function(b,i){var x=sel.options[i];b.setAttribute('aria-selected',String(!!x&&x.selected));b.disabled=!x||x.disabled;});}
    function close(){wrap.classList.remove('is-open');trigger.setAttribute('aria-expanded','false');active=-1;}
    function choose(i){var o=sel.options[i];if(!o||o.disabled)return;sel.selectedIndex=i;sel.dispatchEvent(new Event('input',{bubbles:true}));sel.dispatchEvent(new Event('change',{bubbles:true}));sync();close();trigger.focus();}
    function focusOption(i){var list=options().filter(function(x){return !x.o.disabled;});if(!list.length)return;var found=list.find(function(x){return x.i===i;});if(!found)found=list[0];active=found.i;Array.from(menu.children).forEach(function(b,j){b.classList.toggle('is-active',j===active);});var b=menu.children[active];if(b)b.scrollIntoView({block:'nearest'});}
    function open(){if(sel.disabled)return;menu.innerHTML='';options().forEach(function(x){var b=document.createElement('button');b.type='button';b.className='vs-select-option';b.setAttribute('role','option');b.textContent=x.o.textContent;b.disabled=x.o.disabled;b.addEventListener('click',function(e){e.preventDefault();choose(x.i);});menu.appendChild(b);});sync();wrap.classList.add('is-open');trigger.setAttribute('aria-expanded','true');focusOption(sel.selectedIndex>=0?sel.selectedIndex:0);}
    trigger.addEventListener('click',function(e){e.preventDefault();wrap.classList.contains('is-open')?close():open();});
    trigger.addEventListener('keydown',function(e){var k=e.key;if(['ArrowDown','ArrowUp','Enter',' ','Home','End'].indexOf(k)>=0){e.preventDefault();if(!wrap.classList.contains('is-open'))open();else if(k==='ArrowDown')focusOption(active+1);else if(k==='ArrowUp')focusOption(active-1);else if(k==='Home')focusOption(0);else if(k==='End')focusOption(sel.options.length-1);else if(k==='Enter'||k===' ')choose(active);}else if(k==='Escape'&&wrap.classList.contains('is-open')){e.preventDefault();close();}else if(k.length===1&&!e.ctrlKey&&!e.metaKey&&!e.altKey){typeBuffer+=k.toLowerCase();clearTimeout(typeTimer);typeTimer=setTimeout(function(){typeBuffer='';},700);var ix=options().find(function(x){return !x.o.disabled&&x.o.textContent.trim().toLowerCase().startsWith(typeBuffer);});if(ix){if(!wrap.classList.contains('is-open'))open();focusOption(ix.i);}}});
    menu.addEventListener('keydown',function(e){if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();focusOption(active+(e.key==='ArrowDown'?1:-1));}else if(e.key==='Enter'||e.key===' '){e.preventDefault();choose(active);}else if(e.key==='Escape'){e.preventDefault();close();trigger.focus();}});
    sel.addEventListener('change',sync);sel.addEventListener('input',sync);
    var observer=new MutationObserver(function(){if(wrap.classList.contains('is-open'))open();else sync();});observer.observe(sel,{attributes:true,childList:true,subtree:true,characterData:true});
    document.addEventListener('pointerdown',function(e){if(!wrap.contains(e.target))close();});
    sync();
  }
  function scan(root){(root||document).querySelectorAll('select').forEach(enhance);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){scan();});else scan();
  new MutationObserver(function(ms){ms.forEach(function(m){m.addedNodes.forEach(function(n){if(n.nodeType===1){if(n.matches&&n.matches('select'))enhance(n);scan(n);}});});}).observe(document.documentElement,{childList:true,subtree:true});
})();
