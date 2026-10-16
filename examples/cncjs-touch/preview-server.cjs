// Local visual fixture only. No connection to CNCjs or the controller.
const http=require('http'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'touch');
const idleFixture=process.argv.includes('--idle-fixture');
// The job service is an ES module in src/server; Node.js 22.12 or newer can require() it directly.
const {EventEmitter}=require('node:events'),{createService}=require('../../src/server/services/touch/job-service.js');
const systemStats=require('../../src/server/services/touch/system-stats.js').createSystemStats();systemStats.start();
const mock={type:'Grbl',options:{port:'/dev/fixture'},ready:true,isClose:()=>false,
 runner:new EventEmitter(),sender:new EventEmitter(),workflow:{state:'idle'},
 state:{status:{activeState:idleFixture?'Idle':'Alarm'}},feeder:{toJSON:()=>({queue:0,pending:false})},
 settings:{settings:{$110:5000,$111:5000,$112:800}},command:()=>{throw Error('Physical command forbidden');}};
mock.sender.state={name:'',context:{},total:0};mock.sender.toJSON=()=>({...mock.sender.state});
mock.runner.state=mock.state;
const service=createService({get:()=>({'/dev/fixture':mock})},{get:()=>[]});
service.list();setInterval(()=>{
 let raw='<Idle|MPos:0,0,0>';
 if(process.argv.includes('--probe-fixture')){
  const source=JSON.parse(fs.readFileSync(path.join(__dirname,'probe-fixture.json'),'utf8'));
  if(source.paused)return;
  raw=source.raw;
 }
 mock.runner.emit('status',{raw});
},300);
const fixture=`
localStorage.setItem('cnc',JSON.stringify({state:{session:{token:'local-visual-fixture'}}}));
var sample='G21 G90 G17\\nG0 X10 Y10\\nG1 X90 Y10 F500\\nG1 X90 Y90\\nG1 X10 Y90\\nG1 X10 Y10\\nG0 X70 Y50\\nG2 X70 Y50 I-20 J0';
var visualPreview=CNCLibraryPreview.render(sample,document.createElement('canvas'),function(){},function(){return false;});
var fixtureFiles=Array.from({length:5},function(_,i){return {name:'Parcours_de_test_'+(i+1)+'.gcode',type:'f',size:238000,mtime:'2026-10-14T08:00:00Z'};});
window.XMLHttpRequest=function(){this.open=function(method,url){this.method=method;this.url=url;};this.setRequestHeader=function(){};this.send=function(body){var xhr=this;visualPreview.then(function(preview){var data;if(xhr.url==='/api/touch-job'&&xhr.method==='GET')data={controllers:[{port:'/dev/fixture',controllerType:'Grbl',activeState:'Alarm',fresh:true,workflow:'idle',name:'',canLoad:false,canStart:false,canPause:false,canResume:false,canStop:false}]};else if(xhr.url==='/api/commands'&&xhr.method==='GET')data={records:[{id:'fixture-update',title:'Mettre à jour l’interface (fictif)',enabled:true},{id:'fixture-reboot',title:'Redémarrer la tablette (fictif)',enabled:true}]};else if(xhr.url.indexOf('/api/commands/run/')===0)data={taskId:'fixture'};else if(xhr.url==='/api/touch-backlight')data={available:true,writable:true,device:'fixture',percent:xhr.method==='POST'?JSON.parse(body).percent:60,minPercent:5};else if(xhr.url==='/api/watch/status')data={configured:true};else if(xhr.url==='/api/watch/files')data={files:fixtureFiles};else if(xhr.url==='/api/watch/file'){var file=JSON.parse(body).file.replace(/\\.cnctouch\\.json$/,'');data={data:JSON.stringify({version:1,file:file,originalName:file,preview:preview})};}else{throw Error('Unexpected request in visual fixture: '+xhr.url);}xhr.status=200;xhr.responseText=JSON.stringify(data);xhr.onload();});};};
`;
http.createServer((req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1');
 if(url.pathname==='/api/touch-system'&&req.method==='GET'){res.setHeader('Content-Type','application/json');return res.end(JSON.stringify(systemStats.read()));}
 if(url.pathname==='/api/touch-job'&&req.method==='GET'){res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({controllers:service.list()}));}
 if(url.pathname==='/api/touch-motion/preview'&&req.method==='POST'){
  let body='';req.on('data',chunk=>body+=chunk);req.on('end',()=>{
   res.setHeader('Content-Type','application/json');
   try{res.end(JSON.stringify(service.previewMotion(JSON.parse(body))));}
   catch(e){res.statusCode=409;res.end(JSON.stringify({message:e.message}));}
  });return;
 }
 if(url.pathname==='/visual-fixture.js'){res.setHeader('Content-Type','text/javascript');
  const native=`var NativeXHR=window.XMLHttpRequest;`;
  const proxy=`this.send=function(body){var xhr=this;if(xhr.url==='/api/touch-motion/preview'||xhr.url==='/api/touch-system'||(xhr.url==='/api/touch-job'&&xhr.method==='GET')){var actual=new NativeXHR();actual.open(xhr.method,xhr.url,true);actual.setRequestHeader('Content-Type','application/json');actual.timeout=xhr.timeout;actual.onload=function(){xhr.status=actual.status;xhr.responseText=actual.responseText;xhr.onload();};actual.onerror=function(){if(xhr.onerror)xhr.onerror();};actual.ontimeout=function(){if(xhr.ontimeout)xhr.ontimeout();};xhr.abort=function(){actual.abort();};actual.send(body);return;}visualPreview`;
  return res.end(native+fixture.replace('this.send=function(body){var xhr=this;visualPreview',proxy));}
 if(url.pathname==='/connection-fixture.js'){res.setHeader('Content-Type','text/javascript');return res.end(`localStorage.setItem('cnc',JSON.stringify({state:{session:{token:'local-visual-fixture'}}}));window.io={connect:function(){var handlers={};var sock={connected:true,on:function(n,f){(handlers[n]||(handlers[n]=[])).push(f);},emit:function(n){if(n!=='list'&&n!=='open')throw Error('Machine command forbidden in visual fixture');if(n==='open')setTimeout(function(){(handlers['serialport:open']||[]).forEach(function(f){f({port:'/dev/fixture',controllerType:'Grbl'});});(handlers['controller:settings']||[]).forEach(function(f){f('Grbl',{settings:Object.fromEntries([[110,5000],[111,5000],[112,800],[120,100],[121,100],[122,50],[130,600],[131,600],[132,100],[20,1],[21,1],[22,1]].map(function(p){return ['$'+p[0],String(p[1])];}))});});},0);if(n==='list')setTimeout(function(){(handlers['serialport:list']||[]).forEach(function(f){f([{inuse:true,port:'/dev/fixture'}]);});(handlers['controller:state']||[]).forEach(function(f){f('Grbl',{status:{activeState:'${idleFixture ? 'Idle' : 'Alarm'}',wpos:{x:-600,y:-600,z:0},mpos:{x:-600,y:-600,z:0}}});});},0);}};setTimeout(function(){(handlers.connect||[]).forEach(function(f){f();});},0);return sock;}};`);}
 const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.statusCode=404;return res.end();}
 let data=fs.readFileSync(file);
 if(file.endsWith('index.html'))data=data.toString().replace('/socket.io/socket.io.js','/connection-fixture.js');
 if(file.endsWith('simulation.html')||file.endsWith('index.html'))data=data.toString().replace('<script defer src="shared-library.js','<script defer src="/visual-fixture.js"></script><script defer src="shared-library.js');
 if((file.endsWith('simulation.html')||file.endsWith('index.html'))&&url.searchParams.get('profile-storage')==='blocked')data=data.toString().replace('<script src="probe-model.js','<script>var originalProfileSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k.indexOf("cnc-touch-probes-")===0)throw Error("Fixture: stockage indisponible");return originalProfileSet.call(this,k,v);};</script><script src="probe-model.js');
 if(file.endsWith('.html')&&url.searchParams.get('startup-fault')==='missing-shell')data=data.toString().replace(/src="touch-shell\.js[^\"]*"/,'src="missing-shell.js"');
 res.setHeader('Content-Type',file.endsWith('.css')?'text/css':file.endsWith('.js')?'text/javascript':'text/html');res.end(data);
}).listen(0,'127.0.0.1',function(){console.log('Local visual fixture: http://127.0.0.1:'+this.address().port+'/simulation.html');});
