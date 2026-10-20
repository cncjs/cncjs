(function(root){
  'use strict';
  var uiLocale=(typeof window!=='undefined'&&window.cncI18n)||{t:function(s){return s;}};
  // Plain-language help for Grbl 1.1 alarm and error codes (alarms 1-9 are the
  // same on Grbl_ESP32). Written for this interface; other codes get a generic line.
  var ALARMS={
    1:['Fin de course touchée','La position machine est perdue. Dégagez l’axe de la butée à la main ou au jog, déverrouillez ($X) puis refaites la prise d’origine ($H).'],
    2:['Limite logicielle dépassée','Le programme ou le déplacement sortait de la course de la machine ($130–$132). Vérifiez l’origine de travail et le programme, puis déverrouillez ($X).'],
    3:['Réinitialisation pendant un mouvement','Un arrêt ou une réinitialisation a coupé un déplacement : la position peut être fausse. Refaites la prise d’origine ($H) avant de reprendre.'],
    4:['Sonde déjà en contact au départ','Vérifiez la sonde, son câble et l’entrée sonde avant de recommencer le palpage.'],
    5:['Palpage sans contact','La sonde n’a rien touché sur la distance prévue. Rapprochez l’outil de la pièce ou augmentez la distance de recherche.'],
    6:['Prise d’origine interrompue','Une réinitialisation a arrêté la prise d’origine. Relancez-la ($H).'],
    7:['Prise d’origine interrompue : porte ouverte','Fermez la porte puis relancez la prise d’origine ($H).'],
    8:['Prise d’origine : capteur toujours appuyé','Le dégagement n’a pas libéré le capteur. Augmentez le dégagement ($27) ou vérifiez le câblage du capteur.'],
    9:['Prise d’origine : capteur non trouvé','Vérifiez le capteur et son câblage, le sens de recherche ($23) et la course ($130–$132).']
  };
  var ERRORS={
    1:['Ligne sans lettre de commande','Ligne mal formée dans le programme ou altérée pendant l’envoi.'],
    2:['Nombre mal écrit','Ligne mal formée ou altérée pendant l’envoi : vérifiez le fichier et la liaison.'],
    3:['Commande $ inconnue','Cette commande système n’existe pas sur cette carte.'],
    8:['Commande refusée hors repos','Cette commande $ n’est acceptée que machine au repos (Idle).'],
    9:['G-code bloqué par une alarme ou un jog','Déverrouillez ($X) ou attendez la fin du déplacement manuel.'],
    15:['Déplacement manuel hors course','La destination dépasse la course de la machine ($130–$132).'],
    20:['Commande non prise en charge','Grbl ne connaît pas cette commande : retirez-la ou changez le post-processeur.'],
    22:['Avance non définie','Ajoutez une avance F avant le premier G1, G2 ou G3.'],
    24:['Deux commandes de mouvement sur une ligne','Ligne mal formée ou deux lignes fusionnées pendant l’envoi : vérifiez le fichier et la liaison.'],
    25:['Mot répété sur une ligne','Une même lettre apparaît deux fois sur la ligne : corrigez le programme.'],
    26:['Mouvement sans coordonnées','Un G0, G1, G2 ou G3 sans X, Y ni Z : corrigez le programme.'],
    33:['Arc ou cible invalide','Vérifiez les arcs (rayon, centre I/J/K) produits par le post-processeur.']
  };
  function entry(table,code,kind){
    var n=typeof code==='number'&&isFinite(code)?code:null,row=n!==null&&Object.prototype.hasOwnProperty.call(table,n)?table[n]:null;
    var label=kind==='alarm'?(n===null?uiLocale.t('Alarme'):uiLocale.t('Alarme ')+n):uiLocale.t('Erreur ')+(n===null?'?':n);
    if(row)return {code:n,title:label+' : '+uiLocale.t(row[0]),action:uiLocale.t(row[1])};
    if(kind==='alarm'&&n===null)return {code:null,title:label,action:uiLocale.t('Code non reçu. Si la carte demande la prise d’origine ou le déverrouillage, faites $H (ou $X) ; sinon consultez CNCjs.')};
    return {code:n,title:label,action:uiLocale.t('Code propre à la carte : consultez sa documentation.')};
  }
  function text(help){return help.title+'. '+help.action;}
  var api={
    alarm:function(code){return entry(ALARMS,code,'alarm');},
    error:function(code){return entry(ERRORS,code,'error');},
    text:text,
    codes:{alarms:Object.keys(ALARMS).map(Number),errors:Object.keys(ERRORS).map(Number)},
    rows:function(){var out=[];[ALARMS,ERRORS].forEach(function(t){Object.keys(t).forEach(function(k){out.push(t[k][0],t[k][1]);});});return out;}
  };
  if(typeof module==='object'&&module.exports)module.exports=api;else root.CNCGrblHelp=api;
})(typeof window==='object'?window:this);
