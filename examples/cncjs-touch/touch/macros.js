/* CNCjs macros from the touch interface. The list comes from the job snapshot
 * (names and ids only); running one goes through the same confirmation flow as
 * a start (prepare → confirmed nonce → macro), on an idle, fresh controller. */
(function () {
  'use strict';
  var uiLocale=window.cncI18n||{t:function(s){return s;},html:function(s){return s;}};
  var shell=window.cncShell;
  if(!shell||!shell.sheet||!shell.preparationActions)return;
  var panel=shell.sheet('ks-macros',uiLocale.t('Macros CNCjs'));
  panel.content.innerHTML=uiLocale.html('<p id="ks-macros-status" role="status"></p><div id="ks-macros-list" class="ks-macro-list"></div><p class="ks-help">Chaque macro est envoyée au contrôleur après confirmation, machine au repos. Vérifiez son contenu dans CNCjs avant de l’utiliser depuis cet écran.</p>');
  var status=document.getElementById('ks-macros-status'),list=document.getElementById('ks-macros-list');
  var button=document.createElement('button');button.type='button';button.className='ks-secondary ks-macros-open';button.textContent=uiLocale.t('Macros…');button.disabled=true;
  button.addEventListener('click',panel.open);
  shell.preparationActions.appendChild(button);
  var machine=null,signature='',rows=Object.create(null);
  function setText(el,value){if(el.textContent!==value)el.textContent=value;}
  function render(){
    var macros=machine&&Array.isArray(machine.macros)?machine.macros.filter(function(m){return m&&typeof m.id==='string'&&typeof m.name==='string';}):[];
    var ready=!!(machine&&machine.fresh&&machine.canMacro);
    var key=JSON.stringify([macros,ready,machine&&machine.macroReason]);
    var disabled=!machine||!macros.length;
    if(button.disabled!==disabled)button.disabled=disabled;
    if(key===signature)return;signature=key;
    var keep=Object.create(null);
    macros.forEach(function(m,i){
      var row=rows[m.id];
      if(!row){row=document.createElement('button');row.type='button';row.className='ks-macro';row.setAttribute('data-macro',m.id);
        row.addEventListener('click',function(){
          if(row.disabled||!window.cncJobControls||typeof window.cncJobControls.prepareMacro!=='function')return;
          shell.closeSheet(); // the confirmation dialog must not stack on this sheet
          window.cncJobControls.prepareMacro(m.id);
        });
        rows[m.id]=row;}
      setText(row,m.name);row.disabled=!ready;keep[m.id]=true;
      if(list.children[i]!==row)list.insertBefore(row,list.children[i]||null);
    });
    while(list.children.length>macros.length)list.removeChild(list.lastChild);
    Object.keys(rows).forEach(function(id){if(!keep[id])delete rows[id];});
    setText(status,!machine?uiLocale.t('État machine indisponible.'):!macros.length?uiLocale.t('Aucune macro définie dans CNCjs.'):ready?uiLocale.t('Machine au repos : touchez une macro pour la confirmer.'):(machine.macroReason||uiLocale.t('Macros indisponibles dans l’état actuel.')));
  }
  window.addEventListener('cnc-job-status',function(e){machine=e.detail&&e.detail.machine||null;render();});
  render();
})();
