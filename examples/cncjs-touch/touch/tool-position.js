/* Adapted concept: cncjs-shopfloor-tablet toolpath-displayer.js (MIT).
 * A DOM marker replaces canvas patch restoration: the cached image is untouched.
 * See THIRD-PARTY-NOTICES.md for attribution. */
(function(root){
  'use strict';
  function project(meta,point){
    if(!meta||meta.version!==1||meta.width!==960||meta.height!==540||meta.units!=='mm'||meta.wcs!=='G54')return null;
    var b=meta.bounds;
    if(!Array.isArray(b)||b.length!==4||!b.every(function(v){return typeof v==='number'&&isFinite(v);})||b[2]<b[0]||b[3]<b[1])return null;
    if(!point||typeof point.x!=='number'||typeof point.y!=='number'||!isFinite(point.x)||!isFinite(point.y))return null;
    var sx=b[2]-b[0],sy=b[3]-b[1],scale=Math.min(880/(sx||1),440/(sy||1));
    var x=(960-sx*scale)/2+(point.x-b[0])*scale,y=540-(540-sy*scale)/2-(point.y-b[1])*scale;
    return x<0||x>960||y<0||y>540?null:{x:x/960,y:y/540};
  }
  // Number of trail samples ([sentLine, x, y, ...]) whose sent-line count is within `acknowledged`.
  function trailCount(samples,acknowledged){
    var lo=0,hi=samples.length/3;
    while(lo<hi){var mid=(lo+hi)>>1;if(samples[mid*3]<=acknowledged)lo=mid+1;else hi=mid;}
    return lo;
  }
  if(typeof module!=='undefined'&&module.exports){module.exports={project:project,trailCount:trailCount};return;}
  var img=document.getElementById('home-job-image');if(!img)return;
  var marker=document.createElement('span');marker.className='tool-position-marker';marker.hidden=true;marker.setAttribute('aria-hidden','true');img.parentNode.appendChild(marker);
  // Progress trail: the acknowledged part of the toolpath, drawn from the
  // samples stored with the preview, as one polyline over the image.
  var SVG='http://www.w3.org/2000/svg',trail=document.createElementNS(SVG,'svg'),trailLine=document.createElementNS(SVG,'polyline');
  trail.setAttribute('class','toolpath-progress');trail.setAttribute('viewBox','0 0 960 540');trail.setAttribute('aria-hidden','true');trail.setAttribute('preserveAspectRatio','none');
  trail.appendChild(trailLine);trail.hidden=true;img.parentNode.appendChild(trail);
  var drawnTrail={source:null,points:-1};
  var note=document.createElement('p');note.className='tool-position-note';note.id='tool-position-note';document.getElementById('home-job-note').insertAdjacentElement('afterend',note);
  var state=null,simulation=false,received=0,frame=null,expiry=null,disposed=false;
  function hide(message){marker.hidden=true;trail.hidden=true;if(note.textContent!==message)note.textContent=message;}
  function drawTrail(meta,s,box){
    var samples=meta.trail;
    if(!Array.isArray(samples)||samples.length<6||typeof s.total!=='number'||!(s.total>0)||typeof s.received!=='number'||!(s.received>=0)){trail.hidden=true;return;}
    // Simulation counts percent, real jobs count sender lines; both scale onto the trail's line count.
    var totalLines=samples[samples.length-3],acknowledged=Math.min(totalLines,Math.max(0,s.received/s.total*totalLines));
    var n=trailCount(samples,acknowledged);
    if(drawnTrail.source!==samples||drawnTrail.points!==n){
      var points=[];
      for(var i=0;i<n;i++){var p=project(meta.projection,{x:samples[i*3+1],y:samples[i*3+2]});if(p)points.push((p.x*960).toFixed(1)+','+(p.y*540).toFixed(1));}
      trailLine.setAttribute('points',points.join(' '));drawnTrail={source:samples,points:n};
    }
    var ratio=Math.min(box.width/960,box.height/540),width=960*ratio,height=540*ratio;
    trail.style.left=(box.left+(box.width-width)/2)+'px';trail.style.top=(box.top+(box.height-height)/2)+'px';
    trail.style.width=width+'px';trail.style.height=height+'px';
    trail.hidden=n<2;
  }
  function paint(){
    frame=null;if(disposed)return;
    var screen=document.getElementById('screen-home');
    if(document.hidden||!screen.classList.contains('active')){hide('');return;}
    var meta=img.cncPreview,s=state;
    if(!s||!s.fresh||Date.now()-received>2500||img.hidden||!meta||!s.name||meta.file!==s.name){hide('Position outil : données ou aperçu indisponibles.');return;}
    if(!meta.projection){hide('Position outil : régénérez cet ancien aperçu dans Fichiers.');return;}
    var point;
    if(simulation){
      if(s.wcs!=='G54'){hide('Position fictive : aperçu limité au repère G54.');return;}
      point=s.workPosition;
    }else{
      if(!s.operator||s.operator.reportUnits!=='mm'||s.operator.wcs!=='G54'){hide('Position outil : repère G54 et rapports en mm requis.');return;}
      var w=s.coordinates&&s.coordinates.wpos;
      if(!w||w.x===undefined||w.y===undefined){hide('Position outil inconnue.');return;}
      point={x:typeof w.x==='string'&&w.x.trim()!==''?Number(w.x):w.x,y:typeof w.y==='string'&&w.y.trim()!==''?Number(w.y):w.y};
    }
    var pixel=project(meta.projection,point);
    if(!pixel){hide('Position outil hors aperçu ou projection invalide.');return;}
    // Layout reads are batched in one animation frame, only on the visible view.
    var r=img.getBoundingClientRect(),parent=img.parentNode.getBoundingClientRect();
    // viewport-fit may scale the screen with a CSS transform: rects are screen pixels,
    // left/top/width styles are layout pixels, so divide by the current scale.
    var k=img.offsetWidth>0?r.width/img.offsetWidth:1;if(!(k>0))k=1;
    var box={left:(r.left-parent.left)/k,top:(r.top-parent.top)/k,width:r.width/k,height:r.height/k};
    var ratio=Math.min(box.width/960,box.height/540),width=960*ratio,height=540*ratio;
    if(!width||!height){hide('');return;}
    drawTrail(meta,s,box);
    marker.style.left=(box.left+(box.width-width)/2+pixel.x*width)+'px';
    marker.style.top=(box.top+(box.height-height)/2+pixel.y*height)+'px';marker.hidden=false;
    var label=simulation?'Point rose : position fictive G54. Le travail simulé ne déplace pas ce point.':'Point rose : position de travail rapportée, G54 · projection indicative.';
    if(!trail.hidden)label+=simulation?' Tracé orange : avancement fictif.':' Tracé orange : lignes acquittées, indicatif.';
    if(note.textContent!==label)note.textContent=label;
  }
  function schedule(){
    if(disposed)return;
    if(document.hidden||!document.getElementById('screen-home').classList.contains('active')){if(!marker.hidden)marker.hidden=true;return;}
    if(frame===null)frame=requestAnimationFrame(paint);
  }
  function expire(){clearTimeout(expiry);expiry=null;if(!document.hidden&&document.getElementById('screen-home').classList.contains('active'))expiry=setTimeout(schedule,2600);}
  root.addEventListener('cnc-job-status',function(e){state=e.detail.machine;simulation=!!e.detail.simulation;received=Date.now();schedule();expire();});
  root.addEventListener('cnc-screen-change',function(){schedule();expire();});
  root.addEventListener('resize',schedule);img.addEventListener('load',schedule);
  document.addEventListener('visibilitychange',function(){schedule();expire();});
  root.addEventListener('pagehide',function(e){if(e.persisted)return;disposed=true;if(frame!==null)cancelAnimationFrame(frame);clearTimeout(expiry);});
  schedule();
})(typeof window==='undefined'?globalThis:window);
