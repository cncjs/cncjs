/* Prepare the existing CNCjs JSON upload without one large synchronous stringify. */
(function(root){
  'use strict';
  function encodeFile(file,text,cancelled,progress){
    cancelled=cancelled||function(){return false;};progress=progress||function(){};
    return new Promise(function(resolve,reject){
      if(typeof file!=='string'||typeof text!=='string'){reject(new Error('Fichier texte attendu.'));return;}
      var parts=['{"file":'+JSON.stringify(file)+',"data":"'],offset=0,lastProgress=-1;
      function tick(){
        try{
          if(cancelled())throw new Error('Annulé');
          var began=Date.now();
          do{
            var end=Math.min(text.length,offset+32768);
            // Keep a UTF-16 surrogate pair together across Blob boundaries.
            var last=text.charCodeAt(end-1),next=text.charCodeAt(end);
            if(end<text.length&&last>=0xD800&&last<=0xDBFF&&next>=0xDC00&&next<=0xDFFF)end++;
            var escaped=JSON.stringify(text.slice(offset,end));
            parts.push(new Blob([escaped.slice(1,-1)]));offset=end;
          }while(offset<text.length&&Date.now()-began<8);
          var percent=text.length?Math.floor(offset/text.length*100):100;
          if(percent!==lastProgress){lastProgress=percent;progress('Préparation de l’envoi : '+percent+' %');}
          if(cancelled())throw new Error('Annulé');
          if(offset<text.length){setTimeout(tick,0);return;}
          parts.push('"}');var blob=new Blob(parts,{type:'application/json'});
          parts=[];text='';resolve(blob);
        }catch(error){parts=[];text='';reject(error);}
      }
      // Even the first chunk leaves the input/cancel handler free to complete.
      setTimeout(tick,0);
    });
  }
  root.CNCLibraryPayload={encodeFile:encodeFile};
})(window);
