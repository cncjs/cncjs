/* Réglages → Système: live figures about the computer running CNCjs (usage per
 * CPU core, temperatures, memory, battery, network, ten-minute history), in the spirit of KlipperScreen's
 * system panel. Read-only: one GET /api/touch-system every 2 s, and only while
 * this tab is shown on a visible page. Nothing is sent to the controller. */
(function () {
  'use strict';
  var uiLocale=window.cncI18n||{t:function(s){return s;},html:function(s){return s;},locale:'fr-FR'};
  var t=uiLocale.t;
  var panel=document.getElementById('screen-settings'),intro=panel&&panel.querySelector('.ks-panel-intro');
  if(!panel||!intro)return;
  var PERIOD=2000,TIMEOUT=5000;

  function el(tag,cls,text){var n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;}
  function set(n,value){if(n.textContent!==value)n.textContent=value;}
  function attr(n,name,value){if(n.getAttribute(name)!==value)n.setAttribute(name,value);}

  // Tabs: "Affichage" keeps every existing settings card, "Système" shows only this panel.
  var tabs=el('div','ks-settings-tabs');tabs.setAttribute('role','tablist');
  var tabDisplay=el('button','ks-settings-tab',t('Affichage')),tabSystem=el('button','ks-settings-tab',t('Système'));
  [tabDisplay,tabSystem].forEach(function(b,i){b.type='button';b.setAttribute('role','tab');b.setAttribute('data-tab',i?'system':'display');tabs.appendChild(b);});
  panel.insertBefore(tabs,intro.nextSibling||null);

  var section=el('div','card wide ks-system');section.id='ks-system';section.setAttribute('role','tabpanel');
  var head=el('div','ks-system-head'),title=el('h2','',t('Ordinateur du serveur CNCjs')),host=el('span','ks-readonly ks-system-host','');
  head.appendChild(title);head.appendChild(host);section.appendChild(head);
  var status=el('p','ks-system-status','');status.setAttribute('role','status');section.appendChild(status);

  var grid=el('div','ks-system-grid');section.appendChild(grid);
  // Per-core bars, built when the first sample says how many cores there are.
  var coresCard=el('div','ks-system-block ks-system-cores'),coresTitle=el('h3','',t('Processeur')),cpuTotal=el('b','ks-system-big','—');
  var coresHead=el('div','ks-system-row');coresHead.appendChild(coresTitle);coresHead.appendChild(cpuTotal);
  var coresList=el('div','ks-core-list'),model=el('p','ks-system-note','');
  coresCard.appendChild(coresHead);coresCard.appendChild(coresList);coresCard.appendChild(model);grid.appendChild(coresCard);
  var rows=[];

  function tile(label){
    var box=el('div','ks-system-block'),top=el('div','ks-system-row'),name=el('h3','',label),value=el('b','ks-system-big','—'),note=el('p','ks-system-note','');
    top.appendChild(name);top.appendChild(value);box.appendChild(top);box.appendChild(note);grid.appendChild(box);
    return {box:box,value:value,note:note};
  }
  var temp=tile(t('Température')),mem=tile(t('Mémoire')),load=tile(t('Charge moyenne')),power=tile(t('Alimentation'));
  // History: two sparklines (CPU and temperature) over the server's ten-minute buffer.
  var SVG='http://www.w3.org/2000/svg',historyBox=el('div','ks-system-block ks-system-history');
  var historyHead=el('div','ks-system-row');historyHead.appendChild(el('h3','',t('Historique · 10 min')));historyBox.appendChild(historyHead);
  function chart(label){
    var row=el('div','ks-history-row'),name=el('span','ks-history-name',label),svg=document.createElementNS(SVG,'svg'),line=document.createElementNS(SVG,'polyline'),range=el('span','ks-history-range','—');
    svg.setAttribute('viewBox','0 0 119 40');svg.setAttribute('preserveAspectRatio','none');svg.setAttribute('aria-hidden','true');svg.setAttribute('class','ks-history-chart');
    svg.appendChild(line);row.appendChild(name);row.appendChild(svg);row.appendChild(range);historyBox.appendChild(row);
    return {line:line,range:range};
  }
  var cpuChart=chart(t('Processeur')),tempChart=chart(t('Température'));
  var historyNote=el('p','ks-system-note','');historyBox.appendChild(historyNote);grid.appendChild(historyBox);
  var net=tile(t('Réseau')),server=tile(t('Serveur CNCjs'));
  var memBar=bar();mem.box.insertBefore(memBar.box,mem.note);
  var foot=el('p','ks-help',t('Mesures réelles de l’ordinateur qui exécute CNCjs, actualisées toutes les 2 s tant que cet onglet est affiché. Aucune commande n’est envoyée à la machine.'));
  section.appendChild(foot);
  panel.appendChild(section);

  function bar(){var box=el('div','ks-sys-bar'),fill=el('i','');box.appendChild(fill);return {box:box,fill:fill};}
  function level(p){return p>=90?'high':p>=70?'warm':'ok';}
  function paintBar(b,p){
    var v=Math.max(0,Math.min(100,p));
    // A transform repaints only the bar layer; width would re-layout the row.
    var tr='scaleX('+(v/100).toFixed(3)+')';if(b.fill.style.transform!==tr)b.fill.style.transform=tr;
    attr(b.box,'data-level',level(v));
  }
  function percent(v){return typeof v==='number'&&isFinite(v)?Math.round(v)+' %':'—';}
  function number(v,digits){try{return v.toLocaleString(uiLocale.locale,{minimumFractionDigits:digits,maximumFractionDigits:digits});}catch(_){return v.toFixed(digits);}}
  function bytes(v){if(!(v>=0))return '—';var mb=v/1048576;return mb>=1024?number(mb/1024,1)+' '+t('Go'):number(mb,0)+' '+t('Mo');}
  function duration(s){
    if(!(s>=0))return '—';var d=Math.floor(s/86400),h=Math.floor(s%86400/3600),m=Math.floor(s%3600/60);
    return d?d+' '+t('j')+' '+h+' h':h?h+' h '+m+' min':m+' min';
  }
  function finite(v){return typeof v==='number'&&isFinite(v);}

  function renderCores(cores){
    while(rows.length<cores.length){
      var row=el('div','ks-core'),label=el('span','ks-core-name',t('Cœur')+' '+(rows.length+1)),b=bar(),value=el('b','ks-core-value','—');
      row.appendChild(label);row.appendChild(b.box);row.appendChild(value);coresList.appendChild(row);rows.push({row:row,bar:b,value:value});
    }
    while(rows.length>cores.length)coresList.removeChild(rows.pop().row);
    attr(coresList,'data-columns',cores.length>8?'2':'1');
    cores.forEach(function(v,i){var r=rows[i];if(finite(v)){paintBar(r.bar,v);set(r.value,percent(v));}else{paintBar(r.bar,0);set(r.value,'—');}});
  }

  function plot(c,values,min,max,unit,digits){
    var points=[],seen=[],offset=120-values.length;
    values.forEach(function(v,i){if(!finite(v))return;seen.push(v);var y=40-(Math.max(min,Math.min(max,v))-min)/(max-min||1)*38-1;points.push((offset+i)+','+y.toFixed(1));});
    var p=points.join(' ');if(c.line.getAttribute('points')!==p)c.line.setAttribute('points',p);
    set(c.range,seen.length?number(Math.min.apply(null,seen),digits)+'–'+number(Math.max.apply(null,seen),digits)+' '+unit:'—');
  }
  function renderHistory(h){
    var cpu=h&&Array.isArray(h.cpu)?h.cpu.slice(-120):[],temps=h&&Array.isArray(h.temperature)?h.temperature.slice(-120):[];
    plot(cpuChart,cpu,0,100,'%',0);
    var known=temps.filter(finite),lo=known.length?Math.floor(Math.min.apply(null,known)/5)*5-5:20,hi=known.length?Math.ceil(Math.max.apply(null,known)/5)*5+5:80;
    plot(tempChart,temps,lo,hi,'°C',1);
    var minutes=h&&finite(h.interval)?Math.round(cpu.length*h.interval/60):0;
    set(historyNote,cpu.length?t('Relevé toutes les ')+(h.interval||5)+' s '+t('par le serveur, même onglet fermé')+(minutes<10?' · '+minutes+' min '+t('enregistrées'):''):t('Historique pas encore disponible.'));
  }
  function signalLabel(dbm){return dbm>=-55?t('excellent'):dbm>=-67?t('bon'):dbm>=-75?t('faible'):t('très faible');}
  function renderNetwork(n){
    n=n||{};var w=n.wifi,ips=Array.isArray(n.interfaces)?n.interfaces.filter(function(x){return x&&typeof x.address==='string';}):[];
    var addr=ips.map(function(x){return x.address+' ('+x.name+')';}).join(' · ');
    if(w&&finite(w.signalDbm)){
      set(net.value,w.signalDbm+' dBm');attr(net.box,'data-level',w.signalDbm>=-67?'ok':w.signalDbm>=-75?'warm':'high');
      set(net.note,[t('Wi‑Fi ')+signalLabel(w.signalDbm),w.ssid,finite(w.bitrateMbps)?Math.round(w.bitrateMbps)+' Mbit/s':'',addr].filter(Boolean).join(' · '));
    }else if(w){set(net.value,t('Déconnecté'));attr(net.box,'data-level','high');set(net.note,[t('Wi‑Fi ')+w.interface+t(' sans liaison'),addr].filter(Boolean).join(' · '));}
    else{set(net.value,ips.length?t('Connecté'):'—');attr(net.box,'data-level',ips.length?'ok':'none');set(net.note,addr||t('Aucune adresse réseau.'));}
  }

  var lastData=null;
  function render(data){
    lastData=data;
    var cores=Array.isArray(data.cores)?data.cores:[];
    renderCores(cores);
    set(cpuTotal,percent(data.cpu));
    set(model,(data.model?data.model+' · ':'')+cores.length+' '+t(cores.length>1?'cœurs':'cœur'));
    set(host,[data.hostname,data.platform,data.arch].filter(Boolean).join(' · '));

    var temps=Array.isArray(data.temperatures)?data.temperatures.filter(function(x){return x&&finite(x.celsius);}):[];
    var main=temps.filter(function(x){return /cpu/i.test(x.name);})[0]||temps.slice().sort(function(a,b){return b.celsius-a.celsius;})[0];
    set(temp.value,main?number(main.celsius,1)+' °C':'—');
    attr(temp.box,'data-level',main?(main.celsius>=80?'high':main.celsius>=65?'warm':'ok'):'none');
    set(temp.note,temps.length?temps.map(function(x){return x.name.replace(/-thermal$|_thermal$/,'')+' '+number(x.celsius,1)+' °C';}).join(' · '):t('Aucune sonde exposée par le système.'));

    var m=data.memory||{};
    if(finite(m.total)&&m.total>0&&finite(m.used)){var p=m.used/m.total*100;set(mem.value,percent(p));paintBar(memBar,p);set(mem.note,bytes(m.used)+' / '+bytes(m.total)+' · '+t('disponible')+' '+bytes(m.available));}
    else{set(mem.value,'—');paintBar(memBar,0);set(mem.note,'');}

    var l=Array.isArray(data.load)?data.load:[];
    set(load.value,finite(l[0])?number(l[0],2):'—');
    set(load.note,l.length===3&&l.every(finite)?t('1 min · 5 min · 15 min : ')+l.map(function(x){return number(x,2);}).join(' · ')+(cores.length?' · '+t('pleine charge : ')+cores.length:''):t('Non fournie par ce système.'));

    var pw=data.power||{},bat=pw.battery;
    var plug=pw.external===true?t('secteur branché'):pw.external===false?t('sur batterie'):'';
    if(bat&&finite(bat.capacity)){
      set(power.value,Math.round(bat.capacity)+' %');
      var state={Charging:t('en charge'),Discharging:t('décharge'),Full:t('pleine'),'Not charging':t('pas en charge')}[bat.status]||'';
      set(power.note,[state,plug].filter(Boolean).join(' · ')||t('Batterie'));
      attr(power.box,'data-level',bat.capacity<=15&&pw.external!==true?'high':bat.capacity<=30&&pw.external!==true?'warm':'ok');
    }else{set(power.value,plug?t('Secteur'):'—');set(power.note,plug||t('Aucune batterie exposée par le système.'));attr(power.box,'data-level','none');}

    renderNetwork(data.network);
    renderHistory(data.history);

    var s=data.server||{};
    set(server.value,bytes(s.rss));
    set(server.note,t('Mémoire du processus · actif depuis ')+duration(s.uptime)+' · '+t('système démarré depuis ')+duration(data.uptime));
  }

  // Polling, only while the system tab is on screen.
  var tab='display',timer=null,xhr=null,disposed=false,failures=0;
  function token(){try{return JSON.parse(localStorage.getItem('cnc')).state.session.token||'';}catch(_){return '';}}
  function apiBase(){try{return window.cncState.get().apiBase;}catch(_){return '/api';}}
  function shown(){return !disposed&&tab==='system'&&!document.hidden&&panel.classList.contains('active');}
  function stop(){clearTimeout(timer);timer=null;if(xhr){var x=xhr;xhr=null;x.abort();}}
  function schedule(delay){clearTimeout(timer);timer=null;if(shown()&&!xhr)timer=setTimeout(poll,delay);}
  function fail(message){failures++;set(status,message);attr(section,'data-stale','true');schedule(Math.min(PERIOD*Math.pow(2,failures),30000));}
  function poll(){
    timer=null;if(!shown()||xhr)return;
    var credential=token();
    if(!credential){fail(t('Session CNCjs requise : ouvrez CNCjs et connectez-vous.'));return;}
    var request=new XMLHttpRequest();xhr=request;
    request.open('GET',apiBase()+'/touch-system',true);request.timeout=TIMEOUT;
    request.setRequestHeader('Authorization','Bearer '+credential);
    request.onload=function(){
      if(xhr!==request)return;xhr=null;
      var data=null;try{data=JSON.parse(request.responseText);}catch(_){}
      if(request.status===200&&data&&typeof data==='object'){failures=0;render(data);set(status,'');attr(section,'data-stale','false');schedule(PERIOD);}
      else if(request.status===401||request.status===403)fail(t('Session CNCjs requise : ouvrez CNCjs et connectez-vous.'));
      else if(request.status===404)fail(t('Ce serveur CNCjs ne fournit pas les mesures système.'));
      else fail((data&&data.message)||t('Mesures système indisponibles.'));
    };
    request.onerror=request.ontimeout=function(){if(xhr!==request)return;xhr=null;fail(t('Serveur injoignable. Nouvel essai automatique.'));};
    request.send();
  }
  function select(name){
    tab=name;attr(panel,'data-settings-tab',name);
    attr(tabDisplay,'aria-selected',String(name==='display'));attr(tabSystem,'aria-selected',String(name==='system'));
    window.dispatchEvent(new CustomEvent('cnc-settings-tab',{detail:name}));
    if(name==='system'){if(!lastData)set(status,t('Lecture des mesures…'));if(!xhr){clearTimeout(timer);timer=null;poll();}}
    else stop();
    window.dispatchEvent(new Event('resize'));
  }
  function refresh(){if(shown()){if(!timer&&!xhr)poll();}else stop();}
  tabDisplay.addEventListener('click',function(){select('display');});
  tabSystem.addEventListener('click',function(){select('system');});
  window.addEventListener('cnc-screen-change',refresh);
  document.addEventListener('visibilitychange',refresh);
  window.addEventListener('pagehide',function(e){if(e&&e.persisted)return;disposed=true;stop();});
  select('display');
  window.cncSystemMonitor={select:select,state:function(){return {tab:tab,polling:!!(timer||xhr),failures:failures};}};
})();
