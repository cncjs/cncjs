(function (root) {
  'use strict';
  // XHR progress supports Authorization headers and older Chromium without ReadableStream.
  function create(options) {
    var xhr = null, generation = 0, disposed = false, available = false, retryAt = 0, healthAt = 0, lastMessage = 0, openedAt = 0;
    var token = options.token, clock = options.clock || Date.now, timer = options.timer || root;
    var XHR = options.XMLHttpRequest || root.XMLHttpRequest, base = options.apiBase || '/api';
    function close(reason, delay) {
      generation++; var old = xhr; xhr = null; lastMessage = 0;
      if (old) { old.onload = old.onerror = old.ontimeout = old.onprogress = null; old.abort(); }
      retryAt = clock() + (delay === undefined ? 30000 : delay);
      options.onDisconnect(reason);
    }
    function open() {
      if (disposed || xhr || !available || clock() < retryAt) return;
      var id = ++generation, cursor = 0, rotate = false, clockOffset = null;
      xhr = new XHR(); var request = xhr; openedAt = clock();
      request.open('GET', base+'/touch-events', true); request.timeout = 70000;
      request.setRequestHeader('Authorization','Bearer '+token());
      request.onprogress = function () {
        if (id !== generation || request.status !== 200) return;
        var data = request.responseText || '', end;
        if (data.length > 600000) { close('Flux trop volumineux.'); return; }
        while ((end = data.indexOf('\n', cursor)) >= 0) {
          var line = data.slice(cursor, end); cursor = end + 1;
          if (!line) continue;
          try {
            var packet = JSON.parse(line);
            if (packet.rotate === true) { rotate = true; continue; }
            if (packet.version !== 1 || !Array.isArray(packet.controllers) || typeof packet.epoch !== 'string' || typeof packet.transportId !== 'string' || typeof packet.sequence !== 'number' || typeof packet.sentAt !== 'number') throw Error('protocol');
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
        close(rotate ? 'Renouvellement du suivi…' : 'Flux interrompu. Secours toutes les 10 s.', rotate ? 0 : 30000);
        if (rotate) open();
      };
      request.onerror = request.ontimeout = function () { if (id === generation) close('Flux indisponible. Secours toutes les 10 s.'); };
      request.send();
    }
    var healthRequest = null;
    function health() {
      if (disposed || healthRequest || clock() < healthAt) return;
      healthAt = clock() + 60000;
      var request = healthRequest = new XHR();
      request.open('GET',base+'/custom/health',true); request.timeout=5000;
      request.setRequestHeader('Authorization','Bearer '+token());
      function fail(message) { healthRequest=null; available=false; options.onStatus(message); }
      request.onload=function(){
        if(disposed)return;
        healthRequest=null;
        try {
          var result=JSON.parse(request.responseText);
          if(request.status!==200 || result.loaded!==true || result.protocol!==1) throw Error('unavailable');
          available=true; options.onStatus(''); open();
        } catch (_) { fail(request.status===401||request.status===403?'Session CNCjs expirée.': 'Module de suivi absent ou incompatible. Secours toutes les 10 s ; actions bloquées si état ancien.'); }
      };
      request.onerror=request.ontimeout=function(){fail('Santé du suivi indisponible. Secours toutes les 10 s.');};
      request.send();
    }
    function tick() {
      if (disposed) return;
      if (xhr && clock() - (lastMessage || openedAt) >= 3000) close('Flux muet ou tamponné. État indisponible ; secours toutes les 10 s.');
      if (!available) health(); else open();
    }
    var interval=timer.setInterval(tick,1000); health();
    return {alive:function(){return !!lastMessage && clock()-lastMessage<3000;},
      reconnect:function(){close('Connexion interrompue. Nouvelle confirmation requise.',30000);},
      dispose:function(){disposed=true;timer.clearInterval(interval);close('Suivi fermé.');if(healthRequest){healthRequest.onload=healthRequest.onerror=healthRequest.ontimeout=null;healthRequest.abort();healthRequest=null;}}
    };
  }
  root.CNCJobStream = {create:create};
})(typeof window === 'undefined' ? globalThis : window);
