(function(root){
  'use strict';
  var model=typeof module==='object'&&module.exports?require('./probe-model'):root.CNCProbe;
  var maxBytes=65536,kind='cnc-touch-probe-profiles',keys=Object.keys(model.empty());
  function fail(message){throw Error(message);}
  function exact(object,fields){return object&&typeof object==='object'&&!Array.isArray(object)&&Object.keys(object).length===fields.length&&fields.every(function(k){return Object.prototype.hasOwnProperty.call(object,k);});}
  function mode(value){if(value!=='real'&&value!=='simulation')fail('Mode du fichier inconnu.');return value;}
  function profile(p){
    if(!exact(p,keys))fail('Structure du profil invalide ou champs inattendus.');
    if(typeof p.name!=='string'||!p.name.trim()||p.name.length>60||/[\x00-\x1f\x7f]/.test(p.name))fail('Nom de profil invalide (60 caractères maximum).');
    if(['','--','+-','-+','++'].indexOf(p.corner)<0)fail('Coin de montage invalide.');
    ['directionX','directionY'].forEach(function(k){if(p[k]!==null&&p[k]!==-1&&p[k]!==1)fail('Direction de recherche invalide.');});
    Object.keys(model.fields).forEach(function(k){var n=p[k],bounds=model.fields[k];if(n!==null&&(typeof n!=='number'||!isFinite(n)||n<bounds[0]||n>bounds[1]))fail('Valeur hors limites : '+k+'.');});
    if(p.slow!==null&&p.fast!==null&&p.slow>p.fast)fail('Seconde touche plus rapide que l’approche.');
    if(p.retract!==null&&p.search!==null&&p.retract>=p.search)fail('Retrait supérieur ou égal à la recherche.');
    return model.normalize(p);
  }
  function validate(data,targetMode){
    mode(targetMode);
    if(!exact(data,['kind','version','mode','units','profiles'])||data.kind!==kind||data.version!==1||data.units!=='mm-mm/min')fail('Format de sauvegarde de profils non reconnu.');
    if(mode(data.mode)!==targetMode)fail('Ce fichier appartient au mode '+(data.mode==='simulation'?'SIMULATION':'RÉEL')+'. Ouvrez le même mode pour l’importer.');
    if(!Array.isArray(data.profiles)||!data.profiles.length||data.profiles.length>8)fail('La sauvegarde doit contenir de 1 à 8 profils.');
    return data.profiles.map(profile);
  }
  function encode(profiles,sourceMode){
    var data={kind:kind,version:1,mode:mode(sourceMode),units:'mm-mm/min',profiles:profiles};
    data.profiles=validate(data,sourceMode);return JSON.stringify(data,null,2);
  }
  function decode(text,targetMode){
    if(typeof text!=='string'||text.length>maxBytes)fail('Fichier trop volumineux (64 Ko maximum).');
    var data;try{data=JSON.parse(text.replace(/^\uFEFF/,''));}catch(_){fail('Fichier JSON illisible.');}
    return validate(data,targetMode);
  }
  function merge(existing,incoming){
    if(!Array.isArray(existing)||!Array.isArray(incoming)||!incoming.length)fail('Profils à importer absents.');
    var result=existing.map(profile),added=0,duplicates=0;
    incoming.map(profile).forEach(function(p){
      var same=result.some(function(other){return keys.every(function(k){return other[k]===p[k];});});
      if(same){duplicates++;return;}
      if(result.some(function(other){return other.name.toLowerCase()===p.name.toLowerCase();}))fail('Un profil différent porte déjà le nom « '+p.name+' ». Renommez-le avant l’import.');
      result.push(p);added++;
    });
    if(result.length>8)fail('Maximum : 8 profils. Aucun profil ajouté.');
    return {profiles:result,added:added,duplicates:duplicates};
  }
  var api={maxBytes:maxBytes,encode:encode,decode:decode,merge:merge};
  if(typeof module==='object'&&module.exports)module.exports=api;else root.CNCProbeTransfer=api;
})(typeof window==='object'?window:this);
