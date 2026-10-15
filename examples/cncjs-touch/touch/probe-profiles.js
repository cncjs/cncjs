(function(root){
  'use strict';
  var uiLocale=(typeof window!=='undefined'&&window.cncI18n)||{t:function(s){return s;},html:function(s){return s;}};
  var node=typeof module==='object'&&module.exports;
  var model=node?require('./probe-model'):root.CNCProbe,transfer=node?require('./probe-transfer'):root.CNCProbeTransfer;
  function clone(value){return JSON.parse(JSON.stringify(value));}
  function fail(message){throw Error(message);}
  function checkProfile(p){return transfer.decode(transfer.encode([p],'real'),'real')[0];}
  function checkIndex(state,index){if(typeof index!=='number'||Math.floor(index)!==index||index<0||index>=state.profiles.length)fail(uiLocale.t('Profil enregistré introuvable.'));}
  function unique(profiles,name){var n=1,candidate=name.slice(0,60);while(profiles.some(function(p){return p.name.toLowerCase()===candidate.toLowerCase();})){var suffix=' ('+(++n)+')';candidate=name.slice(0,60-suffix.length)+suffix;}return candidate;}
  function room(state){if(state.profiles.length>=8)fail(uiLocale.t('Maximum : 8 profils. Supprimez un profil pour libérer une place.'));}
  function save(state,index,profile,simulation){
    var next=clone(state),p=checkProfile(profile);
    if(index===-1&&simulation)room(next);else checkIndex(next,index);
    if(next.profiles.some(function(other,i){return i!==index&&other.name.toLowerCase()===p.name.toLowerCase();}))fail(uiLocale.t('Ce nom existe déjà. Choisissez un nom distinct.'));
    if(index===-1){next.selected=next.profiles.length;next.profiles.push(p);}else{next.profiles[index]=p;next.selected=index;}
    return next;
  }
  function create(state){var next=clone(state);room(next);var p=model.empty();p.name=unique(next.profiles,p.name);next.selected=next.profiles.length;next.profiles.push(p);return next;}
  function duplicate(state,index,simulation){
    var next=clone(state);room(next);
    if(index!==-1||!simulation)checkIndex(next,index);
    var p=checkProfile(index===-1?model.demo():next.profiles[index]);p.name=unique(next.profiles,uiLocale.t('Copie · ')+p.name);
    next.selected=next.profiles.length;next.profiles.push(p);return next;
  }
  function remove(state,index){
    var next=clone(state);checkIndex(next,index);
    if(next.profiles.length<=1)fail(uiLocale.t('Conservez au moins un profil enregistré.'));
    next.removed={profile:clone(next.profiles[index]),index:index};next.profiles.splice(index,1);
    next.selected=Math.min(index,next.profiles.length-1);return next;
  }
  function restore(state){
    var next=clone(state);room(next);if(!next.removed)fail(uiLocale.t('Aucun profil à restaurer.'));
    var p=checkProfile(next.removed.profile),index=next.removed.index;
    if(next.profiles.some(function(other){return other.name.toLowerCase()===p.name.toLowerCase();}))fail(uiLocale.t('Ce nom existe déjà. Renommez le profil actuel avant de restaurer.'));
    if(typeof index!=='number'||Math.floor(index)!==index||index<0)fail(uiLocale.t('Sauvegarde de suppression invalide.'));
    index=Math.min(index,next.profiles.length);next.profiles.splice(index,0,p);next.selected=index;next.removed=null;return next;
  }
  var api={create:create,duplicate:duplicate,save:save,remove:remove,restore:restore};
  if(node)module.exports=api;else root.CNCProbeProfiles=api;
})(typeof window==='object'?window:this);
