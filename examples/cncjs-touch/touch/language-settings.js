(function(){
  'use strict';
  var i18n=window.cncI18n,host=document.querySelector('#screen-settings .ks-panel-intro');
  if(!i18n||!host)return;
  var control=document.createElement('div');control.className='language-settings';
  control.innerHTML=i18n.html('<label for="display-language">Langue de l’interface</label><select id="display-language"><option value="fr" lang="fr">Français</option><option value="en" lang="en">English</option><option value="es" lang="es">Español</option></select>');
  host.appendChild(control);
  var note=document.createElement('div');note.className='wide language-confirm';note.hidden=true;
  note.innerHTML=i18n.html('<p>Le rechargement efface le journal de cette page et les saisies non enregistrées. Exportez ou enregistrez-les avant de continuer.</p><p id="language-status" role="status"></p><button type="button" id="language-apply" class="ks-secondary">Appliquer et recharger</button>');
  document.getElementById('screen-settings').appendChild(note);
  var select=document.getElementById('display-language'),apply=document.getElementById('language-apply'),status=document.getElementById('language-status');
  select.value=i18n.language;
  var busy=false,disposed=false;
  function reason(){
    var state=window.cncScreenSaver&&window.cncScreenSaver.status();
    if(busy||state&&state.blocked)return i18n.t('Changement de langue indisponible pendant une opération ou tant que son retour au repos reste incertain.');
    var dialogs=document.querySelectorAll('[role="dialog"]');
    for(var n=0;n<dialogs.length;n++)if(!dialogs[n].hidden&&dialogs[n].getClientRects().length)return i18n.t('Fermez la confirmation ouverte avant de changer de langue.');
    return '';
  }
  function render(){if(disposed)return;var changed=select.value!==i18n.language,why=reason();if(note.hidden===changed)note.hidden=!changed;apply.disabled=!changed||!!why;if(status.textContent!==why)status.textContent=why;}
  function job(e){busy=!!(e.detail&&e.detail.busy);render();}
  function change(){render();window.dispatchEvent(new Event('resize'));}
  function commit(){
    if(disposed||document.hidden||select.value===i18n.language)return;
    var why=reason();if(why){status.textContent=why;apply.disabled=true;return;}
    if(!i18n.save(select.value)){status.textContent=i18n.t('Impossible de mémoriser la langue dans ce navigateur. La page reste ouverte.');return;}
    window.location.reload();
  }
  function leave(e){if(e&&e.persisted)return;disposed=true;select.removeEventListener('change',change);apply.removeEventListener('click',commit);window.removeEventListener('cnc-job-status',job);window.removeEventListener('cnc-screen-saver-status',render);window.removeEventListener('cnc-screen-change',render);window.removeEventListener('pagehide',leave);}
  select.addEventListener('change',change);apply.addEventListener('click',commit);window.addEventListener('cnc-job-status',job);window.addEventListener('cnc-screen-saver-status',render);window.addEventListener('cnc-screen-change',render);window.addEventListener('pagehide',leave);render();
})();
