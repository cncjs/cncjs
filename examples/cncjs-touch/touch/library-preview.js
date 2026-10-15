/* Preview only: this module never communicates with a controller. */
(function (root) {
  'use strict';
  var source = typeof document !== 'undefined' && document.currentScript && document.currentScript.src;
  var workerURL = source ? source.split(/[?#]/)[0].replace(/[^/]*$/, 'library-preview-worker.js?v=worker1') : 'library-preview-worker.js?v=worker1';
  var generation = 0;
  function scan(text, segment, cancelled, progress, yieldAfterLine) {
    return new Promise(function (resolve, reject) {
      var offset = 0, line = 0, x = 0, y = 0, absolute = true;
      var unit = 1, motion = null, comment = false, ended = false, count = 0, arcAbsolute = false;
      var bounds = [Infinity, Infinity, -Infinity, -Infinity];
      function add(ax, ay, bx, by, mode) {
        if (ax === bx && ay === by) return;
        count++;
        bounds[0] = Math.min(bounds[0], ax, bx); bounds[1] = Math.min(bounds[1], ay, by);
        bounds[2] = Math.max(bounds[2], ax, bx); bounds[3] = Math.max(bounds[3], ay, by);
        if (segment) segment(ax, ay, bx, by, mode);
      }
      function arc(xx, yy, ij, radiusWord) {
        var clockwise = motion === 2, cx, cy, radius;
        if (radiusWord !== null) {
          if (ij.I !== undefined || ij.J !== undefined) throw new Error('arc avec R et I/J simultanés');
          radius = Math.abs(radiusWord * unit);
          var dx = xx - x, dy = yy - y, chord = Math.sqrt(dx * dx + dy * dy);
          if (!chord || !radius || chord > 2 * radius + 0.000001) throw new Error('rayon R incompatible avec les extrémités');
          var height = Math.sqrt(Math.max(0, radius * radius - chord * chord / 4));
          var side = (clockwise ? -1 : 1) * (radiusWord < 0 ? -1 : 1);
          cx = (x + xx) / 2 - side * dy * height / chord;
          cy = (y + yy) / 2 + side * dx * height / chord;
        } else {
          if (ij.I === undefined && ij.J === undefined) throw new Error('arc sans centre I/J ni rayon R');
          if (arcAbsolute && (ij.I === undefined || ij.J === undefined)) throw new Error('centre absolu : I et J requis');
          cx = (ij.I || 0) * unit + (arcAbsolute ? 0 : x);
          cy = (ij.J || 0) * unit + (arcAbsolute ? 0 : y);
          radius = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
          var endRadius = Math.sqrt((xx - cx) * (xx - cx) + (yy - cy) * (yy - cy));
          if (!radius || Math.abs(radius - endRadius) > Math.min(0.5, Math.max(0.005, radius * 0.001))) throw new Error('centre I/J incompatible avec les extrémités');
        }
        var start = Math.atan2(y - cy, x - cx), end = Math.atan2(yy - cy, xx - cx), tau = 2 * Math.PI;
        var angle = end - start;
        if (clockwise) { while (angle >= 0) angle -= tau; }
        else { while (angle <= 0) angle += tau; }
        // Sagitta <= 0.02 mm and angular step <= 5 degrees.
        var step = Math.min(Math.PI / 36, 2 * Math.acos(Math.max(-1, Math.min(1, 1 - 0.02 / radius))));
        var parts = Math.ceil(Math.abs(angle) / step);
        if (!isFinite(parts) || parts > 8192) throw new Error('arc trop étendu pour cet aperçu');
        var px = x, py = y;
        for (var n = 1; n <= parts; n++) {
          var a = start + angle * n / parts;
          var qx = n === parts ? xx : cx + radius * Math.cos(a);
          var qy = n === parts ? yy : cy + radius * Math.sin(a);
          add(px, py, qx, qy, motion); px = qx; py = qy;
        }
      }
      function read(raw) {
        var clean = '';
        for (var i = 0; i < raw.length; i++) {
          var c = raw.charAt(i);
          if (comment) { if (c === ')') comment = false; }
          else if (c === ';') break;
          else if (c === '(') comment = true;
          else clean += c;
        }
        clean = clean.trim();
        if (!clean || clean === '%') return;
        var nx = null, ny = null, axis = false, seen = {}, groups = {}, finish = false, ij = {}, radiusWord = null;
        var residue = clean.replace(/([A-Z])\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+))/gi, function (_, letter, n) {
          letter = letter.toUpperCase();
          var v = Number(n), group;
          if (!isFinite(v)) throw new Error('valeur non finie');
          if (letter === 'G') {
            if (v === 0 || v === 1 || v === 2 || v === 3) { group = 'motion'; motion = v; }
            else if (v === 90 || v === 91) { group = 'distance'; absolute = v === 90; }
            else if (v === 90.1 || v === 91.1) { group = 'arc-distance'; arcAbsolute = v === 90.1; }
            else if (v === 20 || v === 21) { group = 'units'; unit = v === 20 ? 25.4 : 1; }
            else if ([17, 40, 49, 54, 94].indexOf(v) < 0) throw new Error('G' + v + ' non pris en charge par cet aperçu');
            if (group && groups[group]) throw new Error('modes G contradictoires');
            if (group) groups[group] = true;
          } else if (letter === 'X' || letter === 'Y' || letter === 'Z') {
            if (seen[letter]) throw new Error('axe répété');
            seen[letter] = true; axis = true;
            if (letter === 'X') nx = v;
            if (letter === 'Y') ny = v;
          } else if (letter === 'I' || letter === 'J' || letter === 'R') {
            if (seen[letter]) throw new Error('paramètre d’arc répété');
            seen[letter] = true;
            if (letter === 'R') radiusWord = v; else ij[letter] = v;
          } else if (letter === 'M') {
            if ([0, 1, 2, 3, 4, 5, 7, 8, 9, 30].indexOf(v) < 0) throw new Error('M' + v + ' non pris en charge par cet aperçu');
            if (v === 2 || v === 30) finish = true;
          } else if (['N', 'F', 'S', 'T'].indexOf(letter) < 0) throw new Error('mot ' + letter + ' non pris en charge');
          return '';
        });
        if (residue.trim()) throw new Error('syntaxe non prise en charge');
        var hasArc = ij.I !== undefined || ij.J !== undefined || radiusWord !== null;
        if (hasArc && motion !== 2 && motion !== 3) throw new Error('paramètre d’arc hors mode G2/G3');
        if (axis || hasArc) {
          if (motion === null) throw new Error('mode G0/G1 non défini');
          var xx = nx === null ? x : nx * unit + (absolute ? 0 : x);
          var yy = ny === null ? y : ny * unit + (absolute ? 0 : y);
          if (!isFinite(xx) || !isFinite(yy) || Math.abs(xx) > 1e9 || Math.abs(yy) > 1e9) throw new Error('coordonnées hors plage');
          if (motion === 2 || motion === 3) arc(xx, yy, ij, radiusWord);
          else add(x, y, xx, yy, motion);
          x = xx; y = yy;
        }
        ended = finish;
      }
      function batch() {
        if (cancelled && cancelled()) { reject(new Error('Annulé')); return; }
        var deadline = Date.now() + 8;
        try {
          while (offset < text.length && !ended && Date.now() < deadline) {
            var start = offset;
            while (offset < text.length && text[offset] !== '\n' && text[offset] !== '\r') {
              if (offset - start > 10000) throw new Error('ligne trop longue');
              offset++;
            }
            line++; read(text.slice(start, offset));
            if (text[offset++] === '\r' && text[offset] === '\n') offset++;
            // A worker waits for the renderer after a full block. At most one
            // line (8192 arc segments) can be produced before this boundary.
            var waiting = yieldAfterLine && yieldAfterLine();
            if (waiting) {
              if (progress) progress(Math.min(1, offset / (text.length || 1)));
              waiting.then(function () { setTimeout(batch, 0); }, reject);
              return;
            }
          }
          if (progress) progress(Math.min(1, offset / (text.length || 1)));
          if (offset < text.length && !ended) { setTimeout(batch, 0); return; }
          if (comment) throw new Error('commentaire non fermé');
          resolve({ count: count, bounds: bounds });
        } catch (error) { reject(new Error('Ligne ' + line + ' : ' + error.message)); }
      }
      setTimeout(batch, 0);
    });
  }
  function painter(canvas) {
    var ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas indisponible');
    canvas.width = 960; canvas.height = 540;
    var b, scale, ox, oy;
    return {
      setup: function (result) {
        if (!result.count) throw new Error('Aucun déplacement XY');
        b = result.bounds; var sx = b[2] - b[0], sy = b[3] - b[1];
        scale = Math.min(880 / (sx || 1), 440 / (sy || 1));
        ox = (960 - sx * scale) / 2; oy = (540 - sy * scale) / 2;
        ctx.fillStyle = '#101820'; ctx.fillRect(0, 0, 960, 540); ctx.lineWidth = 1;
      },
      segment: function (x, y, xx, yy, motion) {
        ctx.strokeStyle = motion === 0 ? '#657c8f' : '#55d6ed';
        ctx.beginPath(); ctx.moveTo(ox + (x - b[0]) * scale, 540 - oy - (y - b[1]) * scale);
        ctx.lineTo(ox + (xx - b[0]) * scale, 540 - oy - (yy - b[1]) * scale); ctx.stroke();
      }
    };
  }
  function render(text, canvas, cancelled, progress, responseBlob) {
    progress = progress || function () {};
    return new Promise(function (resolve, reject) {
      var id = ++generation, worker = null, timer = null, startup = null, drawing = null, reader = null;
      var finished = false, ready = false, fallback = false, output, result, input = 0, sequence = 0, drawn = 0, queue = [], localResume = null;
      var lastProgress = '';
      function report(message) { if (!finished && message !== lastProgress) { lastProgress = message; progress(message); } }
      function stopped() { return finished || !!(cancelled && cancelled()); }
      function cleanup() {
        clearInterval(timer); clearTimeout(startup); clearTimeout(drawing);
        if (worker) { worker.onmessage = worker.onerror = worker.onmessageerror = null; worker.terminate(); worker = null; }
        if (reader && reader.readyState === 1) reader.abort();
        reader = null; queue = [];
        if (localResume) { var resume = localResume; localResume = null; resume(); }
      }
      function finish(error, value) {
        if (finished) return; finished = true; cleanup();
        if (error) reject(error); else resolve(value);
      }
      function check() { if (stopped()) { finish(new Error('Annulé')); return false; } return true; }
      function encoded(image, synchronous) {
        if (!check()) return;
        finish(null, { image: image, segments: result.count, bounds: result.bounds,
          projection: {version:1,width:960,height:540,bounds:result.bounds,units:'mm',wcs:'G54'},
          note: 'Projection XY indicative — G1/G2/G3 bleu, G0 gris. Arcs XY interpolés à 0,02 mm. Départ supposé X0 Y0, mm, absolu et centres I/J relatifs. Z et puissance laser non simulés.' +
            (fallback ? ' Calcul local de secours : réactivité à vérifier sur cet appareil.' : '') +
            (synchronous ? ' Encodage PNG synchrone de secours.' : '') });
      }
      function encode() {
        if (!check()) return;
        report('Encodage de l’image PNG…');
        try {
          if (typeof canvas.toBlob === 'function' && typeof root.FileReader === 'function') {
            canvas.toBlob(function (blob) {
              if (!check()) return;
              if (!blob) { finish(new Error('Encodage PNG impossible')); return; }
              try {
                reader = new root.FileReader();
                reader.onload = function () { if (check()) encoded(String(reader.result || ''), false); };
                reader.onerror = function () { finish(new Error('Lecture de l’image PNG impossible')); };
                reader.readAsDataURL(blob);
              } catch (error) { finish(error); }
            }, 'image/png');
          } else {
            report('Encodage PNG local synchrone — réactivité non garantie…');
            drawing = setTimeout(function () {
              drawing = null; if (!check()) return;
              try { encoded(canvas.toDataURL('image/png'), true); } catch (error) { finish(error); }
            }, 0);
          }
        } catch (error) { finish(error); }
      }
      function local(reason) {
        if (!check()) return;
        if (worker) { worker.onmessage = worker.onerror = worker.onmessageerror = null; worker.terminate(); worker = null; }
        clearTimeout(startup); fallback = true;
        if (responseBlob) {
          // Never parse a large watch/file JSON response on the UI thread.
          // Small responses retain the compatible, explicitly limited fallback.
          if (responseBlob.size > 262144) { finish(new Error('Worker requis pour régénérer cet aperçu volumineux. Utilisez un navigateur compatible sur le PC.')); return; }
          if (typeof root.FileReader !== 'function') { finish(new Error('Lecture du fichier impossible sur ce navigateur')); return; }
          report(reason + ' — lecture locale limitée à 256 Kio, réactivité non garantie.');
          var blob = responseBlob; responseBlob = null;
          try {
            reader = new root.FileReader();
            reader.onload = function () {
              var raw = reader.result; reader = null;
              if (!check()) return;
              try {
                var value = JSON.parse(raw);
                if (!value || typeof value.data !== 'string') throw new Error('G-code absent');
                text = value.data;
              } catch (_) { finish(new Error('Réponse du serveur illisible.')); return; }
              local(reason);
            };
            reader.onerror = function () { finish(new Error('Lecture de la réponse du serveur impossible')); };
            reader.readAsText(blob, 'UTF-8');
          } catch (error) { finish(error); }
          return;
        }
        report(reason + ' — analyse locale découpée, réactivité non garantie.');
        scan(text, null, stopped, function (p) { report('Analyse locale du parcours : ' + Math.floor(p * 100) + ' %'); }).then(function (value) {
          if (!check()) return;
          result = value; output.setup(result);
          var data = new Float64Array(2048 * 5), used = 0;
          function flush() {
            if (!used) return;
            queue.push({ data: data.subarray(0, used), offset: 0 });
            data = new Float64Array(2048 * 5); used = 0;
            if (drawing === null) drawing = setTimeout(draw, 0);
          }
          function pressure() { return queue.length ? new Promise(function (resolve) { localResume = resolve; }) : null; }
          return scan(text, function (x, y, xx, yy, mode) {
            data[used++] = x; data[used++] = y; data[used++] = xx; data[used++] = yy; data[used++] = mode;
            if (used === data.length) flush();
          }, stopped, null, pressure).then(function () { flush(); return pressure(); }).then(encode);
        }).catch(function (error) { finish(error); });
      }
      function sendInput() {
        if (!check()) return;
        if (input === text.length) { worker.postMessage({ type: 'end', id: id }); return; }
        var end = Math.min(text.length, input + 32768), data = new Uint16Array(end - input);
        for (var i = 0; i < data.length; i++) data[i] = text.charCodeAt(input + i);
        var offset = input; input = end;
        worker.postMessage({ type: 'text', id: id, offset: offset, data: data.buffer }, [data.buffer]);
      }
      function draw() {
        drawing = null; if (!check()) return;
        try {
          var start = Date.now(), count = 0;
          while (queue.length && count < 1024 && Date.now() - start < 4) {
            var block = queue[0], a = block.data, j = block.offset;
            output.segment(a[j], a[j + 1], a[j + 2], a[j + 3], a[j + 4]);
            block.offset += 5; count++; drawn++;
            if (block.offset === a.length) {
              queue.shift();
              if (worker) worker.postMessage({ type: 'ack', id: id, sequence: block.sequence });
            }
          }
          report((fallback ? 'Dessin local' : 'Dessin') + ' du parcours : ' + Math.floor(drawn / result.count * 100) + ' %');
          if (queue.length) drawing = setTimeout(draw, 0);
          else if (localResume) { var resume = localResume; localResume = null; resume(); }
        } catch (error) { finish(error); }
      }
      try {
        output = painter(canvas);
        if (responseBlob) {
          if (typeof root.Blob !== 'function' || !(responseBlob instanceof root.Blob) || responseBlob.size > 6 * 20 * 1048576 + 65536) throw new Error('Réponse du serveur invalide ou trop volumineuse');
        } else if (typeof text !== 'string' || text.length > 20 * 1048576) throw new Error('G-code texte : 20 Mo maximum');
        if (!check()) return;
        timer = setInterval(check, 50);
        if (typeof root.Worker !== 'function') { local('Worker indisponible'); return; }
        try { worker = new root.Worker(workerURL); } catch (_) { local('Worker inaccessible'); return; }
        startup = setTimeout(function () { if (!ready) local('Worker sans réponse'); }, 5000);
        worker.onerror = function (event) {
          if (event && event.preventDefault) event.preventDefault();
          if (!ready) local('Worker inaccessible'); else finish(new Error('Calcul de l’aperçu interrompu dans le Worker'));
        };
        worker.onmessageerror = function () { finish(new Error('Réponse du Worker illisible')); };
        worker.onmessage = function (event) {
          if (!check()) return;
          var message = event.data || {};
          try {
            if (message.type === 'ready' && !ready) {
              if (message.version !== 1) { local('Version du Worker incompatible'); return; }
              if (responseBlob && !message.response) { local('Lecture du serveur indisponible dans le Worker'); return; }
              ready = true; clearTimeout(startup);
              report('Préparation du parcours hors interface…');
              if (responseBlob) {
                // Clone immutable Blob bytes without materializing either the
                // JSON envelope or the G-code string on the UI thread.
                worker.postMessage({ type: 'response', id: id, blob: responseBlob }); responseBlob = null; return;
              }
              worker.postMessage({ type: 'begin', id: id, length: text.length }); return;
            }
            if (!ready || message.id !== id) return;
            if (message.type === 'input') { if (message.offset !== input) throw new Error('Transfert du G-code désynchronisé'); sendInput(); }
            else if (message.type === 'progress') report('Analyse du parcours : ' + Math.floor(message.value * 100) + ' %');
            else if (message.type === 'bounds') { result = message.result; output.setup(result); }
            else if (message.type === 'segments') {
              if (!result || message.sequence !== sequence + 1 || !message.data || message.data.byteLength > 2048 * 5 * 8 || !message.data.byteLength || message.data.byteLength % 40 || queue.length >= 4) throw new Error('Bloc de parcours invalide');
              sequence = message.sequence; queue.push({ sequence: sequence, data: new Float64Array(message.data), offset: 0 });
              if (drawing === null) drawing = setTimeout(draw, 0);
            } else if (message.type === 'done') {
              if (!result || queue.length || drawn !== result.count) throw new Error('Parcours incomplet');
              worker.terminate(); worker = null; encode();
            } else if (message.type === 'error') finish(new Error(message.message || 'Aperçu indisponible'));
          } catch (error) { finish(error); }
        };
      } catch (error) { finish(error); }
    });
  }
  var api = { scan: scan, render: render,
    renderResponse: function (blob, canvas, cancelled, progress) { return render(null, canvas, cancelled, progress, blob); } };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CNCLibraryPreview = api;
})(typeof window !== 'undefined' ? window : this);
