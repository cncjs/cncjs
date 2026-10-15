(function(root){
  'use strict';
  function copy(value){return JSON.parse(JSON.stringify(value));}
  var fields={thickness:[0.001,100],faceX:[-100,100],faceY:[-100,100],fast:[1,1000],slow:[1,1000],search:[0.01,50],retract:[0.01,20],clearance:[0.01,50]};
  var fieldNames={thickness:'épaisseur Z',faceX:'décalage de face X',faceY:'décalage de face Y',fast:'vitesse d’approche',slow:'vitesse de seconde touche',search:'distance de recherche',retract:'distance de retrait',clearance:'dégagement'};
  function empty(){return {name:'Nouvelle sonde',corner:'',directionX:null,directionY:null,thickness:null,faceX:null,faceY:null,fast:null,slow:null,search:null,retract:null,clearance:null};}
  function demo(){return {name:'Bloc fictif — démonstration',corner:'--',directionX:1,directionY:1,thickness:10,faceX:-5,faceY:-5,fast:100,slow:25,search:10,retract:2,clearance:5};}
  function validNumber(n,bounds){return typeof n==='number'&&isFinite(n)&&n>=bounds[0]&&n<=bounds[1];}
  function normalize(raw){
    var p=empty();raw=raw||{};
    if(typeof raw.name==='string'&&raw.name.trim())p.name=raw.name.trim().slice(0,60);
    if(['--','+-','-+','++'].indexOf(raw.corner)>=0)p.corner=raw.corner;
    ['directionX','directionY'].forEach(function(k){if(raw[k]===-1||raw[k]===1)p[k]=raw[k];});
    Object.keys(fields).forEach(function(k){if(validNumber(raw[k],fields[k]))p[k]=raw[k];});
    return p;
  }
  function validate(p,operation,diameter){
    var errors=[];
    if(['X','Y','Z','XYZ'].indexOf(operation)<0)return ['Opération invalide.'];
    if(!p||typeof p.name!=='string'||!p.name.trim())return ['Profil absent.'];
    var needed=['fast','slow','search','retract','clearance'];
    if(operation.indexOf('Z')>=0)needed.push('thickness');
    ['X','Y'].forEach(function(a){if(operation.indexOf(a)>=0){needed.push('face'+a);if(p['direction'+a]!==1&&p['direction'+a]!==-1)errors.push('Direction '+a+' à renseigner.');}});
    needed.forEach(function(k){if(!validNumber(p[k],fields[k]))errors.push('Paramètre à renseigner : '+fieldNames[k]+'.');});
    if(operation!=='Z'&&!validNumber(diameter,[0.01,100]))errors.push('Diamètre outil / pige à renseigner.');
    if(['--','+-','-+','++'].indexOf(p.corner)<0)errors.push('Coin de montage à choisir.');
    if(validNumber(p.slow,fields.slow)&&validNumber(p.fast,fields.fast)&&p.slow>p.fast)errors.push('La seconde touche doit être au plus aussi rapide que l’approche.');
    if(validNumber(p.retract,fields.retract)&&validNumber(p.search,fields.search)&&p.retract>=p.search)errors.push('Le retrait doit être inférieur à la recherche maximale.');
    return errors;
  }
  // Coordinates are synthetic machine coordinates in mm. Face offset is signed:
  // face = workpiece edge + offset; face = tool centre at contact + direction * radius.
  function compensate(axis,contact,p,diameter){
    if(!validNumber(contact,[-100000,100000])||validate(p,axis,diameter).length)throw Error('Mesure ou profil invalide.');
    var origin=axis==='Z'?contact-p.thickness:contact+p['direction'+axis]*diameter/2-p['face'+axis];
    return Math.round(origin*1000000)/1000000;
  }
  var labels={checks:'Vérifications',prepare:'Préparation fictive',search:'Première recherche',contact:'Validation du contact',retract:'Retrait et libération',slow:'Seconde touche lente',calculate:'Calcul de l’origine',validate:'Validation des mesures',apply:'Application fictive',clear:'Dégagement fictif',done:'Terminé'};
  var scenarios=['success','initial-contact','no-contact','stuck','disconnect','xyz-failure','timeout','partial-apply'];
  function create(mode,clock){
    clock=clock||Date.now;
    var s={running:false,phase:'idle',axis:'',probe:'unknown',contactVerified:false,message:'Tester le contact avant de lancer.',progress:0,measurements:{},origins:{},applied:{},uncertain:false}, log=[],seq=0,plan=[],index=0,settings=null,contactStage=0;
    function event(message,data){var e={id:++seq,time:new Date(clock()).toISOString(),phase:s.phase,axis:s.axis,message:message};if(data)e.data=copy(data);log.unshift(e);if(log.length>100)log.pop();}
    function snapshot(){return copy(s);}
    function stop(message){if(!s.running)return;if(Object.keys(s.applied).length)s.uncertain=true;s.running=false;s.phase='failed';s.contactVerified=false;contactStage=0;s.probe='unknown';s.message=(message||'Arrêt utilisateur. Aucun retrait automatique.')+(s.uncertain?' Origine fictive à vérifier.':'');event(s.message);}
    function resetContact(){if(s.running)throw Error('Cycle en cours.');contactStage=0;s.contactVerified=false;s.probe='unknown';s.message='Test guidé : libre → contact → libre.';}
    function contact(value){
      if(mode!=='simulation'||s.running)throw Error('Test virtuel uniquement, hors cycle.');
      if(value!=='free'&&value!=='contact')throw Error('Signal invalide.');
      s.probe=value;
      if(contactStage===0&&value==='free')contactStage=1;
      else if(contactStage===1&&value==='contact')contactStage=2;
      else if(contactStage===2&&value==='free'){contactStage=3;s.contactVerified=true;}
      else if(contactStage===3&&value==='contact'){s.contactVerified=false;contactStage=2;}
      s.message=s.contactVerified?'Contact fictif vérifié et libre.':contactStage===1?'Simulez maintenant un contact.':contactStage===2?'Simulez la libération du contact.':'Commencez par un signal libre.';
      event(s.message);return snapshot();
    }
    function start(request){
      if(mode!=='simulation')throw Error('Palpage réel non raccordé.');
      if(s.running)throw Error('Cycle déjà en cours.');
      if(s.uncertain)throw Error('Origine fictive à vérifier : réinitialisez le banc.');
      if(!s.contactVerified||s.probe!=='free')throw Error('Vérifiez le contact libre → contact → libre.');
      var errors=validate(request.profile,request.operation,request.diameter);
      if(errors.length)throw Error(errors[0]);
      if(request.confirmed!==true||request.idle!==true)throw Error('Position initiale fictive et disponibilité à confirmer.');
      if(['G54','G55','G56','G57','G58','G59'].indexOf(request.wcs)<0||scenarios.indexOf(request.scenario)<0)throw Error('Repère ou scénario invalide.');
      if(request.scenario==='xyz-failure'&&request.operation!=='XYZ')throw Error('Choisissez XYZ pour cet incident.');
      settings={profile:normalize(request.profile),operation:request.operation,diameter:request.diameter,wcs:request.wcs,scenario:request.scenario};
      s={running:true,phase:'checks',axis:'',probe:'free',contactVerified:false,message:labels.checks,progress:0,measurements:{},origins:{},applied:{},uncertain:false};
      contactStage=0;index=0;plan=[{phase:'checks'},{phase:'prepare'}];
      // Scripted demonstration order only; no trajectory or real XYZ order is derived.
      request.operation.split('').forEach(function(a){['search','contact','retract','slow'].forEach(function(p){plan.push({phase:p,axis:a});});});
      ['calculate','validate','apply','clear','done'].forEach(function(p){plan.push({phase:p});});
      event('Démarrage du banc fictif '+request.operation+' · '+request.wcs+'.',settings);return snapshot();
    }
    function advance(){
      if(!s.running)return snapshot();
      var step=plan[index++];s.phase=step.phase;s.axis=step.axis||'';s.message=labels[s.phase]+(s.axis?' · '+s.axis:'');s.progress=Math.floor(index/plan.length*100);
      var scenario=settings.scenario;
      if(s.phase==='checks'&&scenario==='initial-contact'){s.probe='contact';stop('Contact déjà actif au départ. Aucune recherche.');return snapshot();}
      if(s.phase==='search'&&scenario==='disconnect'){stop('Connexion fictive perdue. Nouvelle vérification requise ; aucune reprise automatique.');return snapshot();}
      if(s.phase==='contact'&&(scenario==='no-contact'||scenario==='timeout'||(scenario==='xyz-failure'&&s.axis==='Y'))){stop(scenario==='timeout'?'Délai fictif dépassé. Aucun retrait automatique.':'Recherche bornée terminée sans contact valide. Aucune origine appliquée.');return snapshot();}
      if(s.phase==='contact')s.probe='contact';
      if(s.phase==='retract'){
        if(scenario==='stuck'){stop('Contact persistant après retrait. Cycle bloqué.');return snapshot();}
        s.probe='free';
      }
      if(s.phase==='slow') {s.probe='contact';s.measurements[s.axis]={contact:{X:100,Y:200,Z:30}[s.axis],success:true};}
      if(s.phase==='calculate')settings.operation.split('').forEach(function(a){s.origins[a]=compensate(a,s.measurements[a].contact,settings.profile,settings.diameter);});
      if(s.phase==='apply'){
        if(scenario==='partial-apply'){var first=settings.operation[0];s.applied[first]=s.origins[first];s.uncertain=true;stop('Échec d’application fictive : origine à vérifier. Suite bloquée.');return snapshot();}
        s.applied=copy(s.origins);
      }
      if(s.phase==='clear')s.probe='free';
      if(s.phase==='done'){s.running=false;s.message='Retirez la sonde et la pince avant de lancer l’usinage.';}
      event(s.message,s.phase==='slow'?s.measurements[s.axis]:s.phase==='apply'?{origins:s.applied}:null);return snapshot();
    }
    function report(){return {version:1,mode:mode==='simulation'?'simulation-palpage':'preparation-palpage',exportedAt:new Date(clock()).toISOString(),parameters:settings?copy(settings):null,state:snapshot(),events:copy(log),note:'Banc fictif indépendant : aucun G-code, aucune trajectoire ni origine machine réelle. Coordonnées de contact synthétiques en mm.'};}
    return {snapshot:snapshot,resetContact:resetContact,contact:contact,start:start,advance:advance,stop:stop,report:report};
  }
  var api={empty:empty,demo:demo,normalize:normalize,validate:validate,compensate:compensate,create:create,fields:fields};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CNCProbe=api;
})(typeof window==='undefined'?this:window);
