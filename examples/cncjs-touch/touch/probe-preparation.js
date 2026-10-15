(function(root){
  'use strict';
  var uiLocale=(typeof window!=='undefined'&&window.cncI18n)||{t:function(s){return s;},html:function(s){return s;}};
  var model=typeof module==='object'&&module.exports?require('./probe-model'):root.CNCProbe;
  // Read-only explanation of the existing simulation gates; never grants machine permission.
  function inspect(input){
    var i=input||{},s=i.state||{},simulation=i.simulation===true,items=[];
    function add(title,detail){items.push({title:title,detail:detail});}
    if(!simulation)add(uiLocale.t('Palpage réel désactivé'),uiLocale.t('L’adaptateur et le montage restent à valider. Un profil complet ou un signal libre ne permet pas de lancer.'));
    model.validate(i.profile,i.operation,i.diameter).forEach(function(error){add(uiLocale.t('Paramètres du palpage'),error);});
    if(!/^G5[4-9]$/.test(i.wcs||''))add(uiLocale.t('Repère à choisir'),uiLocale.t('Sélectionnez un repère de travail G54 à G59 dans Palpage.'));
    if(simulation){
      if(s.running)add(uiLocale.t('Cycle fictif en cours'),uiLocale.t('Attendez sa fin ou utilisez Arrêter dans Palpage.'));
      if(s.uncertain)add(uiLocale.t('Origine fictive à vérifier'),uiLocale.t('Consultez les résultats puis réinitialisez le banc avant un nouvel essai.'));
      if(!s.running&&i.available!==true)add(uiLocale.t('Simulateur indisponible'),uiLocale.t('Il doit être connecté, au repos et sans alarme ni travail concurrent.'));
      if(!s.contactVerified||s.probe!=='free')add(uiLocale.t('Contact fictif à tester'),uiLocale.t('Effectuez libre → contact → libre. Un changement de paramètres impose un nouveau test.'));
      if(i.confirmed!==true)add(uiLocale.t('Position fictive à confirmer'),uiLocale.t('Cochez la confirmation sur Palpage après avoir vérifié les paramètres et le contact.'));
    }
    return {ready:simulation&&items.length===0,items:items,
      title:simulation?(items.length?items.length+uiLocale.t(' point(s) avant simulation'):uiLocale.t('Prêt pour la simulation uniquement')):uiLocale.t('Préparation réelle · lancement désactivé'),
      note:simulation?uiLocale.t('Ce bilan concerne le banc fictif. Aucun trajet ni risque de collision calculé.'):uiLocale.t('Ce bilan ne valide ni le câblage, ni les cotes calibrées, ni les courses et dégagements du montage.')};
  }
  var api={inspect:inspect};if(typeof module==='object'&&module.exports)module.exports=api;else root.CNCProbePreparation=api;
})(typeof window==='object'?window:this);
