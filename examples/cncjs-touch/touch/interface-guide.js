(function(){
  'use strict';
  var simulation=document.body.getAttribute('data-simulation')==='true';
  var panel=document.createElement('section');panel.id='screen-guide';panel.className='screen';
  panel.innerHTML='<div class="card wide ks-panel-intro"><div><h2>Prendre en main CNCjs Touch</h2><p>Mode actuel : '+(simulation?'simulation':'interface réelle')+'</p></div><button type="button" class="ks-secondary" id="guide-back">Retour aux réglages</button></div>'+
    '<div class="wide ks-guide-tabs" role="group" aria-label="Rubriques du guide"><button type="button" data-guide-page="0">Utilisation</button><button type="button" data-guide-page="1">Modes et fonctions</button><button type="button" data-guide-page="2">Surface et veille</button></div><div class="card" id="guide-left"></div><div class="card" id="guide-right"></div>';
  document.querySelector('main').appendChild(panel);
  var pages=[[
    ['Fichiers → Suivi','1 · Ajoutez le G-code depuis le PC. La bibliothèque et les aperçus sont partagés avec la Surface.','2 · Sélectionnez un fichier pour voir son aperçu. Sélectionner ne signifie pas charger ou démarrer.','3 · Chargez la sélection, puis confirmez le démarrage quand le mode et l’état le permettent.'],
    ['Préparer → Fichiers → Suivi','Préparer ouvre Déplacer / Origine : axes, pas, zéros et accès direct au palpage. Ces trois étapes restent accessibles dans la barre latérale.','Suivi affiche l’image, le pourcentage, le temps restant et les commandes Pause, Reprendre et Arrêter.','Journal conserve les événements de cette page. Exportez-les avant de recharger pour garder une trace.']
  ],[
    ['Simulation','Aucune commande de déplacement, de laser ou de palpage n’est envoyée au contrôleur.','Les déplacements et origines sont fictifs. Le travail dure 60 secondes hors pauses, indépendamment du G-code.','Le palpage utilise un banc séparé avec des contacts fictifs. La bibliothèque et les fichiers ajoutés restent partagés sur le serveur.'],
    ['Interface réelle · état actuel','Fichiers : chargement et exécution raccordés à CNCjs. Démarrage et reprise nécessitent une confirmation.','Déplacements : essais à blanc. Zéros et palpage : lancement physique désactivé. Machine et Limites : lecture seule.','L’estimation du suivi est indicative. Toutes les lignes acquittées ne signifient pas que les mouvements sont terminés. L’arrêt logiciel ne remplace pas l’arrêt physique.']
  ],[
    ['Confort sur la Surface','Réglages propose la taille du texte, les coordonnées du suivi, le plein écran et la durée avant veille.','La veille est un écran noir logiciel : elle n’arrête pas le travail et ne coupe pas le rétroéclairage.','Le premier toucher réveille seulement l’écran. Touchez ensuite la commande voulue.'],
    ['Préférences et navigation','Le menu et les commandes restent dans la fenêtre. Les longues listes utilisent Précédent / Suivant.','Les préférences et profils de sonde sont propres à ce navigateur. Utilisez Sauvegarde / transfert dans Palpage pour copier les profils sur la Surface.','Les profils réels et simulés restent séparés. Après une mise à jour de l’interface, rechargez la page au repos pour afficher la nouvelle version.']
  ]];
  var current=-1;
  function show(index){if(index===current||!pages[index])return;current=index;
    ['guide-left','guide-right'].forEach(function(id,column){var host=document.getElementById(id);host.textContent='';pages[index][column].forEach(function(value,n){var el=document.createElement(n?'p':'h2');el.textContent=value;host.appendChild(el);});});
    panel.querySelectorAll('[data-guide-page]').forEach(function(b){b.setAttribute('aria-pressed',String(Number(b.getAttribute('data-guide-page'))===index));});
  }
  panel.querySelectorAll('[data-guide-page]').forEach(function(b){b.addEventListener('click',function(){show(Number(b.getAttribute('data-guide-page')));});});
  document.getElementById('guide-back').addEventListener('click',function(){window.dispatchEvent(new CustomEvent('cnc-navigate',{detail:'settings'}));});
  var entry=document.createElement('button');entry.type='button';entry.id='display-guide';entry.className='ks-secondary';entry.textContent='Guide d’utilisation';
  entry.addEventListener('click',function(){window.dispatchEvent(new CustomEvent('cnc-navigate',{detail:'guide'}));});
  document.querySelector('#screen-settings .ks-panel-intro').appendChild(entry);show(0);
})();
