const fs=require('fs'),vm=require('vm'),assert=require('assert');
function fixture(simulation=false){
 const created=[],ids={},handlers={};
 function element(tag){const children=[],selectors={};const el={tag,children,textContent:'',className:'',appendChild(e){children.push(e);},querySelector(s){return selectors[s]||(selectors[s]=element('selector'));}};created.push(el);return el;}
 const main=element('main'),overview=element('aside');
 const socket={connected:true,on(n,f){handlers[n]=f;},emit(){throw Error('Limits must never send a controller command');}};
 const document={body:{getAttribute:()=>String(simulation)},createElement:element,querySelector:s=>s==='main'?main:overview,getElementById:id=>ids[id]||(ids[id]=element(id))};
 vm.runInNewContext(fs.readFileSync(__dirname+'/touch/machine-limits.js','utf8'),{document,window:{cncSocket:socket},Date});
 return {socket,handlers,source:ids['limits-source'],note:ids['limits-note'],values:created.filter(e=>e.tag==='td').map(e=>e.querySelector('b')),flags:main.children[0].querySelector('.ks-limit-protections').children.map(e=>e.querySelector('b'))};
}
const f=fixture();
const open=port=>f.handlers['serialport:open']({port,controllerType:'Grbl'});
const receive=settings=>f.handlers['controller:settings']('Grbl',{settings});
const sample={'$110':'5000','$111':'1234.5','$112':800,'$120':'100','$121':'100','$122':'50','$130':'600','$131':'600','$132':'100','$20':'0','$21':'1','$22':'1'};
const empty=()=>{assert(f.values.every(e=>e.textContent==='—'));assert(f.flags.every(e=>e.textContent==='Indisponible'));};
empty();receive(sample);empty(); // Settings without an identified connection are ignored.
open('/dev/a');receive(sample);
assert.equal(f.values[1].textContent,Number(1234.5).toLocaleString('fr-FR',{maximumFractionDigits:3}));
assert.deepEqual(f.flags.map(e=>e.textContent),['Désactivé','Activé','Activé']);assert.match(f.source.textContent,/12\/12/);
receive({'$110':'','\u0024111':'12bad','$112':null,'$120':false,'$121':-5,'$122':Infinity,'$130':0,'$20':2});empty();
receive(sample);f.handlers['serialport:close']({port:'/dev/other'});assert.match(f.source.textContent,/12\/12/);
f.handlers['serialport:close']({port:'/dev/a'});empty();receive(sample);empty();
open('/dev/a');receive(sample);open('/dev/b');empty();
receive(sample);f.handlers['serialport:list']([{port:'/dev/a',inuse:true}]);empty();
open('/dev/b');receive(sample);f.socket.connected=false;f.handlers.disconnect();receive(sample);empty();
f.socket.connected=true;open('/dev/b');receive(sample);f.handlers['controller:settings']('TinyG',{settings:sample});empty();
open('/dev/b');receive(sample);f.handlers['serialport:list']([]);empty();
const s=fixture(true);assert.equal(Object.keys(s.handlers).length,0);assert.match(s.source.textContent,/non simulées/);
console.log('PASS: Grbl limits mapping, units/format, invalid/missing values, port changes, disconnects and simulation isolation; zero emitted commands.');
