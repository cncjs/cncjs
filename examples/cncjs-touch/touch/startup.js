(function () {
  'use strict';
  var finished=false,failed=false,timer;
  function message(text) {
    var node=document.getElementById('cnc-boot-message');
    if(node)node.textContent=text;
  }
  function fail() {
    if(finished)return;
    failed=true;clearTimeout(timer);
    message('Chargement incomplet. Vérifiez la connexion puis réessayez.');
  }
  function error(event) {
    var target=event.target;
    if(target&&/^(SCRIPT|LINK)$/.test(target.tagName)||event.message)fail();
  }
  window.addEventListener('error',error,true);
  timer=setTimeout(function(){message('Le chargement prend plus de temps que prévu. Vous pouvez patienter ou réessayer.');},15000);
  window.cncStartup={ready:function(){
    if(failed||finished)return;
    // A fit may need several frames; reveal only once its measurements settle.
    function reveal(){
      if(failed||finished)return;
      // Any active screen: the job follow-up may already have opened Suivi (a job started from the PC).
      if(!document.body.classList.contains('ks-ui')||!document.querySelector('main .screen.active')){fail();return;}
      finished=true;clearTimeout(timer);window.removeEventListener('error',error,true);
      document.documentElement.classList.remove('cnc-loading');
      var boot=document.getElementById('cnc-boot');if(boot)boot.hidden=true;
    }
    if(window.cncViewportFit)window.cncViewportFit.whenReady(reveal);
    else requestAnimationFrame(reveal);
  }};
})();
