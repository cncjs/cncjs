(function(root){
  'use strict';
  var uiLocale=(typeof window!=='undefined'&&window.cncI18n)||{t:function(s){return s;}};
  // Before a start: does the program's XY extent, placed at the current work
  // offset, stay inside the machine travel? Grbl's machine space after homing
  // is [-$13x, 0] per axis, or [0, $13x] when the axis homes the other way
  // ($23 bit). Only meaningful once homed ($22=1); Z is not in the 2D preview.
  function number(v){var n=typeof v==='string'?Number(v):v;return typeof n==='number'&&isFinite(n)?n:null;}
  function fmt(v){return (Math.round(v*10)/10).toFixed(1).replace('.',',');}
  function check(preview,machine){
    var p=preview&&preview.projection,b=p&&p.bounds,c=machine||{},s=c.settings||{},co=c.coordinates||{};
    function unknown(reason){return {state:'unknown',message:uiLocale.t('Course machine non vérifiée : ')+uiLocale.t(reason)};}
    if(!p||p.units!=='mm'||!Array.isArray(b)||b.length!==4||!b.every(function(v){return number(v)!==null;})||b[2]<b[0]||b[3]<b[1])return unknown('aperçu du fichier indisponible.');
    // A program that starts with relative (G91) moves runs from the tool's current place,
    // not from the work origin the extent is placed at.
    if(p.relativeStart)return unknown('programme en déplacements relatifs (G91) depuis la position de l’outil.');
    if(number(s.$22)!==1)return unknown('prise d’origine désactivée ($22), les coordonnées machine ne sont pas repérées.');
    if(c.operator&&c.operator.reportUnits&&c.operator.reportUnits!=='mm')return unknown('positions rapportées en pouces ($13=1).');
    var mask=number(s.$23)||0,axes=[],outside=[];
    for(var i=0;i<2;i++){
      var axis=i?'y':'x',travel=number(s['$'+(130+i)]),m=number(co.mpos&&co.mpos[axis]),w=number(co.wpos&&co.wpos[axis]);
      if(travel===null||travel<=0)return unknown('course $'+(130+i)+' inconnue.');
      if(m===null||w===null)return unknown('position machine inconnue.');
      var offset=m-w,min=b[i]+offset,max=b[i+2]+offset,low=(mask>>i)&1?0:-travel,high=low+travel;
      var entry={axis:axis.toUpperCase(),min:min,max:max,low:low,high:high};
      axes.push(entry);
      if(min<low-0.001||max>high+0.001)outside.push(entry);
    }
    if(outside.length)return {state:'outside',axes:axes,message:uiLocale.t('Hors course machine : ')+outside.map(function(a){
      return a.axis+' '+fmt(a.min)+' → '+fmt(a.max)+' mm ('+uiLocale.t('course ')+fmt(a.low)+' → '+fmt(a.high)+')';
    }).join(' ; ')+uiLocale.t('. Vérifiez l’origine de travail avant de démarrer.')};
    return {state:'ok',axes:axes,message:uiLocale.t('Dans la course machine en X et Y (Z non vérifié ; valable si la prise d’origine a été faite).')};
  }
  // Writes a result into the confirmation dialog; null hides the line.
  function show(node,result){
    if(!node)return;
    var hidden=!result,text=result?result.message:'',cls='job-travel'+(result?' '+result.state:'');
    if(node.hidden!==hidden)node.hidden=hidden;
    if(node.textContent!==text)node.textContent=text;
    if(node.className!==cls)node.className=cls;
  }
  var api={check:check,show:show};
  if(typeof module==='object'&&module.exports)module.exports=api;else root.CNCTravelCheck=api;
})(typeof window==='object'?window:this);
