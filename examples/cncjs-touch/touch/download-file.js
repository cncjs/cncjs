(function(root){
  'use strict';
  var pending=[];
  function release(item){
    if(item.released)return;
    item.released=true;
    if(item.timer!==null)clearTimeout(item.timer);
    var index=pending.indexOf(item);if(index>=0)pending.splice(index,1);
    try{item.urls.revokeObjectURL(item.url);}catch(_){}
  }
  function save(blob,name){
    var anchor=null,item=null;
    try{
      var nav=root.navigator||{};
      if(typeof nav.msSaveOrOpenBlob==='function'){
        if(nav.msSaveOrOpenBlob(blob,name)===false)throw Error('declined');
        return;
      }
      var urls=root.URL||root.webkitURL;
      if(!urls||typeof urls.createObjectURL!=='function'||typeof urls.revokeObjectURL!=='function')throw Error('unsupported');
      item={urls:urls,url:urls.createObjectURL(blob),timer:null,released:false};pending.push(item);
      anchor=document.createElement('a');anchor.href=item.url;anchor.download=name;
      document.body.appendChild(anchor);anchor.click();
      // Keep the URL alive for slow download startup; no repeating timer or network request.
      if(!item.released)item.timer=setTimeout(function(){release(item);},30000);
    }catch(error){
      if(item)release(item);
      var locale=root.cncI18n||{t:function(s){return s;}};
      throw Error(locale.t('Téléchargement indisponible dans ce navigateur.'));
    }finally{
      if(anchor&&anchor.parentNode)anchor.parentNode.removeChild(anchor);
    }
  }
  root.addEventListener('pagehide',function(){pending.slice().forEach(release);});
  root.CNCDownload={save:save};
})(window);
