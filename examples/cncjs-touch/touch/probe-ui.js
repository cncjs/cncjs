(function(){
  'use strict';
  var uiLocale=(typeof window!=='undefined'&&window.cncI18n)||{t:function(s){return s;},html:function(s){return s;}};
  var model=window.CNCProbe,simulation=document.body.getAttribute('data-simulation')==='true';
  if(!model)return;
  var engine=model.create(simulation?'simulation':'disabled'),main=document.querySelector('main');
  var key='cnc-touch-probes-v1-'+(simulation?'simulation':'real'),profiles=[],selected=simulation?-1:0,diameter=null;
  var operation='Z',machine=null,busy=false,timer=null,locked=false,active='',page=0;
  var message='',storageWarning='',lastState=null,machineReceived=0;
  var transfer=window.CNCProbeTransfer,imported=null,reader=null,readVersion=0;
  var manager=window.CNCProbeProfiles,removed=null,pendingDelete=null,editorPage=0;
  var preparation=window.CNCProbePreparation,preparationPage=0,preparationKey='';
  var profileStore=null;
  try{profileStore=window.CNCProfileStorage.open(localStorage,key);var saved=JSON.parse(profileStore.read()||'null');if(saved){if(saved.version!==1)throw Error('version');profiles=transfer.decode(transfer.encode(saved.profiles,simulation?'simulation':'real'),simulation?'simulation':'real');selected=typeof saved.selected==='number'?saved.selected:selected;diameter=typeof saved.diameter==='number'&&saved.diameter>0&&saved.diameter<=100?saved.diameter:null;}}catch(_){profileStore=null;storageWarning=uiLocale.t('Profils locaux illisibles : paramètres à vérifier.');}
  if(!profiles.length)profiles=[model.empty()];
  if(!isFinite(selected)||Math.floor(selected)!==selected||selected<0&&!simulation||selected>=profiles.length||selected< -1)selected=0;
  if(simulation&&selected===-1&&diameter===null)diameter=6;
  try{if(saved&&saved.removed&&transfer&&typeof saved.removed.index==='number'&&saved.removed.index>=0&&saved.removed.index<8&&Math.floor(saved.removed.index)===saved.removed.index){removed={index:saved.removed.index,profile:transfer.decode(transfer.encode([saved.removed.profile],simulation?'simulation':'real'),simulation?'simulation':'real')[0]};}}catch(_){storageWarning=uiLocale.t('Dernière suppression illisible : profils actuels conservés.');}
  function $(id){return document.getElementById(id);}
  function text(id,value){var el=$(id);if(el&&el.textContent!==value)el.textContent=value;}
  function go(name){window.dispatchEvent(new CustomEvent('cnc-navigate',{detail:name}));}
  function screen(name,html){var el=document.createElement('section');el.id='screen-'+name;el.className='screen probe-screen';el.innerHTML=html;main.appendChild(el);return el;}
  function button(id,label,cls){return uiLocale.html('<button type="button" id="')+id+'" class="ks-secondary '+(cls||'')+'">'+label+uiLocale.html('</button>');}
  function intro(title,subtitle,extra){return uiLocale.html('<div class="card wide ks-panel-intro"><div><h2>')+title+uiLocale.html('</h2><p>')+subtitle+uiLocale.html('</p></div>')+extra+uiLocale.html('</div>');}
  screen('probe',intro(uiLocale.t('Palpage · ')+(simulation?'SIMULATION':uiLocale.t('préparation')),uiLocale.t('X / Y / Z / XYZ · aucune commande physique'),uiLocale.html('<div class="probe-actions">')+button('probe-preparation-open',uiLocale.t('Préparation'))+button('probe-profiles',uiLocale.t('Profils de sonde'))+button('probe-transfer-open',uiLocale.t('Sauvegarde / transfert'))+uiLocale.html('</div>'))+
    uiLocale.html('<div class="card probe-setup"><div id="probe-operations" class="probe-operations">')+['Z','X','Y','XYZ'].map(function(a){return uiLocale.html('<button type="button" data-probe-operation="')+a+'" aria-pressed="'+(a==='Z')+uiLocale.html('"><b>')+a+uiLocale.html('</b><span>Palper ')+a+uiLocale.html('</span></button>');}).join('')+uiLocale.html('</div>')+
    uiLocale.html('<div class="probe-fields"><label>Profil de sonde<select id="probe-profile"></select></label><label>Repère de travail<select id="probe-wcs">')+['G54','G55','G56','G57','G58','G59'].map(function(a){return uiLocale.html('<option>')+a+uiLocale.html('</option>');}).join('')+uiLocale.html('</select></label></div><p id="probe-summary"></p>')+
    uiLocale.html('<div id="probe-diagram-host"></div><p class="probe-note">Repère du dessin : X+ vers la droite, Y+ vers le haut. Coin rose et sens saisis, sans échelle ni trajet. À confronter au montage réel.</p></div>')+
    uiLocale.html('<div class="card probe-follow"><div class="probe-status"><span id="probe-signal" class="badge">Sonde : inconnu</span><span id="probe-machine"></span></div><p id="probe-availability"></p>')+
    uiLocale.html('<div class="probe-fields"><label>Outil / pige · diamètre mm<input id="probe-diameter" inputmode="decimal" placeholder="À mesurer" maxlength="10"></label><label id="probe-scenario-label">Scénario fictif<select id="probe-scenario"><option value="success">Réussite</option><option value="initial-contact">Contact actif au départ</option><option value="no-contact">Absence de contact</option><option value="stuck">Contact après retrait</option><option value="disconnect">Déconnexion</option><option value="xyz-failure">Échec au milieu de XYZ</option><option value="timeout">Délai dépassé</option><option value="partial-apply">Application partielle</option></select></label></div>')+
    uiLocale.html('<h2 id="probe-phase">En attente</h2><progress id="probe-progress" max="100" value="0" aria-label="Progression du palpage simulé"></progress><p id="probe-message" role="status"></p>')+
    uiLocale.html('<label class="probe-confirm"><input id="probe-confirm" type="checkbox"> Je confirme la position initiale fictive et le test de contact.</label><div class="probe-actions">')+button('probe-test',uiLocale.t('Tester le contact'))+button('probe-start',simulation?uiLocale.t('Lancer la simulation'):uiLocale.t('Palpage réel non activé'),'probe-start')+button('probe-stop',uiLocale.t('Arrêter le palpage'),'probe-stop')+button('probe-result',uiLocale.t('Résultats / journal'))+uiLocale.html('</div></div>'));
  function input(name,label){return uiLocale.html('<label>')+label+uiLocale.html('<input data-probe-field="')+name+uiLocale.html('" inputmode="decimal" placeholder="Non configuré" maxlength="12"></label>');}
  screen('probe-profile',intro(uiLocale.t('Profils de sonde'),uiLocale.t('Valeurs locales à ce navigateur · millimètres et mm/min'),button('probe-profile-back',uiLocale.t('Retour au palpage')))+
    uiLocale.html('<div class="card wide"><div class="probe-profile-tools"><label>Nom du profil<input id="probe-profile-name" maxlength="60"></label>')+button('probe-new',uiLocale.t('Nouveau profil'))+button('probe-restore',uiLocale.t('Restaurer le dernier supprimé'))+uiLocale.html('</div><div class="probe-tabs" id="probe-editor-tabs">')+[uiLocale.t('Géométrie'),uiLocale.t('Directions'),uiLocale.t('Recherche')].map(function(t,i){return uiLocale.html('<button type="button" data-probe-page="')+i+'">'+t+uiLocale.html('</button>');}).join('')+uiLocale.html('</div>')+
    uiLocale.html('<div data-probe-pane="0" class="probe-fields">')+input('thickness',uiLocale.t('Épaisseur Z calibrée · mm'))+input('faceX',uiLocale.t('Décalage signé face X − bord pièce · mm'))+input('faceY',uiLocale.t('Décalage signé face Y − bord pièce · mm'))+uiLocale.html('<p>Ces dimensions appartiennent à la sonde. Le diamètre de l’outil est saisi séparément sur l’écran Palpage. Les valeurs inconnues restent vides.</p></div>')+
    uiLocale.html('<div data-probe-pane="1" class="probe-fields"><label>Coin de montage<select data-probe-field="corner"><option value="">Non configuré</option><option value="--">X− / Y−</option><option value="+-">X+ / Y−</option><option value="-+">X− / Y+</option><option value="++">X+ / Y+</option></select></label>')+['X','Y'].map(function(a){return uiLocale.html('<label>Recherche ')+a+uiLocale.html('<select data-probe-field="direction')+a+uiLocale.html('"><option value="">Non configurée</option><option value="1">')+a+uiLocale.html('+</option><option value="-1">')+a+uiLocale.html('−</option></select></label>');}).join('')+uiLocale.html('<p>Z : recherche vers le bas sur une plaque posée sur le dessus. Aucun ordre XYZ réel ni dégagement automatique déduit de ce coin.</p></div>')+
    uiLocale.html('<div data-probe-pane="2" class="probe-fields">')+input('fast',uiLocale.t('Première approche · mm/min'))+input('slow',uiLocale.t('Seconde touche · mm/min'))+input('search',uiLocale.t('Recherche maximale par touche · mm'))+input('retract',uiLocale.t('Retrait entre touches · mm'))+input('clearance',uiLocale.t('Dégagement prévu · mm'))+uiLocale.html('<p>Bornes de saisie du logiciel, pas des limites machine certifiées. Aucune valeur réelle inventée.</p></div>')+
    uiLocale.html('<div id="probe-delete-confirm" hidden><h2>Supprimer ce profil ?</h2><p id="probe-delete-name"></p><p>Seul ce profil enregistré sera retiré. La dernière suppression reste récupérable jusqu’à la suppression suivante.</p><div class="probe-actions">')+button('probe-delete-cancel',uiLocale.t('Annuler'))+button('probe-delete-yes',uiLocale.t('Confirmer la suppression'),'probe-stop')+uiLocale.html('</div></div>')+
    uiLocale.html('<p id="probe-profile-status" role="status"></p><div class="probe-actions" id="probe-editor-actions">')+button('probe-save',uiLocale.t('Enregistrer le profil'))+button('probe-duplicate',uiLocale.t('Dupliquer le profil'))+button('probe-delete','Supprimer…','probe-stop')+uiLocale.html('</div></div>'));
  screen('probe-contact',intro(uiLocale.t('Tester le contact'),uiLocale.t('Vérification guidée sans déplacement automatique'),button('probe-contact-back',uiLocale.t('Retour au palpage')))+
    uiLocale.html('<div class="card wide"><h2 id="probe-contact-title"></h2><p id="probe-contact-instruction"></p><div class="probe-contact-steps"><p>1 · Contact libre</p><p>2 · Contact établi</p><p>3 · Contact libéré</p></div><div class="probe-actions">')+button('probe-free',uiLocale.t('Simuler libre'))+button('probe-touch',uiLocale.t('Simuler contact'))+uiLocale.html('</div><p id="probe-contact-status" role="status"></p><p class="probe-note">Le mode réel attend un adaptateur d’entrée sonde validé. Un état inconnu ne vaut jamais « libre ».</p></div>'));
  screen('probe-report',intro(uiLocale.t('Résultats du palpage'),uiLocale.t('Banc fictif · journal de cette page, 100 événements maximum'),button('probe-report-back',uiLocale.t('Retour au palpage')))+
    uiLocale.html('<div class="card wide"><p id="probe-result-summary"></p><div id="probe-result-values" class="probe-values"></div><ol id="probe-log"></ol><div class="probe-actions">')+button('probe-log-prev',uiLocale.t('← Précédent'))+uiLocale.html('<span id="probe-log-page"></span>')+button('probe-log-next',uiLocale.t('Suivant →'))+button('probe-report-stop',uiLocale.t('Arrêter le palpage'),'probe-stop')+button('probe-export',uiLocale.t('Exporter JSON'))+button('probe-reset',uiLocale.t('Réinitialiser le banc'))+uiLocale.html('</div><p id="probe-export-status" role="status"></p><p class="probe-note">Ces origines sont propres au banc de palpage. Les coordonnées de l’autre simulateur et celles de la CNC ne sont pas modifiées.</p></div>'));
  var entry=document.createElement('button');entry.type='button';entry.className='ks-secondary probe-entry';entry.textContent=uiLocale.t('Palpage X / Y / Z →');entry.addEventListener('click',function(){go('probe');});
  screen('probe-preparation',intro(uiLocale.t('Préparation du palpage'),uiLocale.t('Bilan des paramètres et des conditions actuelles'),button('probe-preparation-back',uiLocale.t('Retour au palpage')))+
    uiLocale.html('<div class="card"><h2>Paramètres sélectionnés</h2><div id="probe-preparation-values"></div><p id="probe-preparation-storage" role="status"></p><div class="probe-actions">')+button('probe-preparation-profile',uiLocale.t('Modifier le profil'))+button('probe-preparation-tool',uiLocale.t('Outil / repère'))+uiLocale.html('</div><p class="probe-note">Les valeurs sont celles du profil sélectionné. Ce récapitulatif ne modifie aucun paramètre.</p></div>')+
    uiLocale.html('<div class="card"><h2 id="probe-preparation-summary" role="status"></h2><ol id="probe-preparation-list"></ol><div class="probe-actions">')+button('probe-preparation-prev',uiLocale.t('← Précédent'))+uiLocale.html('<span id="probe-preparation-page"></span>')+button('probe-preparation-next',uiLocale.t('Suivant →'))+uiLocale.html('</div><p id="probe-preparation-note" class="probe-note"></p><div class="probe-actions">')+button('probe-preparation-contact',simulation?uiLocale.t('Tester le contact'):uiLocale.t('Diagnostic de l’entrée'))+button('probe-preparation-result',uiLocale.t('Résultats / journal'))+uiLocale.html('</div></div>'));
  var diagram=window.CNCProbeDiagram&&window.CNCProbeDiagram.attach($('probe-diagram-host'));
  if(!diagram)text('probe-diagram-host',uiLocale.t('Schéma indisponible. Vérifiez les paramètres du profil.'));
  document.querySelector('#screen-jog .ks-panel-intro').appendChild(entry);
  screen('probe-transfer',intro(uiLocale.t('Sauvegarde des profils · ')+(simulation?'SIMULATION':uiLocale.t('RÉEL')),uiLocale.t('Transfert par fichier entre PC et Surface'),button('probe-transfer-back',uiLocale.t('Retour au palpage')))+
    uiLocale.html('<div class="card"><h2>Exporter les profils enregistrés</h2><p id="probe-transfer-count"></p><p>Le fichier contient les cotes et réglages des profils enregistrés dans ce navigateur.</p><div class="probe-actions">')+button('probe-profiles-export',uiLocale.t('Télécharger la sauvegarde'))+uiLocale.html('</div><p id="probe-transfer-export-status" role="status"></p><p class="probe-note">Le diamètre de l’outil se règle séparément. La démonstration, les résultats et le test de contact ne sont pas transférés.</p><p class="probe-note">Copiez le fichier sur l’autre appareil puis ouvrez ce panneau dans le même mode. Les sauvegardes SIMULATION et RÉEL restent séparées.</p></div>')+
    uiLocale.html('<div class="card"><h2>Importer des profils</h2><label>Fichier de sauvegarde · JSON, 64 Ko maximum<input id="probe-profiles-file" type="file" accept=".json,application/json"></label><p id="probe-import-status" role="status">Choisissez un fichier pour afficher son contenu avant l’ajout.</p><div id="probe-import-preview" hidden><label>Profil à examiner<select id="probe-import-profile"></select></label><div id="probe-import-values" class="probe-fields"></div></div><div class="probe-actions">')+button('probe-profiles-import',uiLocale.t('Ajouter les profils'))+uiLocale.html('</div><p class="probe-note">Ajout sans écraser les profils existants. Doublons identiques ignorés ; noms en conflit refusés. Les cotes importées restent à vérifier sur votre montage.</p></div>'));
  function cancelRead(){readVersion++;if(reader&&reader.readyState===1)reader.abort();reader=null;}
  function clearImport(){cancelRead();imported=null;$('probe-profiles-import').disabled=true;$('probe-import-preview').hidden=true;}
  function transferPreview(){
    if(!imported)return;
    var p=imported[Number($('probe-import-profile').value)],host=$('probe-import-values');host.textContent='';
    if(!p)return;
    function value(k){return p[k]===null||p[k]===''?uiLocale.t('non configuré'):String(p[k]);}
    [uiLocale.t('Épaisseur Z : ')+value('thickness')+' mm',uiLocale.t('Faces X / Y : ')+value('faceX')+' / '+value('faceY')+' mm',uiLocale.t('Coin : ')+value('corner'),uiLocale.t('Sens X / Y : ')+value('directionX')+' / '+value('directionY'),uiLocale.t('Vitesses : ')+value('fast')+' / '+value('slow')+' mm/min',uiLocale.t('Recherche : ')+value('search')+' mm',uiLocale.t('Retrait : ')+value('retract')+' mm',uiLocale.t('Dégagement : ')+value('clearance')+' mm'].forEach(function(label){var el=document.createElement('p');el.className='probe-note';el.textContent=label;host.appendChild(el);});
  }
  function prepareImport(content){
    imported=transfer.decode(content,simulation?'simulation':'real');
    var plan=transfer.merge(profiles,imported),select=$('probe-import-profile');select.textContent='';
    imported.forEach(function(p,i){var opt=document.createElement('option');opt.value=String(i);opt.textContent=p.name;select.appendChild(opt);});
    select.value='0';$('probe-import-preview').hidden=false;transferPreview();
    text('probe-import-status',plan.added+uiLocale.t(' profil(s) à ajouter · ')+plan.duplicates+uiLocale.t(' doublon(s) ignoré(s). Vérifiez les valeurs ci-dessous.'));
    $('probe-profiles-import').disabled=!plan.added||engine.snapshot().running;
  }
  $('probe-transfer-open').addEventListener('click',function(){
    if(engine.snapshot().running||!transfer)return;clearImport();$('probe-profiles-file').value='';
    text('probe-transfer-count',profiles.length+uiLocale.t(' / 8 profils enregistrés · ')+(simulation?'simulation':'préparation réelle'));
    text('probe-import-status',uiLocale.t('Choisissez un fichier pour afficher son contenu avant l’ajout.'));go('probe-transfer');
  });
  $('probe-transfer-back').addEventListener('click',function(){go('probe');});
  $('probe-import-profile').addEventListener('change',transferPreview);
  $('probe-profiles-file').addEventListener('change',function(){
    clearImport();var file=this.files&&this.files[0];if(!file)return;
    if(engine.snapshot().running||!transfer)return;
    if(file.size>transfer.maxBytes){text('probe-import-status',uiLocale.t('Fichier trop volumineux (64 Ko maximum). Aucun profil ajouté.'));return;}
    var version=readVersion;reader=new FileReader();text('probe-import-status',uiLocale.t('Lecture de la sauvegarde…'));
    reader.onload=function(e){if(version!==readVersion||active!=='probe-transfer')return;try{prepareImport(e.target.result);}catch(error){clearImport();text('probe-import-status',error.message+uiLocale.t(' Aucun profil ajouté.'));}};
    reader.onerror=function(){if(version===readVersion){clearImport();text('probe-import-status',uiLocale.t('Lecture du fichier impossible. Aucun profil ajouté.'));}};
    reader.readAsText(file);
  });
  $('probe-profiles-import').addEventListener('click',function(){
    if(!imported||!transfer||engine.snapshot().running||this.disabled)return;
    try{
      var plan=transfer.merge(profiles,imported);if(!plan.added)return;
      writeProfiles({version:1,profiles:plan.profiles,selected:selected,diameter:diameter,removed:removed});
      profiles=plan.profiles;storageWarning='';clearImport();list();invalidate();
      text('probe-transfer-count',profiles.length+uiLocale.t(' / 8 profils enregistrés · ')+(simulation?'simulation':'préparation réelle'));
      text('probe-import-status',plan.added+uiLocale.t(' profil(s) ajouté(s) et enregistré(s). Sélectionnez le profil dans Palpage avant utilisation.'));
    }catch(error){text('probe-import-status',uiLocale.t('Import non enregistré : ')+error.message+uiLocale.t(' Les profils actuels sont conservés.'));}
  });
  $('probe-profiles-export').addEventListener('click',function(){
    if(engine.snapshot().running||!transfer)return;
    try{var data=transfer.encode(profiles,simulation?'simulation':'real');window.CNCDownload.save(new Blob([data],{type:'application/json'}),'cnc-profils-sonde-'+(simulation?'simulation':'reel')+'-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json');text('probe-transfer-export-status',uiLocale.t('Sauvegarde proposée au téléchargement.'));}
    catch(error){text('probe-transfer-export-status',uiLocale.t('Export impossible : ')+error.message);}
  });
  $('probe-profiles-import').disabled=true;$('probe-transfer-open').disabled=!transfer;
  function profile(){return selected===-1?model.demo():profiles[selected];}
  function writeProfiles(state){if(!profileStore)throw Error(uiLocale.t('Stockage des profils indisponible ou illisible. Les données enregistrées ne sont pas remplacées.'));profileStore.write(state);}
  function persist(){
    try{writeProfiles({version:1,profiles:profiles,selected:selected,diameter:diameter,removed:removed});storageWarning='';}
    catch(error){storageWarning=error.message+' '+uiLocale.t('Enregistrement local indisponible : valeurs conservées seulement dans cette page.');}
  }
  function list(){var select=$('probe-profile');select.textContent='';if(simulation){var d=document.createElement('option');d.value='-1';d.textContent=uiLocale.t('DÉMO · bloc fictif');select.appendChild(d);}profiles.forEach(function(p,i){var o=document.createElement('option');o.value=String(i);o.textContent=p.name;select.appendChild(o);});select.value=String(selected);}
  function collection(){return {profiles:profiles,selected:selected,removed:removed};}
  function commitProfiles(next){
    try{writeProfiles({version:1,profiles:next.profiles,selected:next.selected,removed:next.removed,diameter:diameter});}
    catch(error){text('probe-profile-status',error.message+' '+uiLocale.t('Enregistrement local impossible. Aucun changement appliqué aux profils.'));return false;}
    profiles=next.profiles;selected=next.selected;removed=next.removed;storageWarning='';pendingDelete=null;list();invalidate();showEditor();return true;
  }
  function editorClean(){
    var p=profile(),dirty=$('probe-profile-name').value!==(selected===-1?uiLocale.t('Copie du bloc fictif'):p.name);
    document.querySelectorAll('[data-probe-field]').forEach(function(el){var value=p[el.getAttribute('data-probe-field')];if(el.value!==(value===null?'':String(value)))dirty=true;});
    if(dirty)text('probe-profile-status',uiLocale.t('Enregistrez vos modifications avant cette action, ou revenez au palpage pour les abandonner.'));return !dirty;
  }
  function parse(value){if(!value.trim())return null;if(!/^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(value.trim()))return NaN;return Number(value.trim().replace(',','.'));}
  function available(){return simulation&&machine&&machine.fresh&&machine.activeState==='Idle'&&machine.workflow==='idle'&&!busy;}
  function liveInput(){
    var p=machine&&machine.probeInput,elapsed=Date.now()-machineReceived;
    if(!machine||!p)return {state:'unknown',reason:uiLocale.t('Diagnostic indisponible : connectez un contrôleur Grbl dans CNCjs.')};
    if(!p.fresh||typeof p.ageMs!=='number'||p.ageMs<0||elapsed<0||p.ageMs+elapsed>2500)return {state:'unknown',reason:p.fresh?uiLocale.t('Rapport trop ancien : entrée sonde inconnue.'):p.reason||uiLocale.t('Attendre un nouveau rapport Grbl.')};
    return {state:p.state==='free'||p.state==='contact'?p.state:'unknown',reason:p.reason||uiLocale.t('Rapport sonde non reconnu.')};
  }
  function release(){if(locked&&window.cncJobSimulation){window.cncJobSimulation.releaseProbe();locked=false;}if(timer){clearInterval(timer);timer=null;}}
  function renderPreparation(){
    if(!preparation)return;
    var p=profile(),s=engine.snapshot(),wcs=$('probe-wcs').value;
    var report=preparation.inspect({simulation:simulation,profile:p,operation:operation,diameter:diameter,wcs:wcs,state:s,available:!!available(),confirmed:$('probe-confirm').checked});
    var signature=JSON.stringify([report,p,diameter,operation,wcs,storageWarning]);
    if(signature!==preparationKey){preparationPage=0;preparationKey=signature;}
    function value(v,unit){return v===null||v===undefined||v===''?uiLocale.t('à renseigner'):String(v).replace('.',',')+(unit||'');}
    var rows=[uiLocale.t('Profil : ')+p.name,uiLocale.t('Opération : ')+operation+uiLocale.t(' · repère : ')+wcs,uiLocale.t('Coin : ')+value(p.corner)+uiLocale.t(' · sens X / Y : ')+value(p.directionX)+' / '+value(p.directionY),uiLocale.t('Outil / pige : ')+value(diameter,' mm')+(operation==='Z'?uiLocale.t(' · facultatif pour Z'):''),uiLocale.t('Épaisseur Z : ')+value(p.thickness,' mm'),uiLocale.t('Faces X / Y : ')+value(p.faceX,' mm')+' / '+value(p.faceY,' mm'),uiLocale.t('Approche / seconde touche : ')+value(p.fast,' mm/min')+' / '+value(p.slow,' mm/min'),uiLocale.t('Recherche / retrait / dégagement : ')+value(p.search,' mm')+' / '+value(p.retract,' mm')+' / '+value(p.clearance,' mm')];
    var values=$('probe-preparation-values');
    if(values.getAttribute('data-key')!==JSON.stringify(rows)){values.textContent='';rows.forEach(function(row){var el=document.createElement('p');el.textContent=row;values.appendChild(el);});values.setAttribute('data-key',JSON.stringify(rows));}
    text('probe-preparation-summary',report.title);text('probe-preparation-note',report.note);text('probe-preparation-storage',storageWarning);
    var per=3,total=Math.max(1,Math.ceil(report.items.length/per));preparationPage=Math.min(preparationPage,total-1);
    var shown=report.items.slice(preparationPage*per,preparationPage*per+per),list=$('probe-preparation-list'),key=JSON.stringify([preparationPage,shown]);
    if(list.getAttribute('data-key')!==key){list.textContent='';list.setAttribute('start',String(preparationPage*per+1));shown.forEach(function(item){var li=document.createElement('li'),title=document.createElement('strong'),detail=document.createElement('p');title.textContent=item.title;detail.textContent=item.detail;li.appendChild(title);li.appendChild(detail);list.appendChild(li);});list.setAttribute('data-key',key);}
    text('probe-preparation-page',report.items.length?uiLocale.t('Page ')+(preparationPage+1)+' / '+total:uiLocale.t('Aucun point bloquant fictif'));
    $('probe-preparation-prev').disabled=preparationPage===0;$('probe-preparation-next').disabled=preparationPage+1>=total;
  }
  function render(){
    if(active==='probe-preparation'){renderPreparation();return;}
    if(active==='probe-profile'){
      var editingBlocked=engine.snapshot().running;
      document.querySelectorAll('#screen-probe-profile input,#screen-probe-profile select,#screen-probe-profile button').forEach(function(el){el.disabled=editingBlocked;});
      ['probe-profile-name','probe-new','probe-restore'].forEach(function(id){$(id).disabled=editingBlocked||!!pendingDelete;});
      $('probe-new').disabled=editingBlocked||!!pendingDelete||!manager||profiles.length>=8;
      $('probe-duplicate').disabled=editingBlocked||!manager||profiles.length>=8;
      $('probe-delete').disabled=editingBlocked||!manager||selected===-1||profiles.length<=1;
      $('probe-restore').disabled=editingBlocked||!!pendingDelete||!manager||!removed||profiles.length>=8;
      $('probe-save').disabled=editingBlocked||!manager;return;
    }
    if(active!=='probe'&&active!=='probe-contact'&&active!=='probe-report')return;
    var s=engine.snapshot(),p=profile(),errors=model.validate(p,operation,diameter);
    if(active==='probe-report'){renderReport();return;}
    if(active==='probe'&&diagram)diagram.update(p,operation,diameter);
    var live=liveInput(),signal=simulation?s.probe:live.state;
    text('probe-signal',uiLocale.t('Sonde : ')+(signal==='free'?uiLocale.t('libre')+(simulation?uiLocale.t(' (fictive)'):uiLocale.t(' · signal reçu')):signal==='contact'?uiLocale.t('contact')+(simulation?uiLocale.t(' (fictif)'):uiLocale.t(' · signal reçu')):uiLocale.t('inconnu')));
    text('probe-machine',simulation?uiLocale.t('Contrôleur virtuel · ')+(machine?machine.activeState:uiLocale.t('indisponible')):uiLocale.t('Contrôleur réel · ')+(machine?machine.activeState:uiLocale.t('déconnecté')));
    text('probe-summary',(selected===-1?uiLocale.t('Valeurs de démonstration · '):uiLocale.t('Profil : '))+p.name+uiLocale.t(' · coin ')+(p.corner||uiLocale.t('à définir'))+' · X '+(p.directionX===1?'+':p.directionX===-1?'−':'?')+' / Y '+(p.directionY===1?'+':p.directionY===-1?'−':'?'));
    text('probe-availability',!simulation?live.reason:storageWarning||errors[0]||(!available()&&!s.running?uiLocale.t('Simulateur occupé, en alarme ou indisponible.'):uiLocale.t('Banc fictif : aucune trajectoire physique simulée.')));
    text('probe-phase',s.running?s.message:s.phase==='done'?uiLocale.t('Palpage simulé terminé'):s.phase==='failed'?uiLocale.t('Cycle interrompu'):uiLocale.t('En attente'));
    text('probe-message',simulation?(message||s.message):uiLocale.t('Préparation uniquement. Palpage réel désactivé.'));if($('probe-progress').value!==s.progress)$('probe-progress').value=s.progress;
    $('probe-start').disabled=!simulation||s.running||s.uncertain||!available()||errors.length>0||!s.contactVerified||!$('probe-confirm').checked;
    $('probe-stop').disabled=!s.running;$('probe-test').disabled=s.running;$('probe-profiles').disabled=s.running;$('probe-transfer-open').disabled=s.running||!transfer;$('probe-preparation-open').disabled=s.running||!preparation;
    ['probe-profile','probe-wcs','probe-diameter','probe-scenario','probe-confirm'].forEach(function(id){$(id).disabled=s.running;});
    document.querySelectorAll('[data-probe-operation]').forEach(function(b){b.disabled=s.running;b.setAttribute('aria-pressed',String(b.getAttribute('data-probe-operation')===operation));});
    text('probe-contact-title',simulation?uiLocale.t('Entrée de sonde fictive'):uiLocale.t('Entrée réelle : ')+(signal==='free'?uiLocale.t('libre signalé'):signal==='contact'?uiLocale.t('contact signalé'):'inconnue'));
    text('probe-contact-instruction',simulation?uiLocale.t('Utilisez les boutons pour simuler libre → contact → libre. Aucun mouvement.'):uiLocale.t('Lecture seule des rapports CNCjs existants. Ce diagnostic ne valide ni le câblage ni un cycle de palpage.'));
    text('probe-contact-status',simulation?s.message:live.reason);$('probe-free').disabled=$('probe-touch').disabled=!simulation||s.running;
  }
  function invalidate(){engine.resetContact();$('probe-confirm').checked=false;message='';render();}
  function showEditor(){
    if(engine.snapshot().running)return;
    $('probe-profile-name').value=selected===-1?uiLocale.t('Copie du bloc fictif'):profile().name;
    document.querySelectorAll('[data-probe-field]').forEach(function(el){var value=profile()[el.getAttribute('data-probe-field')];el.value=value===null?'':String(value);});
    showPage(0);text('probe-profile-status',selected===-1?uiLocale.t('Copie de démonstration ; utilisable uniquement dans ce mode simulation.'):storageWarning||profiles.length+uiLocale.t(' / 8 profils · Les champs vides restent non configurés.')+(profiles.length===1?uiLocale.t(' Conservez au moins un profil.'):''));go('probe-profile');
  }
  function showPage(n){editorPage=n;pendingDelete=null;$('probe-delete-confirm').hidden=true;$('probe-editor-tabs').hidden=false;$('probe-editor-actions').hidden=false;document.querySelectorAll('[data-probe-pane]').forEach(function(el){el.hidden=el.getAttribute('data-probe-pane')!==String(n);});document.querySelectorAll('[data-probe-page]').forEach(function(b){b.setAttribute('aria-pressed',String(b.getAttribute('data-probe-page')===String(n)));});render();}
  function renderReport(){
    var r=engine.report(),s=r.state,events=r.events,per=3;
    page=Math.min(page,Math.max(0,Math.ceil(events.length/per)-1));
    text('probe-result-summary',s.uncertain?uiLocale.t('Origine fictive partiellement appliquée : à vérifier. Réinitialisez le banc avant un nouvel essai.'):s.phase==='done'?s.message:s.message+uiLocale.t(' Aucune réussite annoncée.'));
    var values=$('probe-result-values');values.textContent='';
    ['X','Y','Z'].forEach(function(a){var el=document.createElement('p'),m=s.measurements[a];el.textContent=a+uiLocale.t(' · contact : ')+(m?m.contact.toFixed(3)+' mm':'—')+uiLocale.t(' · origine appliquée : ')+(typeof s.applied[a]==='number'?s.applied[a].toFixed(3)+' mm':'—');values.appendChild(el);});
    var log=$('probe-log');log.textContent='';events.slice(page*per,page*per+per).forEach(function(e){var li=document.createElement('li');li.textContent=new Date(e.time).toLocaleTimeString(window.cncI18n?window.cncI18n.locale:'fr-FR')+' · '+e.message;log.appendChild(li);});
    text('probe-log-page',(page+1)+' / '+Math.max(1,Math.ceil(events.length/per)));$('probe-log-prev').disabled=page===0;$('probe-log-next').disabled=(page+1)*per>=events.length;$('probe-reset').disabled=s.running;$('probe-report-stop').disabled=!s.running;
  }
  function finishStep(){var s=engine.advance();if(!s.running)release();render();}
  $('probe-start').addEventListener('click',function(){
    if($('probe-start').disabled)return;
    try{
      if(!window.cncJobSimulation||typeof window.cncJobSimulation.acquireProbe!=='function')throw Error(uiLocale.t('Verrou du simulateur indisponible.'));
      window.cncJobSimulation.acquireProbe();locked=true;
      engine.start({profile:profile(),diameter:diameter,operation:operation,wcs:$('probe-wcs').value,scenario:$('probe-scenario').value,confirmed:$('probe-confirm').checked,idle:available()});
      message='';$('probe-confirm').checked=false;timer=setInterval(finishStep,750);render();
    }catch(e){release();message=e.message;render();}
  });
  function interrupt(reason){if(engine.snapshot().running){engine.stop(reason);release();message='';render();}}
  $('probe-stop').addEventListener('click',function(){interrupt(uiLocale.t('Arrêt utilisateur fictif. Aucun retrait automatique.'));});
  $('probe-report-stop').addEventListener('click',function(){interrupt(uiLocale.t('Arrêt utilisateur fictif. Aucun retrait automatique.'));});
  $('probe-test').addEventListener('click',function(){engine.resetContact();message='';go('probe-contact');});
  $('probe-free').addEventListener('click',function(){engine.contact('free');render();});$('probe-touch').addEventListener('click',function(){engine.contact('contact');render();});
  ['probe-contact-back','probe-report-back','probe-profile-back'].forEach(function(id){$(id).addEventListener('click',function(){go('probe');});});
  $('probe-result').addEventListener('click',function(){page=0;go('probe-report');});$('probe-profiles').addEventListener('click',showEditor);
  $('probe-preparation-open').addEventListener('click',function(){if(engine.snapshot().running||!preparation)return;preparationPage=0;go('probe-preparation');});
  $('probe-preparation-back').addEventListener('click',function(){go('probe');});
  $('probe-preparation-profile').addEventListener('click',showEditor);
  $('probe-preparation-tool').addEventListener('click',function(){go('probe');$('probe-diameter').focus();});
  $('probe-preparation-contact').addEventListener('click',function(){engine.resetContact();message='';go('probe-contact');});
  $('probe-preparation-result').addEventListener('click',function(){page=0;go('probe-report');});
  $('probe-preparation-prev').addEventListener('click',function(){if(preparationPage>0){preparationPage--;renderPreparation();}});
  $('probe-preparation-next').addEventListener('click',function(){if(!this.disabled){preparationPage++;renderPreparation();}});
  function profileAction(action){if(engine.snapshot().running||!manager||pendingDelete||!editorClean())return;try{if(commitProfiles(action(collection())))text('probe-profile-status',uiLocale.t('Profil enregistré. ')+profiles.length+uiLocale.t(' / 8 profils.'));}catch(e){text('probe-profile-status',e.message);}}
  $('probe-new').addEventListener('click',function(){profileAction(function(s){return manager.create(s);});});
  $('probe-duplicate').addEventListener('click',function(){profileAction(function(s){return manager.duplicate(s,selected,simulation);});});
  $('probe-restore').addEventListener('click',function(){profileAction(function(s){return manager.restore(s);});});
  $('probe-delete').addEventListener('click',function(){
    if(engine.snapshot().running||!manager||this.disabled||!editorClean())return;
    pendingDelete={index:selected,snapshot:JSON.stringify(collection())};text('probe-delete-name',uiLocale.t('Profil : ')+profile().name);
    $('probe-delete-confirm').hidden=false;$('probe-editor-tabs').hidden=true;$('probe-editor-actions').hidden=true;
    document.querySelectorAll('[data-probe-pane]').forEach(function(el){el.hidden=true;});text('probe-profile-status',uiLocale.t('Aucune suppression avant confirmation.'));render();$('probe-delete-cancel').focus();
  });
  $('probe-delete-cancel').addEventListener('click',function(){showPage(editorPage);text('probe-profile-status',uiLocale.t('Suppression annulée.'));});
  $('probe-delete-yes').addEventListener('click',function(){
    if(active!=='probe-profile'||engine.snapshot().running||!pendingDelete||!manager)return;
    if(pendingDelete.snapshot!==JSON.stringify(collection())){showPage(editorPage);text('probe-profile-status',uiLocale.t('Les profils ont changé. Sélectionnez à nouveau le profil.'));return;}
    try{if(commitProfiles(manager.remove(collection(),pendingDelete.index)))text('probe-profile-status',uiLocale.t('Profil supprimé. Vous pouvez restaurer la dernière suppression.'));}catch(e){text('probe-profile-status',e.message);}
  });
  $('probe-save').addEventListener('click',function(){
    if(engine.snapshot().running||pendingDelete||!manager)return;
    var p=model.empty(),bad='';p.name=$('probe-profile-name').value.trim();
    if(!p.name){text('probe-profile-status',uiLocale.t('Donnez un nom au profil.'));return;}
    document.querySelectorAll('[data-probe-field]').forEach(function(el){var k=el.getAttribute('data-probe-field'),v=el.value;if(k==='corner')p[k]=v;else{p[k]=parse(v);if(p[k]!==null&&(!isFinite(p[k])||(model.fields[k]&&(p[k]<model.fields[k][0]||p[k]>model.fields[k][1]))))bad=uiLocale.t('Valeur hors limites : ')+k+'.';}});
    if(p.slow!==null&&p.fast!==null&&p.slow>p.fast)bad=uiLocale.t('La seconde touche doit être plus lente ou égale à l’approche.');
    if(p.retract!==null&&p.search!==null&&p.retract>=p.search)bad=uiLocale.t('Le retrait doit être inférieur à la recherche.');
    if(bad){text('probe-profile-status',bad);return;}
    try{if(commitProfiles(manager.save(collection(),selected,p,simulation)))text('probe-profile-status',uiLocale.t('Profil enregistré. Les champs vides bloquent les opérations concernées.'));}catch(e){text('probe-profile-status',e.message);}
  });
  document.querySelectorAll('[data-probe-page]').forEach(function(b){b.addEventListener('click',function(){showPage(Number(b.getAttribute('data-probe-page')));});});
  document.querySelectorAll('[data-probe-operation]').forEach(function(b){b.addEventListener('click',function(){if(engine.snapshot().running)return;operation=b.getAttribute('data-probe-operation');invalidate();});});
  $('probe-profile').addEventListener('change',function(){selected=Number(this.value);persist();invalidate();});
  $('probe-diameter').value=diameter===null?'':String(diameter);
  $('probe-diameter').addEventListener('change',function(){var value=parse(this.value);diameter=typeof value==='number'&&isFinite(value)&&value>0&&value<=100?value:null;persist();invalidate();});
  ['probe-wcs','probe-scenario'].forEach(function(id){$(id).addEventListener('change',invalidate);});$('probe-confirm').addEventListener('change',render);
  $('probe-scenario-label').hidden=!simulation;$('probe-confirm').parentElement.hidden=!simulation;
  if(!simulation){
    text('probe-test',uiLocale.t('Diagnostic de l’entrée'));
    $('probe-free').hidden=$('probe-touch').hidden=true;
    document.querySelector('#screen-probe-contact .probe-contact-steps').hidden=true;
    document.querySelector('#screen-probe-contact h2').textContent=uiLocale.t('Diagnostic de l’entrée sonde');
    document.querySelector('#screen-probe-contact .ks-panel-intro p').textContent=uiLocale.t('Rapports reçus · lecture seule · aucune commande machine');
    document.querySelector('#screen-probe-contact .probe-note').textContent=uiLocale.t('Un champ Pn absent reste inconnu. Le test guidé réel et le lancement restent désactivés jusqu’à validation du firmware et du montage.');
  }
  $('probe-log-prev').addEventListener('click',function(){page--;renderReport();});$('probe-log-next').addEventListener('click',function(){page++;renderReport();});
  $('probe-reset').addEventListener('click',function(){if(engine.snapshot().running)return;engine=model.create(simulation?'simulation':'disabled');message=uiLocale.t('Banc fictif réinitialisé. Aucun repère réel modifié.');renderReport();});
  $('probe-export').addEventListener('click',function(){try{var data=JSON.stringify(engine.report(),null,2);window.CNCDownload.save(new Blob([data],{type:'application/json'}),'cnc-palpage-simulation-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json');text('probe-export-status',uiLocale.t('Sauvegarde proposée au téléchargement.'));}catch(error){text('probe-export-status',uiLocale.t('Export impossible : ')+error.message);}});
  window.addEventListener('cnc-screen-change',function(e){active=e.detail;if(active!=='probe-profile'&&pendingDelete){showPage(editorPage);text('probe-profile-status',uiLocale.t('Suppression annulée à la sortie du panneau.'));}if(active!=='probe-transfer')clearImport();if(engine.snapshot().running&&active!=='probe'&&active!=='probe-report')interrupt(uiLocale.t('Sortie du panneau de palpage : simulation arrêtée. Aucun retrait automatique.'));render();});
  window.addEventListener('cnc-job-status',function(e){if(!!e.detail.simulation!==simulation)return;if(machine!==e.detail.machine)machineReceived=Date.now();machine=e.detail.machine;busy=!!e.detail.busy;if(engine.snapshot().running&&!available())interrupt(uiLocale.t('État du simulateur incompatible. Cycle interrompu, aucune reprise automatique.'));var signature=JSON.stringify([machine&&machine.port,machine&&machine.activeState,machine&&machine.fresh,busy,simulation?null:liveInput()]);if(signature!==lastState){lastState=signature;render();}});
  window.addEventListener('cnc-probe-interrupt',function(){interrupt(uiLocale.t('Alarme fictive. Cycle interrompu ; aucune origine supplémentaire appliquée.'));});
  document.addEventListener('visibilitychange',function(){if(document.hidden)interrupt(uiLocale.t('Page masquée : simulation interrompue, aucune reprise automatique.'));});
  window.addEventListener('beforeunload',function(){release();});
  list();
})();

