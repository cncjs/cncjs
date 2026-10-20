/* Time in the header (Réglages → Affichage → Horloge). One text update per
 * minute, on the minute; nothing runs while the page is hidden or the clock
 * is switched off (body.display-hide-clock, set by display-settings.js). */
(function () {
  'use strict';
  var uiLocale=window.cncI18n||{locale:'fr-FR'};
  var banner=document.querySelector('.ks-simulation');
  if(!banner||!banner.parentNode)return;
  var clock=document.createElement('time');clock.className='ks-clock';clock.setAttribute('aria-live','off');
  banner.parentNode.insertBefore(clock,banner);
  var timer=null,disposed=false;
  function pad(n){return (n<10?'0':'')+n;}
  function format(d){
    try{return d.toLocaleTimeString(uiLocale.locale,{hour:'2-digit',minute:'2-digit',hour12:false});}
    catch(_){return pad(d.getHours())+':'+pad(d.getMinutes());}
  }
  function off(){return document.body.classList.contains('display-hide-clock');}
  function tick(){
    clearTimeout(timer);timer=null;
    if(disposed||document.hidden)return;
    var d=new Date();
    if(!off()){var text=format(d),stamp=pad(d.getHours())+':'+pad(d.getMinutes());if(clock.textContent!==text)clock.textContent=text;if(clock.getAttribute('datetime')!==stamp)clock.setAttribute('datetime',stamp);}
    // Wake just after the next minute starts; checking the switch then costs nothing.
    timer=setTimeout(tick,60000-(d.getSeconds()*1000+d.getMilliseconds())+50);
  }
  document.addEventListener('visibilitychange',tick);
  window.addEventListener('pagehide',function(e){if(e&&e.persisted)return;disposed=true;clearTimeout(timer);});
  // The display preference may change at any time: refresh on the next interaction-driven event.
  window.addEventListener('cnc-screen-change',tick);
  tick();
  window.cncHeaderClock={tick:tick};
})();
