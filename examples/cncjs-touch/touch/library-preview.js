/* Preview only: this module never communicates with a controller. */
(function (root) {
  'use strict';
  var source = typeof document !== 'undefined' && document.currentScript && document.currentScript.src;
  var workerURL = source ? source.split(/[?#]/)[0].replace(/[^/]*$/, 'library-preview-worker.js?v=worker9') : 'library-preview-worker.js?v=worker9';
  var generation = 0;
  function scan(text, segment, cancelled, progress, yieldAfterLine) {
    return new Promise(function (resolve, reject) {
      var offset = 0, line = 0, x = 0, y = 0, absolute = true;
      // A relative (G91) move on an axis whose absolute position was never given starts
      // from wherever the tool is: the drawing still starts at 0, but its placement is unknown.
      var knownX = false, knownY = false, relativeStart = false;
      var unit = 1, motion = null, comment = false, ended = false, count = 0, arcAbsolute = false;
      var bounds = [Infinity, Infinity, -Infinity, -Infinity];
      // Progress trail: about a thousand samples of [sent line count, x, y],
      // taken every text.length/1000 characters. The line count follows the
      // CNCjs sender (non-empty lines), so a job's acknowledged line count maps
      // onto the trail at run time.
      var trail = [], sentLines = 0, nextSample = 0, sampleStep = Math.max(1, Math.floor(text.length / 1000));
      function sample() { trail.push(sentLines, Math.round(x * 1000) / 1000, Math.round(y * 1000) / 1000); }
      sample(); // the trail starts at the assumed origin, before any line
      function add(ax, ay, bx, by, mode) {
        if (ax === bx && ay === by) return;
        count++;
        bounds[0] = Math.min(bounds[0], ax, bx); bounds[1] = Math.min(bounds[1], ay, by);
        bounds[2] = Math.max(bounds[2], ax, bx); bounds[3] = Math.max(bounds[3], ay, by);
        if (segment) segment(ax, ay, bx, by, mode);
      }
      function arc(xx, yy, hasI, iWord, hasJ, jWord, radiusWord) {
        var clockwise = motion === 2, cx, cy, radius;
        if (radiusWord !== null) {
          if (hasI || hasJ) throw new Error('arc avec R et I/J simultanés');
          radius = Math.abs(radiusWord * unit);
          var dx = xx - x, dy = yy - y, chord = Math.sqrt(dx * dx + dy * dy);
          if (!chord || !radius || chord > 2 * radius + 0.000001) throw new Error('rayon R incompatible avec les extrémités');
          var height = Math.sqrt(Math.max(0, radius * radius - chord * chord / 4));
          var side = (clockwise ? -1 : 1) * (radiusWord < 0 ? -1 : 1);
          cx = (x + xx) / 2 - side * dy * height / chord;
          cy = (y + yy) / 2 + side * dx * height / chord;
        } else {
          if (!hasI && !hasJ) throw new Error('arc sans centre I/J ni rayon R');
          if (arcAbsolute && (!hasI || !hasJ)) throw new Error('centre absolu : I et J requis');
          cx = (hasI ? iWord : 0) * unit + (arcAbsolute ? 0 : x);
          cy = (hasJ ? jWord : 0) * unit + (arcAbsolute ? 0 : y);
          radius = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
          var endRadius = Math.sqrt((xx - cx) * (xx - cx) + (yy - cy) * (yy - cy));
          if (!radius || Math.abs(radius - endRadius) > Math.min(0.5, Math.max(0.005, radius * 0.001))) throw new Error('centre I/J incompatible avec les extrémités');
        }
        // Same decision as Grbl's mc_arc: the travel in (-pi, pi], then a full
        // turn added within 5e-7 rad, so an arc ending a hair short is a circle.
        var start = Math.atan2(y - cy, x - cx), tau = 2 * Math.PI;
        var r0 = x - cx, r1 = y - cy, t0 = xx - cx, t1 = yy - cy;
        var angle = Math.atan2(r0 * t1 - r1 * t0, r0 * t0 + r1 * t1);
        if (clockwise) { if (angle >= -5e-7) angle -= tau; }
        else if (angle <= 5e-7) angle += tau;
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
      // Per-line word state, reset by resetLine(). Kept outside read() so the
      // fast tokenizer and the regex fallback share one word() implementation.
      var nx, ny, axis, seenX, seenY, seenZ, seenI, seenJ, seenR, hasI, hasJ, iWord, jWord, radiusWord, finish, dwell, seenP;
      var groupMotion, groupDistance, groupArc, groupUnits;
      function resetLine() {
        nx = null; ny = null; axis = false; finish = false; radiusWord = null; dwell = false; seenP = false;
        seenX = seenY = seenZ = seenI = seenJ = seenR = hasI = hasJ = false; iWord = jWord = 0;
        groupMotion = groupDistance = groupArc = groupUnits = false;
      }
      function word(letter, v) {
        if (!isFinite(v)) throw new Error('valeur non finie');
        if (letter === 'G') {
          if (v === 0 || v === 1 || v === 2 || v === 3) { if (groupMotion) throw new Error('modes G contradictoires'); groupMotion = true; motion = v; }
          else if (v === 90 || v === 91) { if (groupDistance) throw new Error('modes G contradictoires'); groupDistance = true; absolute = v === 90; }
          // Grbl 1.1 accepts G91.1 only (G90.1 is refused with an error).
          else if (v === 91.1) { if (groupArc) throw new Error('modes G contradictoires'); groupArc = true; arcAbsolute = false; }
          else if (v === 20 || v === 21) { if (groupUnits) throw new Error('modes G contradictoires'); groupUnits = true; unit = v === 20 ? 25.4 : 1; }
          // G4 P… dwell (e.g. spindle spin-up after M3): no motion, the modal state is unchanged.
          else if (v === 4) dwell = true;
          else if (v !== 17 && v !== 40 && v !== 49 && v !== 54 && v !== 94) throw new Error('G' + v + ' non pris en charge par cet aperçu');
        } else if (letter === 'X') { if (seenX) throw new Error('axe répété'); seenX = true; axis = true; nx = v; }
        else if (letter === 'Y') { if (seenY) throw new Error('axe répété'); seenY = true; axis = true; ny = v; }
        else if (letter === 'Z') { if (seenZ) throw new Error('axe répété'); seenZ = true; axis = true; }
        else if (letter === 'I') { if (seenI) throw new Error('paramètre d’arc répété'); seenI = true; hasI = true; iWord = v; }
        else if (letter === 'J') { if (seenJ) throw new Error('paramètre d’arc répété'); seenJ = true; hasJ = true; jWord = v; }
        else if (letter === 'R') { if (seenR) throw new Error('paramètre d’arc répété'); seenR = true; radiusWord = v; }
        else if (letter === 'M') {
          if (v !== 0 && v !== 1 && v !== 2 && v !== 3 && v !== 4 && v !== 5 && v !== 6 && v !== 7 && v !== 8 && v !== 9 && v !== 30) throw new Error('M' + v + ' non pris en charge par cet aperçu');
          if (v === 2 || v === 30) finish = true;
        } else if (letter === 'P') { if (seenP) throw new Error('paramètre P répété'); seenP = true; }
        else if (letter !== 'N' && letter !== 'F' && letter !== 'S' && letter !== 'T') throw new Error('mot ' + letter + ' non pris en charge');
      }
      // Hand-written tokenizer for the common case: ASCII letters, each followed
      // by an optional space/tab run and a plain decimal number. Anything else
      // returns false, and the line is re-read by the regex path, which decides
      // exactly as before (modal words are idempotent, so no state leaks).
      function tokenize(clean) {
        var i = 0, n = clean.length, c, letter, start, digits, fraction;
        while (i < n) {
          c = clean.charCodeAt(i);
          if (c === 32 || c === 9) { i++; continue; }
          if (c >= 97 && c <= 122) c -= 32;
          if (c < 65 || c > 90) return false;
          letter = String.fromCharCode(c); i++;
          while (i < n && ((c = clean.charCodeAt(i)) === 32 || c === 9)) i++;
          start = i; c = clean.charCodeAt(i);
          if (c === 43 || c === 45) { i++; c = clean.charCodeAt(i); }
          digits = 0;
          while (c >= 48 && c <= 57) { i++; digits++; c = clean.charCodeAt(i); }
          if (c === 46) {
            i++; c = clean.charCodeAt(i); fraction = 0;
            while (c >= 48 && c <= 57) { i++; fraction++; c = clean.charCodeAt(i); }
            if (!digits && !fraction) return false;
          } else if (!digits) return false;
          word(letter, Number(clean.slice(start, i)));
        }
        return true;
      }
      function read(raw) {
        var clean;
        // CNCjs '%' directives (%wait, %X=..., even '% (note)') are refused by the
        // server's load: refuse them here too, rather than after the upload.
        if (!comment && /^[ \t]*%[ \t]*[^ \t\r\n]/.test(raw)) throw new Error('directive CNCjs % non acceptée par la bibliothèque');
        if (!comment && raw.indexOf('(') < 0 && raw.indexOf(';') < 0) clean = raw;
        else {
          clean = '';
          for (var i = 0; i < raw.length; i++) {
            var c = raw.charAt(i);
            if (comment) { if (c === ')') comment = false; else if (c === '(') throw new Error('commentaire imbriqué : CNCjs et l’aperçu ne liraient pas la même ligne'); }
            else if (c === ';') break;
            else if (c === '(') comment = true;
            else clean += c;
          }
        }
        // A comment left open at the end of the line would hide the next lines
        // from the preview while Grbl ends it there: refuse the file instead.
        if (comment) throw new Error('commentaire non fermé');
        clean = clean.trim();
        if (!clean || clean === '%') return;
        // The CNCjs sender sends every line, and Grbl keeps executing after M2/M30.
        if (ended) throw new Error('instructions après M2/M30 : Grbl les exécuterait, l’aperçu ne les montrerait pas');
        resetLine();
        if (!tokenize(clean)) {
          resetLine();
          var residue = clean.replace(/([A-Z])\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+))/gi, function (_, letter, n) {
            word(letter.toUpperCase(), Number(n));
            return '';
          });
          if (residue.trim()) throw new Error('syntaxe non prise en charge');
        }
        var hasArc = hasI || hasJ || radiusWord !== null;
        if (seenP && !dwell) throw new Error('mot P hors G4 non pris en charge');
        if (dwell && (!seenP || axis || hasArc)) throw new Error('G4 attend seulement P');
        if (hasArc && motion !== 2 && motion !== 3) throw new Error('paramètre d’arc hors mode G2/G3');
        if ((motion === 2 || motion === 3) && (axis || hasArc) && !seenX && !seenY) throw new Error('arc sans X ni Y (refusé par Grbl, erreur 26)');
        if (axis || hasArc) {
          if (motion === null) throw new Error('mode G0/G1 non défini');
          var xx = nx === null ? x : nx * unit + (absolute ? 0 : x);
          var yy = ny === null ? y : ny * unit + (absolute ? 0 : y);
          if (nx !== null) { if (absolute) knownX = true; else if (!knownX) relativeStart = true; }
          if (ny !== null) { if (absolute) knownY = true; else if (!knownY) relativeStart = true; }
          if (!isFinite(xx) || !isFinite(yy) || Math.abs(xx) > 1e9 || Math.abs(yy) > 1e9) throw new Error('coordonnées hors plage');
          if (motion === 2 || motion === 3) arc(xx, yy, hasI, iWord, hasJ, jWord, radiusWord);
          else add(x, y, xx, yy, motion);
          x = xx; y = yy;
        }
        if (finish) ended = true;
      }
      // Line ends are located with indexOf; each separator position is cached
      // so a file without one of them is not rescanned on every line.
      var nextLf = -1, nextCr = -1;
      function batch() {
        if (cancelled && cancelled()) { reject(new Error('Annulé')); return; }
        var deadline = Date.now() + 8;
        try {
          while (offset < text.length && Date.now() < deadline) {
            var start = offset;
            if (nextLf < start) { nextLf = text.indexOf('\n', start); if (nextLf < 0) nextLf = text.length; }
            if (nextCr < start) { nextCr = text.indexOf('\r', start); if (nextCr < 0) nextCr = text.length; }
            offset = nextLf < nextCr ? nextLf : nextCr;
            if (offset - start > 10001) throw new Error('ligne trop longue');
            var raw = text.slice(start, offset);
            line++; read(raw);
            if (raw.trim().length) sentLines++;
            if (offset >= nextSample) { sample(); nextSample += sampleStep; }
            // A lone CR ends a line for Grbl but not for the CNCjs sender (it splits on LF).
            if (text[offset] === '\r' && text[offset + 1] !== '\n') throw new Error('fin de ligne CR seule : CNCjs et Grbl ne compteraient pas les mêmes lignes');
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
          if (offset < text.length) { setTimeout(batch, 0); return; }
          if (comment) throw new Error('commentaire non fermé');
          sample();
          resolve({ count: count, bounds: bounds, trail: trail, lines: sentLines, relativeStart: relativeStart });
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
          projection: {version:1,width:960,height:540,bounds:result.bounds,units:'mm',wcs:'G54',relativeStart:!!result.relativeStart},
          trail: result.trail, lines: result.lines,
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
