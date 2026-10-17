'use strict';
// Usage guide: four pages in two columns, the page buttons, the shortcuts of the
// troubleshooting page, the way back to the settings and the entry button.
// Synthetic DOM, no browser.
const fs=require('fs'),vm=require('vm'),assert=require('assert').strict;
function load(simulation){
  const byId={},navigations=[];
  function element(tag){
    const el={tagName:tag.toUpperCase(),children:[],attributes:{},listeners:{},textValue:'',
      get textContent(){return this.textValue+this.children.map(c=>c.textContent).join('');},
      set textContent(v){this.textValue=String(v);this.children=[];},
      set innerHTML(v){this.html=v;},
      appendChild(child){this.children.push(child);return child;},
      setAttribute(k,v){this.attributes[k]=String(v);},getAttribute(k){return k in this.attributes?this.attributes[k]:null;},
      addEventListener(n,f){(this.listeners[n]=this.listeners[n]||[]).push(f);},
      click(){(this.listeners.click||[]).forEach(f=>f.call(this));},
      querySelectorAll(selector){assert.equal(selector,'[data-guide-page]');return pageButtons;}};
    return el;
  }
  const pageButtons=[0,1,2,3].map(n=>{const b=element('button');b.attributes['data-guide-page']=String(n);return b;});
  ['guide-left','guide-right','guide-back'].forEach(id=>{byId[id]=element('div');});
  const main=element('main'),intro=element('div');
  const document={body:{getAttribute:k=>k==='data-simulation'?String(simulation):null},createElement:element,
    getElementById:id=>byId[id]||null,
    querySelector:s=>s==='main'?main:s==='#screen-settings .ks-panel-intro'?intro:null};
  const window={dispatchEvent:e=>navigations.push(e.detail)};
  vm.runInNewContext(fs.readFileSync(__dirname+'/touch/interface-guide.js','utf8'),{window,document,CustomEvent:function(type,o){assert.equal(type,'cnc-navigate');this.detail=o.detail;}});
  return {byId,pageButtons,main,intro,navigations};
}
const g=load(false),left=g.byId['guide-left'],right=g.byId['guide-right'];
assert.equal(g.main.children.length,1);assert.equal(g.main.children[0].id,'screen-guide');
assert.match(g.main.children[0].html,/interface réelle/);
// Page 0 is shown at once: a title then three paragraphs per column.
assert.deepEqual(left.children.map(c=>c.tagName),['H2','P','P','P']);
assert.equal(left.children[0].textContent,'Fichiers → Suivi');
assert.deepEqual(g.pageButtons.map(b=>b.getAttribute('aria-pressed')),['true','false','false','false']);
// Changing page replaces both columns and the pressed state.
g.pageButtons[2].click();
assert.equal(left.children[0].textContent,'Confort sur la Surface');assert.equal(right.children[0].textContent,'Préférences et navigation');
assert.deepEqual(g.pageButtons.map(b=>b.getAttribute('aria-pressed')),['false','false','true','false']);
// The troubleshooting page adds three shortcuts, once, even when pressed again.
g.pageButtons[3].click();g.pageButtons[3].click();
const shortcuts=[...left.children,...right.children].filter(c=>c.tagName==='BUTTON');
assert.equal(shortcuts.length,3);
shortcuts.forEach(b=>b.click());
assert.deepEqual([...g.navigations].sort(),['files','history','machine']);
assert.match(right.textContent,/Fraîcheur des données/,'real interface: no simulated alarm advice');
// Leaving that page removes its shortcuts.
g.pageButtons[0].click();assert.equal([...left.children,...right.children].filter(c=>c.tagName==='BUTTON').length,0);
// Way back to the settings, and the entry button placed in the settings intro.
g.navigations.length=0;g.byId['guide-back'].click();
assert.equal(g.intro.children.length,1);assert.equal(g.intro.children[0].id,'display-guide');g.intro.children[0].click();
assert.deepEqual(g.navigations,['settings','guide']);
// Simulation: mode label and the simulated alarm advice.
const s=load(true);assert.match(s.main.children[0].html,/simulation/);
s.pageButtons[3].click();assert.match(s.byId['guide-right'].textContent,/Alarme fictive/);
console.log('PASS interface guide: four pages, pressed state, shortcuts once on the troubleshooting page, navigation back and entry, real/simulation advice.');
