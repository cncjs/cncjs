(function () {
  'use strict';

  var copies = document.querySelectorAll('[data-machine-copy]'), activeCopies=[], disposed=false;

  function update() {
    for (var i = 0; i < activeCopies.length; i++) {
      var source = document.getElementById(
        activeCopies[i].getAttribute('data-machine-copy')
      );
      if (source && activeCopies[i].textContent !== source.textContent) {
        activeCopies[i].textContent = source.textContent;
      }
    }
  }

  var observer = new MutationObserver(update);
  function mount(){
    if(disposed)return;
    observer.disconnect();activeCopies=[];
    if(document.hidden)return;
    var sources={};
    for(var i=0;i<copies.length;i++){
      var parent=copies[i];
      while(parent&&!(parent.classList&&parent.classList.contains('screen')))parent=parent.parentElement;
      if(parent&&parent.classList.contains('active')){
        activeCopies.push(copies[i]);sources[copies[i].getAttribute('data-machine-copy')]=true;
      }
    }
    Object.keys(sources).forEach(function(id){var source=document.getElementById(id);if(source)observer.observe(source,{childList:true,characterData:true,subtree:true});});
    update();
  }
  function dispose(event){
    if(event&&event.persisted)return;
    disposed=true;observer.disconnect();activeCopies=[];
    window.removeEventListener('cnc-screen-change',mount);
    document.removeEventListener('visibilitychange',mount);
    window.removeEventListener('pagehide',dispose);
  }
  window.addEventListener('cnc-screen-change',mount);
  document.addEventListener('visibilitychange',mount);
  window.addEventListener('pagehide',dispose);
  mount();
})();
