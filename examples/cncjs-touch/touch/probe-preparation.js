(function(root){
  'use strict';
  var model=typeof module==='object'&&module.exports?require('./probe-model'):root.CNCProbe;
  // Read-only explanation of the existing simulation gates; never grants machine permission.
  function inspect(input){
    var i=input||{},s=i.state||{},simulation=i.simulation===true,items=[];
    function add(title,detail){items.push({title:title,detail:detail});}
    if(!simulation)add('Palpage réel désactivé','L’adaptateur et le montage restent à valider. Un profil complet ou un signal libre ne permet pas de lancer.');
    model.validate(i.profile,i.operation,i.diameter).forEach(function(error){add('Paramètres du palpage',error);});
    if(!/^G5[4-9]$/.test(i.wcs||''))add('Repère à choisir','Sélectionnez un repère de travail G54 à G59 dans Palpage.');
    if(simulation){
      if(s.running)add('Cycle fictif en cours','Attendez sa fin ou utilisez Arrêter dans Palpage.');
      if(s.uncertain)add('Origine fictive à vérifier','Consultez les résultats puis réinitialisez le banc avant un nouvel essai.');
      if(!s.running&&i.available!==true)add('Simulateur indisponible','Il doit être connecté, au repos et sans alarme ni travail concurrent.');
      if(!s.contactVerified||s.probe!=='free')add('Contact fictif à tester','Effectuez libre → contact → libre. Un changement de paramètres impose un nouveau test.');
      if(i.confirmed!==true)add('Position fictive à confirmer','Cochez la confirmation sur Palpage après avoir vérifié les paramètres et le contact.');
    }
    return {ready:simulation&&items.length===0,items:items,
      title:simulation?(items.length?items.length+' point(s) avant simulation':'Prêt pour la simulation uniquement'):'Préparation réelle · lancement désactivé',
      note:simulation?'Ce bilan concerne le banc fictif. Aucun trajet ni risque de collision calculé.':'Ce bilan ne valide ni le câblage, ni les cotes calibrées, ni les courses et dégagements du montage.'};
  }
  var api={inspect:inspect};if(typeof module==='object'&&module.exports)module.exports=api;else root.CNCProbePreparation=api;
})(typeof window==='object'?window:this);
