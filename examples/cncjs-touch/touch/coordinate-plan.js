/* CNCjs Touch: local calculations only; no controller transport. */
(function(root){
  'use strict';
  var uiLocale=(typeof window!=='undefined'&&window.cncI18n)||{t:function(s){return s;},html:function(s){return s;}};
  var frames=['G54','G55','G56','G57','G58','G59'];
  function number(value){
    if(typeof value==='string'){
      value=value.trim().replace(',','.');
      if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value))throw Error(uiLocale.t('Saisissez une valeur numérique, sans commande G-code.'));
      value=Number(value);
    }
    if(typeof value!=='number'||!isFinite(value)||Math.abs(value)>100000)throw Error(uiLocale.t('Valeur absente ou hors plage de calcul (±100 000 mm).'));
    return value;
  }
  function round(value){return Math.round(number(value)*1000000)/1000000;}
  function plan(state,body){
    if(!state||!body||['x','y','z'].indexOf(body.axis)<0||frames.indexOf(state.wcs)<0)throw Error(uiLocale.t('Axe ou repère inconnu.'));
    if(['goto','shift','set'].indexOf(body.operation)<0||['mm','in'].indexOf(body.unit)<0)throw Error(uiLocale.t('Opération ou unité invalide.'));
    var axis=body.axis,work=number(state.workPosition[axis]),machine=number(state.machinePosition[axis]);
    var value=round(number(body.value)*(body.unit==='in'?25.4:1));
    var target=body.operation==='shift'?round(work+value):value;
    var destination=body.operation==='set'?machine:round(machine+target-work);
    var feed=number(body.feed);
    if(feed<=0||feed>1500)throw Error(uiLocale.t('Vitesse de préparation : 1 à 1 500 mm/min.'));
    return {axis:axis,wcs:state.wcs,operation:body.operation,valueMm:value,targetWorkMm:target,
      targetMachineMm:destination,offsetMm:round(destination-target),feedMmMin:feed};
  }
  var api={number:number,round:round,plan:plan,frames:frames};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CNCCoordinates=api;
})(typeof window==='undefined'?globalThis:window);
