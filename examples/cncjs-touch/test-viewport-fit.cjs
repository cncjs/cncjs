const fs=require('fs'),vm=require('vm'),assert=require('assert');
for(const [width,height] of [[1366,768],[1280,720],[1024,600],[800,480],[600,900],[1920,1080]]){
 for(const shell of [false,true]){
 for(const content of [400,900,1500]){
  const style={},screen={style, get scrollWidth(){return Math.max(380,parseFloat(style.width)||width-16)},get scrollHeight(){return content*Math.min(1,(width-16)/(parseFloat(style.width)||width-16))+80;}};
  const main={style:{},scrollTop:135,scrollLeft:10,get clientWidth(){return width-(shell?88:0);},get clientHeight(){return height-70-(shell?0:48);},querySelector:()=>screen};
  const card={style:{},scrollHeight:700,scrollWidth:600};
  const elements={'tabbar':{style:{},getBoundingClientRect:()=>({height:48})},'simulation-banner':{getBoundingClientRect:()=>({bottom:70})},'job-dialog':{hidden:false,querySelector:()=>card}};
  const ctx={window:{innerHeight:height,innerWidth:width,addEventListener(){}},document:{body:{classList:{contains:()=>shell}},querySelector:()=>main,getElementById:id=>elements[id],documentElement:{style:{setProperty(){}}},addEventListener(){}},requestAnimationFrame:f=>f(),MutationObserver:function(){this.observe=()=>{};}};
  vm.runInNewContext(fs.readFileSync(__dirname+'/touch/viewport-fit.js','utf8'),ctx);
  const scale=Number(style.transform.match(/scale\(([^)]+)\)/)[1]);
  assert(screen.scrollHeight*scale<=main.clientHeight-(shell?32:16)+1);assert(screen.scrollWidth*scale<=main.clientWidth-(shell?32:16)+1);
  assert.equal(main.scrollTop,0);assert.equal(main.scrollLeft,0);
  const modalScale=Number(card.style.transform.match(/scale\(([^)]+)\)/)[1]);assert(card.scrollHeight*modalScale<=height-24+1);
 }
 }
}
console.log('PASS: fit bounds at 6 resolutions, 3 content heights, both navigation layouts, focus scroll reset and confirmation bounds. Synthetic layout test.');
