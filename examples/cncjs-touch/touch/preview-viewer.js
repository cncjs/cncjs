(function () {
  'use strict';
  var uiLocale=(typeof window!=='undefined'&&window.cncI18n)||{t:function(s){return s;},html:function(s){return s;}};
  var $=function(id){return document.getElementById(id);};
  var overlay=document.createElement('div');overlay.id='preview-viewer';overlay.hidden=true;
  overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-labelledby','preview-viewer-title');
  overlay.innerHTML=uiLocale.html('<header><div><h2 id="preview-viewer-title">Aperçu XY</h2><p id="preview-viewer-file"></p></div><button id="preview-viewer-close" type="button">Fermer ×</button></header><div id="preview-viewer-stage" tabindex="0" aria-label="Aperçu agrandi, déplacez avec un doigt ou les flèches du clavier"><img id="preview-viewer-image" alt="Parcours XY agrandi" draggable="false"></div><footer><div class="preview-zoom"><button id="preview-zoom-out" type="button" aria-label="Réduire le zoom">−</button><output id="preview-zoom-level" aria-live="polite">100 %</output><button id="preview-zoom-in" type="button" aria-label="Augmenter le zoom">＋</button><button id="preview-zoom-fit" type="button">Recentrer</button></div><div class="preview-machine"><span id="preview-machine-state"></span><button id="preview-job-stop" type="button" disabled>Arrêter le travail</button></div></footer><p class="preview-hint">Image indicative · Glissez avec un doigt · Zoom + / − · Échap pour fermer</p>');
  document.body.appendChild(overlay);
  var stage=$('preview-viewer-stage'),image=$('preview-viewer-image');
  var zoom=1,drawnZoom=null,x=0,y=0,baseWidth=1,baseHeight=1,width=1,height=1,source=null,focusReturn=null,drag=null,pending=false,background=[],jobState=null;
  function draw(){
    pending=false;if(overlay.hidden)return;
    var maxX=Math.max(0,(baseWidth*zoom-width)/2),maxY=Math.max(0,(baseHeight*zoom-height)/2);
    x=Math.max(-maxX,Math.min(maxX,x));y=Math.max(-maxY,Math.min(maxY,y));
    image.style.transform='translate(-50%, -50%) translate('+x+'px,'+y+'px) scale('+zoom+')';
    if(drawnZoom!==zoom){
      drawnZoom=zoom;$('preview-zoom-level').textContent=Math.round(zoom*100)+' %';
      $('preview-zoom-out').disabled=zoom<=1;$('preview-zoom-in').disabled=zoom>=4;
      stage.classList.toggle('can-pan',zoom>1);
    }
  }
  function schedule(){if(!pending){pending=true;requestAnimationFrame(draw);}}
  function fit(){
    if(overlay.hidden||!source)return;
    width=stage.clientWidth;height=stage.clientHeight;
    var ratio=Math.min(width/source.naturalWidth,height/source.naturalHeight);
    baseWidth=source.naturalWidth*ratio;baseHeight=source.naturalHeight*ratio;
    image.style.width=baseWidth+'px';image.style.height=baseHeight+'px';schedule();
  }
  function close(){
    if(overlay.hidden)return;
    overlay.hidden=true;source=null;drag=null;image.removeAttribute('src');
    background.forEach(function(entry){entry.el.inert=entry.inert;});background=[];
    if(focusReturn)focusReturn.focus({preventScroll:true});
  }
  function open(img,name){
    if(img.hidden||!img.complete||!img.naturalWidth||!img.getAttribute('src'))return;
    focusReturn=document.activeElement;source={naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight};zoom=1;x=0;y=0;drag=null;
    $('preview-viewer-file').textContent=name;
    background=Array.prototype.map.call(document.querySelectorAll('main,#tabbar,#real-banner,#simulation-banner,#status-bar'),function(el){var entry={el:el,inert:el.inert};el.inert=true;return entry;});
    overlay.hidden=false;image.src=img.src;renderStatus();fit();$('preview-viewer-close').focus({preventScroll:true});
  }
  [['library-image','library-name'],['home-job-image','home-job-name']].forEach(function(pair){
    var img=$(pair[0]);if(!img)return;
    // The small overlay button avoids changing the fitted page's geometry.
    var button=document.createElement('button');button.type='button';button.className='preview-open';button.textContent=uiLocale.t('Agrandir');button.setAttribute('aria-label',uiLocale.t('Agrandir l’aperçu'));
    img.parentNode.classList.add('preview-open-host');img.parentNode.appendChild(button);
    function availability(){button.hidden=img.hidden||!img.complete||!img.naturalWidth;}
    button.addEventListener('click',function(){open(img,$(pair[1]).textContent);});
    img.addEventListener('click',function(){open(img,$(pair[1]).textContent);});
    img.addEventListener('load',availability);img.addEventListener('error',availability);
    new MutationObserver(availability).observe(img,{attributes:true,attributeFilter:['hidden','src']});availability();
  });
  $('preview-viewer-close').addEventListener('click',close);
  $('preview-zoom-in').addEventListener('click',function(){zoom=Math.min(4,zoom+.5);schedule();});
  $('preview-zoom-out').addEventListener('click',function(){zoom=Math.max(1,zoom-.5);schedule();});
  $('preview-zoom-fit').addEventListener('click',function(){zoom=1;x=0;y=0;schedule();});
  stage.addEventListener('pointerdown',function(e){
    if(zoom<=1||drag||e.button!==0)return;
    drag={id:e.pointerId,startX:e.clientX,startY:e.clientY,x:x,y:y};
    stage.setPointerCapture(e.pointerId);
  });
  stage.addEventListener('pointermove',function(e){if(!drag||drag.id!==e.pointerId)return;x=drag.x+e.clientX-drag.startX;y=drag.y+e.clientY-drag.startY;schedule();});
  function endDrag(e){if(drag&&drag.id===e.pointerId)drag=null;}
  stage.addEventListener('pointerup',endDrag);stage.addEventListener('pointercancel',endDrag);stage.addEventListener('lostpointercapture',endDrag);
  document.addEventListener('keydown',function(e){
    if(overlay.hidden)return;
    if(e.key==='Escape'){e.preventDefault();close();return;}
    if(document.activeElement===stage&&/^Arrow/.test(e.key)){e.preventDefault();if(e.key==='ArrowLeft')x-=40;if(e.key==='ArrowRight')x+=40;if(e.key==='ArrowUp')y-=40;if(e.key==='ArrowDown')y+=40;schedule();}
    if(e.key==='Tab'){
      var controls=Array.prototype.filter.call(overlay.querySelectorAll('button,[tabindex="0"]'),function(el){return !el.disabled;});
      var first=controls[0],last=controls[controls.length-1];
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
    }
  });
  var stop=$('preview-job-stop');stop.disabled=true;
  stop.addEventListener('click',function(){var command=$('job-stop');if(!stop.disabled&&command&&!command.disabled)command.click();});
  window.addEventListener('cnc-job-status',function(e){
    jobState=e.detail;renderStatus();
  });
  function renderStatus(){
    if(overlay.hidden)return;
    var detail=jobState||{},c=detail.machine;
    var text=(detail.simulation?'Simulation · ':'Machine · ')+(c?({Idle:uiLocale.t('Au repos'),Run:uiLocale.t('Travail en cours'),Hold:uiLocale.t('En pause'),Alarm:uiLocale.t('Alarme')}[c.activeState]||c.activeState):uiLocale.t('État indisponible'));
    if($('preview-machine-state').textContent!==text)$('preview-machine-state').textContent=text;
    if(stop.disabled!==(!c||!c.canStop))stop.disabled=!c||!c.canStop;
  }
  $('preview-machine-state').textContent=uiLocale.t('État en cours de lecture');
  window.addEventListener('resize',fit);
  window.addEventListener('cnc-screen-change',close);
})();
