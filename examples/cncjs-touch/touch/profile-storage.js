(function(root){
  'use strict';
  var locale=root.cncI18n||{t:function(s){return s;}};
  function open(storage,key){
    var expected=storage.getItem(key);
    return {
      read:function(){return expected;},
      write:function(state){
        // Optimistic conflict detection; do not overwrite changes already saved by another page.
        var encoded=JSON.stringify(state);
        if(storage.getItem(key)!==expected)throw Error(locale.t('Les profils ont changé dans un autre onglet. Conservez vos saisies avant de recharger la page au repos. Aucun écrasement effectué.'));
        storage.setItem(key,encoded);
        if(storage.getItem(key)!==encoded)throw Error(locale.t('La mémorisation des profils n’a pas pu être confirmée. Conservez cette page ouverte et exportez vos valeurs.'));
        expected=encoded;
      }
    };
  }
  var api={open:open};
  if(typeof module==='object'&&module.exports)module.exports=api;else root.CNCProfileStorage=api;
})(typeof window==='object'?window:this);
