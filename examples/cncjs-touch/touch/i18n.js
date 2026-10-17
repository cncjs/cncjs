(function () {
  'use strict';
  var key='cncjs-touch-language-v1', language='fr', messages=Object.create(null);
  try { var saved=localStorage.getItem(key); if(saved==='en'||saved==='es')language=saved; } catch (_) {}
  // Rows are found by their trimmed text: a phrase written with its outer
  // spaces (' tr/min', 'Confirmer : ') keeps the caller's spaces around it.
  (window.CNCTouchMessages||[]).forEach(function(row){messages[row[0].trim().replace(/\s+/g,' ')]=row;});
  function text(value) {
    if(typeof value!=='string'||language==='fr')return value;
    var parts=/^(\s*)([\s\S]*?)(\s*)$/.exec(value), row=messages[parts[2].replace(/\s+/g,' ')];
    return row?parts[1]+row[language==='en'?1:2].trim()+parts[3]:value;
  }
  function message(value){
    if(typeof value!=='string')return value;
    var prefix='SIMULATION — ';
    return value.indexOf(prefix)===0?text(prefix)+text(value.slice(prefix.length)):text(value);
  }
  function escape(value){return value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
  // Called only for developer-authored markup literals, never for uploaded files or profile names.
  function html(value) {
    if(language==='fr')return value;
    return value.replace(/\b(aria-label|title|alt|placeholder)="([^"]*)"/g,function(all,name,label){var translated=text(label);return translated===label?all:name+'="'+escape(translated)+'"';})
      .replace(/(^|>)([^<]*)(?=<|$)/g,function(all,prefix,label){var translated=text(label);return translated===label?all:prefix+escape(translated);});
  }
  // Translate the server's initial, static HTML once, before application scripts mount.
  // Dynamic views translate at their rendering source; there is no DOM translation observer.
  function staticText(node) {
    if(node.nodeType===3){var next=text(node.nodeValue);if(next!==node.nodeValue)node.nodeValue=next;return;}
    if(node.nodeType!==1||/^(SCRIPT|STYLE)$/.test(node.tagName))return;
    ['aria-label','title','alt','placeholder'].forEach(function(name){var value=node.getAttribute(name);if(value){var next=text(value);if(next!==value)node.setAttribute(name,next);}});
    if(/^(TEXTAREA|INPUT)$/.test(node.tagName))return;
    for(var child=node.firstChild;child;child=child.nextSibling)staticText(child);
  }
  function save(value){if(['fr','en','es'].indexOf(value)<0)return false;try{localStorage.setItem(key,value);return localStorage.getItem(key)===value;}catch(_){return false;}}
  window.cncI18n={t:text,message:message,html:html,language:language,locale:{fr:'fr-FR',en:'en-GB',es:'es-ES'}[language],save:save};
  document.documentElement.lang=language;
  document.title=text(document.title);
  if(document.body)staticText(document.body);
})();
