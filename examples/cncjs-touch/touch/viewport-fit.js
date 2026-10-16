(function(){
  'use strict';
  var main=document.querySelector('main'),pending=false,layouts=new WeakMap(),revision=0,disposed=false,frame=0,observed=null,activation=false;
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
    if(screen&&!fits&&(!cached||cached.key!==key||cached.width!==sw||cached.height!==sh)){
      // An interrupted fit must not reuse the old cache after transform reset.
      layouts.delete(screen);
      var version=revision,scale=1,passes=0;
      // Measuring takes several frames at changing widths; keep the screen
      // invisible (layout still runs) so none of them is painted.
      style(screen,'visibility','hidden');screen._fitHidden=true;
      style(screen,'transform','none');style(screen,'width',w+'px');
      function measure(){
        if(disposed||version!==revision||main.querySelector('.screen.active')!==screen)return;
        var naturalW=screen.scrollWidth,naturalH=screen.scrollHeight;
        var next=Math.min(scale,h/Math.max(1,naturalH),w/Math.max(1,naturalW));
        if(next<scale-.002&&passes++<4){
          scale=next;style(screen,'width',(w/scale)+'px');frame=requestAnimationFrame(measure);return;
        }
        // A final conservative scale also handles content that does not reflow.
        scale=next;style(screen,'transform','scale('+scale+')');
        reveal(screen);
        layouts.set(screen,{key:key,width:naturalW,height:naturalH,scale:scale});
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
  var readyCallbacks=[];
  function ready(){var callbacks=readyCallbacks;readyCallbacks=[];callbacks.forEach(function(fn){fn();});}
  function schedule(){if(disposed)return;revision++;if(!pending){pending=true;frame=requestAnimationFrame(fit);}}
  function activate(){activation=true;schedule();}
  window.addEventListener('resize',schedule);
  window.addEventListener('cnc-screen-change',activate);
  if(window.visualViewport)window.visualViewport.addEventListener('resize',schedule);
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
    if(disposed)return;disposed=true;revision++;readyCallbacks=[];
    if(window.cancelAnimationFrame)window.cancelAnimationFrame(frame);
    [screenObserver,dialogObserver,noticeObserver].forEach(function(o){if(o.disconnect)o.disconnect();});
    if(window.removeEventListener){window.removeEventListener('resize',schedule);window.removeEventListener('cnc-screen-change',activate);window.removeEventListener('pagehide',leave);}
    if(window.visualViewport)window.visualViewport.removeEventListener('resize',schedule);
    if(document.removeEventListener){['click','change','focusin'].forEach(function(n){document.removeEventListener(n,schedule);});document.removeEventListener('toggle',schedule,true);document.removeEventListener('load',schedule,true);}
  }
  function leave(event){if(!event||!event.persisted)dispose();}
  window.cncViewportFit={whenReady:function(fn){readyCallbacks.push(fn);schedule();},dispose:dispose};
  window.addEventListener('pagehide',leave);
  schedule();
})();

