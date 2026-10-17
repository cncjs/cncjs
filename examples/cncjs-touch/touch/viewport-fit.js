(function(){
  'use strict';
  var main=document.querySelector('main'),pending=false,layouts=new WeakMap(),revision=0,disposed=false,frame=0,observed=null,activation=false,measuring=null;
  if(!main)return;
  function fit(){
    pending=false;if(disposed)return;
    var vh=window.innerHeight,vw=window.innerWidth,top=0;
    ['status-bar','simulation-banner','real-banner','notice'].forEach(function(id){var el=document.getElementById(id);if(el&&!el.hidden)top=Math.max(top,el.getBoundingClientRect().bottom);});
    var nav=document.getElementById('tabbar'),shell=document.body.classList.contains('ks-ui'),bottom=shell?0:nav?nav.getBoundingClientRect().height:0;
    var viewHeight=Math.max(100,vh-top-bottom-16)+'px';
    var screen=main.querySelector('.screen.active');
    var w=Math.max(1,main.clientWidth-(shell?32:16)),h=Math.max(1,vh-Math.ceil(top)-Math.ceil(bottom)-(shell?32:16));
    var key=[vw,vh,w,h,document.body.classList.contains('display-large')].join(':'),cached=screen&&layouts.get(screen);
    if(screen&&!cached){
      var saved=recall(screen,key);
      if(saved){
        // A scale remembered from an earlier page load is applied at once, with
        // the screen visible, and only verified by reads in the next frame: no
        // blank measurement on the first opening of a screen.
        layouts.set(screen,{key:saved.key,width:saved.width,height:saved.height,scale:saved.scale});
        style(screen,'width',(w/saved.scale)+'px');style(screen,'transform','scale('+saved.scale+')');
        activation=false;pending=true;frame=requestAnimationFrame(fit);return;
      }
    }
    var sw=screen&&screen.scrollWidth,sh=screen&&screen.scrollHeight,activated=activation;activation=false;
    // Content that changes while a screen is shown (a list arriving, an image
    // loading) is only re-measured when it no longer fits at the current scale:
    // a full measurement hides the screen for several frames, which would be
    // seen as blinking. Opening the screen or resizing always re-measures.
    // The cache keeps the last fully measured size, so re-opening the screen
    // notices the change and lets a shrunken screen grow back.
    var fits=cached&&cached.key===key&&!activated&&sh*cached.scale<=h+1&&sw*cached.scale<=w+1;
    var dialog=document.getElementById('job-dialog');
    var card=dialog&&!dialog.hidden&&dialog.querySelector('.job-dialog-card');
    var modalScale=card?Math.min(1,(vh-24)/Math.max(1,card.scrollHeight),(vw-24)/Math.max(1,card.scrollWidth)):1;
    // All layout reads above precede writes. A changed logical width is measured
    // in the following animation frame, never synchronously after writing it.
    function style(el,k,value){if(el.style[k]!==value)el.style[k]=value;}
    style(main,'top',Math.ceil(top)+'px');style(main,'bottom',Math.ceil(bottom)+'px');
    if(shell&&nav)style(nav,'top',Math.ceil(top)+'px');
    if(main._viewHeight!==viewHeight){document.documentElement.style.setProperty('--view-height',viewHeight);main._viewHeight=viewHeight;}
    if(card)style(card,'transform','scale('+modalScale+')');
    if(screen!==observed){
      if(screenObserver.disconnect)screenObserver.disconnect();
      observed=screen;
      if(screen)screenObserver.observe(screen,{childList:true,subtree:true,characterData:true});
    }
    if(measuring&&measuring.screen===screen&&measuring.key===key&&!activated){
      // A measurement is already running for this screen and viewport: content
      // that changed meanwhile (coordinates 4x/s) is read by its next pass.
      // Restarting it here would keep the screen hidden as long as it changes.
    }else if(screen&&!fits&&(!cached||cached.key!==key||cached.width!==sw||cached.height!==sh)){
      // A shown screen whose content grew is only shrunk, starting from its
      // current scale: no reset to full size, nothing hidden, a small gradual
      // adjustment instead of a flash. The first fit of a screen and a changed
      // viewport measure from scale 1 with the screen invisible (layout still
      // runs) so none of the intermediate frames is painted.
      var incremental=!activated&&!!cached&&cached.key===key&&cached.scale>0;
      layouts.delete(screen);
      var version=++revision,scale=incremental?cached.scale:1,passes=0;
      measuring={screen:screen,key:key};
      stats.measurements++;
      if(!incremental){stats.hidden++;style(screen,'visibility','hidden');screen._fitHidden=true;style(screen,'transform','none');}
      style(screen,'width',(w/scale)+'px');
      function measure(){
        if(disposed||version!==revision||main.querySelector('.screen.active')!==screen){if(version===revision)measuring=null;return;}
        var naturalW=screen.scrollWidth,naturalH=screen.scrollHeight;
        var next=Math.min(scale,h/Math.max(1,naturalH),w/Math.max(1,naturalW));
        if(next<scale-.002&&passes++<4){
          scale=next;style(screen,'width',(w/scale)+'px');frame=requestAnimationFrame(measure);return;
        }
        // A final conservative scale also handles content that does not reflow.
        scale=next;style(screen,'transform','scale('+scale+')');
        reveal(screen);measuring=null;
        var entry={key:key,width:naturalW,height:naturalH,scale:scale};
        layouts.set(screen,entry);remember(screen,entry);
        ready();
      }
      frame=requestAnimationFrame(measure);
    }else{
      // A screen left hidden by an interrupted measurement is shown again here.
      if(screen)reveal(screen);
      ready();
    }
    // Focusing a control can scroll an overflow:hidden container.
    main.scrollTop=0;main.scrollLeft=0;
  }
  function reveal(screen){if(screen._fitHidden){screen._fitHidden=false;screen.style.visibility='';}}
  // Counters for the on-device perf report: full measurements, and how many hid the screen.
  var stats={measurements:0,hidden:0};
  // Fitted scales survive page loads (per screen id and display size). Storage
  // failures only cost the first-opening measurement, never the fit itself.
  var storeKey='cncjs-touch-fit-v1',persisted={};
  try{if(typeof localStorage!=='undefined')persisted=JSON.parse(localStorage.getItem(storeKey)||'{}')||{};}catch(_){persisted={};}
  function recall(screen,key){
    var p=screen.id&&Object.prototype.hasOwnProperty.call(persisted,screen.id)&&persisted[screen.id];
    return p&&p.key===key&&typeof p.scale==='number'&&p.scale>0&&p.scale<=1&&p.width>0&&p.height>0?p:null;
  }
  function remember(screen,entry){
    if(!screen.id)return;
    persisted[screen.id]={key:entry.key,width:entry.width,height:entry.height,scale:entry.scale};
    try{if(typeof localStorage!=='undefined')localStorage.setItem(storeKey,JSON.stringify(persisted));}catch(_){}
  }
  var readyCallbacks=[],warmQueue=null,warmTimer=null;
  function ready(){
    var callbacks=readyCallbacks;readyCallbacks=[];callbacks.forEach(function(fn){fn();});
    if(warmQueue===null&&typeof requestIdleCallback==='function'){warmQueue=[];warmTimer=setTimeout(startWarmup,1500);}
  }
  // Warm-up: each screen not yet shown is laid out once, invisibly and out of
  // flow, during idle time after the first fit. Chromium keeps its text shaping
  // and style caches, so the first opening of a screen then costs about what a
  // later one does (measured on the tablet: 2-3x less). Nothing is painted and
  // nothing changes for the modules, which only look at the active class.
  function startWarmup(){
    warmTimer=null;if(disposed)return;
    warmQueue=Array.prototype.filter.call(main.querySelectorAll('.screen'),function(s){return !s.classList.contains('active');});
    scheduleWarm();
  }
  function scheduleWarm(){if(!disposed&&warmQueue.length)requestIdleCallback(warm,{timeout:3000});}
  function warm(){
    if(disposed)return;
    var screen=warmQueue.shift();
    if(screen&&!screen.classList.contains('active')&&!layouts.has(screen)&&!screen.style.width){
      var width=Math.max(1,main.clientWidth-(document.body.classList.contains('ks-ui')?32:16))+'px',s=screen.style;
      s.position='absolute';s.left='0';s.top='0';s.visibility='hidden';s.width=width;s.display='grid';
      void screen.offsetHeight; // forces the layout while hidden; cleared before any paint
      s.display='';s.width='';s.visibility='';s.position='';s.left='';s.top='';
    }
    scheduleWarm();
  }
  // Only a viewport change or an activation cancels a running measurement;
  // other requests (content, clicks, focus) just ask for a fit.
  function schedule(){if(disposed)return;if(!pending){pending=true;frame=requestAnimationFrame(fit);}}
  function resized(){if(disposed)return;revision++;measuring=null;schedule();}
  function activate(){activation=true;resized();}
  window.addEventListener('resize',resized);
  window.addEventListener('cnc-screen-change',activate);
  if(window.visualViewport)window.visualViewport.addEventListener('resize',resized);
  document.addEventListener('click',schedule);
  document.addEventListener('change',schedule);
  document.addEventListener('focusin',schedule);
  document.addEventListener('toggle',schedule,true);
  document.addEventListener('load',schedule,true);
  // Hidden screens keep receiving machine state, but must not reflow the visible screen.
  function visibleChange(records){
    for(var i=0;i<records.length;i++){
      var el=records[i].target;
      if(el.nodeType===3)el=el.parentElement;
      while(el&&el!==main){
        if(el.hidden)break;
        if(el.classList&&el.classList.contains('screen')){
          if(el.classList.contains('active')){schedule();return;}
          break;
        }
        el=el.parentElement;
      }
    }
  }
  var screenObserver=new MutationObserver(visibleChange);
  var dialog=document.getElementById('job-dialog');
  var dialogObserver=new MutationObserver(schedule);
  if(dialog)dialogObserver.observe(dialog,{attributes:true,attributeFilter:['hidden'],childList:true,subtree:true,characterData:true});
  var notice=document.getElementById('notice');
  var noticeObserver=new MutationObserver(schedule);
  if(notice)noticeObserver.observe(notice,{attributes:true,attributeFilter:['hidden'],childList:true,subtree:true});
  function dispose(){
    if(disposed)return;disposed=true;revision++;readyCallbacks=[];warmQueue=[];if(warmTimer!==null)clearTimeout(warmTimer);
    if(window.cancelAnimationFrame)window.cancelAnimationFrame(frame);
    [screenObserver,dialogObserver,noticeObserver].forEach(function(o){if(o.disconnect)o.disconnect();});
    if(window.removeEventListener){window.removeEventListener('resize',resized);window.removeEventListener('cnc-screen-change',activate);window.removeEventListener('pagehide',leave);}
    if(window.visualViewport)window.visualViewport.removeEventListener('resize',resized);
    if(document.removeEventListener){['click','change','focusin'].forEach(function(n){document.removeEventListener(n,schedule);});document.removeEventListener('toggle',schedule,true);document.removeEventListener('load',schedule,true);}
  }
  function leave(event){if(!event||!event.persisted)dispose();}
  window.cncViewportFit={whenReady:function(fn){readyCallbacks.push(fn);schedule();},dispose:dispose,stats:stats};
  window.addEventListener('pagehide',leave);
  schedule();
})();

