(function (root) {
  'use strict';
  function finiteNonnegative(value){return typeof value==='number'&&isFinite(value)&&value>=0;}
  function identity(value){return typeof value==='string'&&value.length>0;}
  // Shared by the streaming and fallback HTTP paths. Simulation has its own local schema.
  function validSnapshot(packet, streaming){
    if(!packet||typeof packet!=='object'||Array.isArray(packet)||packet.version!==1||
      !identity(packet.epoch)||!finiteNonnegative(packet.sequence)||packet.sequence<1||
      packet.sequence>9007199254740991||Math.floor(packet.sequence)!==packet.sequence||
      !finiteNonnegative(packet.sentAt)||!Array.isArray(packet.controllers)||
      (streaming&&!identity(packet.transportId)))return false;
    var ports=Object.create(null);
    return packet.controllers.every(function(c){
      if(!c||typeof c!=='object'||!identity(c.port)||ports[c.port]||c.controllerId!==c.port||
        !identity(c.generation)||typeof c.type!=='string'||typeof c.activeState!=='string'||
        typeof c.workflow!=='string'||typeof c.name!=='string'||typeof c.fresh!=='boolean')return false;
      ports[c.port]=true;
      if(!['canLoad','canStart','canResume','canPause','canStop'].every(function(key){return typeof c[key]==='boolean';}))return false;
      if(c.statusAgeMs!==null&&!finiteNonnegative(c.statusAgeMs))return false;
      if(c.statusObservedAt!==null&&!finiteNonnegative(c.statusObservedAt))return false;
      return !c.fresh||(c.statusAgeMs!==null&&c.statusObservedAt!==null);
    });
  }
  // XHR progress supports Authorization headers and older Chromium without ReadableStream.
  function create(options) {
    var locale=root.cncI18n||{t:function(s){return s;}}, offline=!!(root.navigator&&root.navigator.onLine===false);
    var offlineReason=locale.t('Réseau indisponible. Suivi suspendu ; aucune commande ne sera relancée automatiquement.');
    var xhr = null, generation = 0, disposed = false, available = false, retryAt = 0, healthAt = 0, lastMessage = 0, openedAt = 0;
    var token = options.token, clock = options.clock || Date.now, timer = options.timer || root;
    var XHR = options.XMLHttpRequest || root.XMLHttpRequest, base = options.apiBase || '/api';
    function close(reason, delay, rotating) {
      generation++; var old = xhr; xhr = null; lastMessage = 0;
      if (old) { old.onload = old.onerror = old.ontimeout = old.onprogress = null; old.abort(); }
      retryAt = clock() + (delay === undefined ? 30000 : delay);
      options.onDisconnect(locale.t(reason), !!rotating);
    }
    function open() {
      if (disposed || offline || xhr || !available || clock() < retryAt) return;
      var id = ++generation, cursor = 0, rotate = false, clockOffset = null, sequence = 0, epoch = '', transport = '';
      xhr = new XHR(); var request = xhr; openedAt = clock();
      request.open('GET', base+'/touch-events', true); request.timeout = 90000; // > server lifetime + confirmation grace (80 s)
      request.setRequestHeader('Authorization','Bearer '+token());
      request.onprogress = function () {
        if (id !== generation || request.status !== 200) return;
        var data = request.responseText || '', end;
        if (data.length > 1200000) { close('Flux trop volumineux.'); return; } // > server grace limit (1 MiB)
        while ((end = data.indexOf('\n', cursor)) >= 0) {
          var line = data.slice(cursor, end); cursor = end + 1;
          if (!line) continue;
          try {
            var packet = JSON.parse(line);
            if (packet&&packet.rotate === true&&Object.keys(packet).length===1&&!rotate) { rotate = true; continue; }
            if (rotate||!validSnapshot(packet,true)||packet.sequence<=sequence||
              (epoch&&(packet.epoch!==epoch||packet.transportId!==transport))) throw Error('protocol');
            sequence=packet.sequence;epoch=packet.epoch;transport=packet.transportId;
            // Conservative lower bound on clock skew: include the initial request's
            // server/network delay rather than treating buffered packets as fresh.
            if (clockOffset === null) clockOffset = openedAt - packet.sentAt;
            packet.transitMs = Math.max(0, clock() - packet.sentAt - clockOffset);
            lastMessage = clock(); options.onSnapshot(packet);
          } catch (_) { close('Réponse de suivi invalide.'); return; }
        }
      };
      request.onload = function () {
        if (id !== generation) return;
        request.onprogress();
        if (id !== generation) return;
        close(rotate ? 'Renouvellement du suivi…' : 'Flux interrompu. Secours toutes les 10 s.', rotate ? 0 : 30000, rotate);
        if (rotate) open();
      };
      request.onerror = request.ontimeout = function () { if (id === generation) close('Flux indisponible. Secours toutes les 10 s.'); };
      request.send();
    }
    var healthRequest = null;
    function cancelHealth(){var old=healthRequest;healthRequest=null;if(old){old.onload=old.onerror=old.ontimeout=null;old.abort();}}
    function health() {
      if (disposed || offline || healthRequest || clock() < healthAt) return;
      healthAt = clock() + 60000;
      var request = healthRequest = new XHR();
      request.open('GET',base+'/custom/health',true); request.timeout=5000;
      request.setRequestHeader('Authorization','Bearer '+token());
      function fail(message) { healthRequest=null; available=false; options.onStatus(locale.t(message)); }
      request.onload=function(){
        if(disposed||offline||healthRequest!==request)return;
        healthRequest=null;
        try {
          var result=JSON.parse(request.responseText);
          if(request.status!==200 || result.loaded!==true || result.protocol!==1) throw Error('unavailable');
          available=true; options.onStatus(''); open();
        } catch (_) { fail(request.status===401||request.status===403?'Session CNCjs expirée.': 'Module de suivi absent ou incompatible. Secours toutes les 10 s ; actions bloquées si état ancien.'); }
      };
      request.onerror=request.ontimeout=function(){if(!disposed&&!offline&&healthRequest===request)fail('Santé du suivi indisponible. Secours toutes les 10 s.');};
      request.send();
    }
    function tick() {
      if (disposed || offline) return;
      if (xhr && clock() - (lastMessage || openedAt) >= 3000) close('Flux muet ou tamponné. État indisponible ; secours toutes les 10 s.');
      if (!available) health(); else open();
    }
    function setOnline(value){
      if(disposed||offline===!value)return;
      offline=!value;available=false;cancelHealth();
      close(offline?offlineReason:locale.t('Réseau rétabli. Vérification du suivi ; nouvelle confirmation requise.'),0);
      if(!offline){healthAt=0;health();}
    }
    var interval=timer.setInterval(tick,1000); if(offline)options.onDisconnect(offlineReason);else health();
    return {alive:function(){return !offline&&!!lastMessage && clock()-lastMessage>=0&&clock()-lastMessage<3000;},
      setOnline:setOnline,
      reconnect:function(reason, immediate){
        if(disposed)return;
        close(offline?offlineReason:reason||'Connexion interrompue. Nouvelle confirmation requise.',immediate?0:30000);
        if(immediate){if(available)open();else{healthAt=0;health();}}
      },
      dispose:function(){if(disposed)return;disposed=true;timer.clearInterval(interval);close('Suivi fermé.');cancelHealth();}
    };
  }
  root.CNCJobStream = {create:create,validSnapshot:validSnapshot};
})(typeof window === 'undefined' ? globalThis : window);
