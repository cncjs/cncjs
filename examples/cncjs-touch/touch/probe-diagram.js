(function(root){
  'use strict';
  var uiLocale=(typeof window!=='undefined'&&window.cncI18n)||{t:function(s){return s;},html:function(s){return s;}};
  // Drawing coordinates are illustrative pixels, never machine positions or a trajectory.
  function describe(profile,operation,diameter){
    var p=profile||{},valid=['Z','X','Y','XYZ'].indexOf(operation)>=0;
    var x=valid&&operation.indexOf('X')>=0,y=valid&&operation.indexOf('Y')>=0,z=valid&&operation.indexOf('Z')>=0;
    var corner=['--','+-','-+','++'].indexOf(p.corner)>=0?p.corner:null;
    var cx=corner?(corner[0]==='-'?70:210):null,cy=corner?(corner[1]==='-'?125:50):null;
    function direction(v){return v===1?1:v===-1?-1:null;}
    function sign(v){return v===1?'+':v===-1?'−':' ?';}
    function number(v,min,max){return typeof v==='number'&&isFinite(v)&&v>=min&&v<=max?String(v).replace('.',',')+' mm':uiLocale.t('à renseigner');}
    var dx=direction(p.directionX),dy=direction(p.directionY);
    var cornerLabel=corner?'X'+(corner[0]==='-'?'−':'+')+' / Y'+(corner[1]==='-'?'−':'+'):uiLocale.t('Coin : à définir');
    return {corner:corner,cx:cx,cy:cy,cornerLabel:cornerLabel,
      edgeX:corner&&x?'M'+cx+' 50V125':'',edgeY:corner&&y?'M70 '+cy+'H210':'',
      arrowX:x&&dx?(dx===1?'M85 148H195L188 142M195 148L188 154':'M195 148H85L92 142M85 148L92 154'):'',
      arrowY:y&&dy?(dy===1?'M35 115V65L29 72M35 65L41 72':'M35 65V115L29 108M35 115L41 108'):'',
      labelX:x?uiLocale.t('Sens X')+sign(dx):'X non sélectionné',labelY:y?'Y'+sign(dy):'Y —',z:z,
      thickness:uiLocale.t('Épaisseur : ')+number(p.thickness,0.001,100),tool:uiLocale.t('Outil Ø : ')+number(diameter,0.01,100),
      description:uiLocale.t('Schéma de principe, sans échelle. ')+(corner?uiLocale.t('Coin '):'')+cornerLabel+'. '+(x?uiLocale.t('Recherche X')+sign(dx)+'. ':'')+(y?uiLocale.t('Recherche Y')+sign(dy)+'. ':'')+(z?uiLocale.t('Z vers le bas sur une plaque posée au-dessus. '):'')+uiLocale.t('Aucun trajet calculé.')};
  }
  function attach(host){
    host.innerHTML=uiLocale.html('<svg class="probe-diagram probe-config-diagram" viewBox="0 0 480 180" role="img">')+
      uiLocale.html('<text x="10" y="18">XY · vue de dessus</text><text x="270" y="18">Z · vue de côté</text>')+
      uiLocale.html('<path class="probe-piece" d="M70 50H210V125H70Z"/><text x="140" y="80" text-anchor="middle">Pièce</text><text data-part="corner-label" x="140" y="104" text-anchor="middle"></text>')+
      uiLocale.html('<path data-part="edge-x" class="probe-face"/><path data-part="edge-y" class="probe-face"/><circle data-part="corner" r="5" class="probe-corner"/>')+
      uiLocale.html('<path data-part="arrow-x" class="probe-direction"/><path data-part="arrow-y" class="probe-direction"/><text data-part="label-x" x="140" y="174" text-anchor="middle"></text><text data-part="label-y" x="35" y="40" text-anchor="middle"></text>')+
      uiLocale.html('<g data-part="z"><path class="probe-piece" d="M310 110H420V135H310Z"/><path class="probe-plate" d="M310 100H420V110H310Z"/><path d="M358 43V76H372V43"/><path class="probe-direction" d="M365 80V94L359 88M365 94L371 88"/><text x="405" y="87">Z−</text><text x="365" y="37" text-anchor="middle">Outil / pige</text></g>')+
      uiLocale.html('<text data-part="thickness" x="365" y="155" text-anchor="middle"></text><text data-part="tool" x="365" y="174" text-anchor="middle"></text></svg>');
    var svg=host.querySelector('svg'),last='';
    function part(name){return host.querySelector('[data-part="'+name+'"]');}
    return {update:function(p,operation,diameter){
      var data=describe(p,operation,diameter),key=JSON.stringify(data);if(key===last)return false;last=key;
      svg.setAttribute('aria-label',data.description);
      ['edgeX','edgeY','arrowX','arrowY'].forEach(function(k){part(k.replace(/([XY])/,'-$1').toLowerCase()).setAttribute('d',data[k]);});
      part('corner').setAttribute('visibility',data.corner?'visible':'hidden');
      part('corner').setAttribute('cx',data.cx===null?0:data.cx);part('corner').setAttribute('cy',data.cy===null?0:data.cy);
      part('z').setAttribute('opacity',data.z?'1':'0.35');
      [['corner-label','cornerLabel'],['label-x','labelX'],['label-y','labelY'],['thickness','thickness'],['tool','tool']].forEach(function(pair){part(pair[0]).textContent=data[pair[1]];});
      return true;
    }};
  }
  var api={describe:describe,attach:attach};
  if(typeof module==='object'&&module.exports)module.exports=api;else root.CNCProbeDiagram=api;
})(typeof window==='object'?window:this);

