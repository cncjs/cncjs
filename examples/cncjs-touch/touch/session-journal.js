(function (root) {
  'use strict';
  // Store only a small, explicit subset. Never retain a controller response or ticket.
  function clean(value, limit) { return typeof value === 'string' ? value.slice(0, limit) : ''; }
  function create(clock) {
    var events = [], sequence = 0, previous, connection;
    clock = clock || Date.now;
    function add(kind, message, state) {
      var event = { id: ++sequence, time: new Date(clock()).toISOString(), kind: kind, message: message };
      if (state) { event.port = state.port; event.file = state.file; }
      events.unshift(event); if (events.length > 100) events.pop();
    }
    add('session', 'Journal ouvert sur cet appareil.');
    return {
      connection: function (connected) {
        if (connection === connected) return false;
        connection = connected;
        add('connection', connected ? 'Connexion au serveur CNCjs établie.' : 'Connexion au serveur CNCjs indisponible.');
        return true;
      },
      observe: function (machine) {
        var before = sequence;
        if (!machine || !machine.fresh) {
          if (previous !== null) add('availability', 'État du travail indisponible ou périmé.');
          previous = null;
          return sequence !== before;
        }
        var next = {
          port: clean(machine.port, 96), file: clean(machine.originalName || machine.name, 256),
          name: clean(machine.name, 256), revision: clean(machine.revision, 96),
          state: clean(machine.activeState, 32), workflow: clean(machine.workflow, 32), loading: !!machine.loading
        };
        if (!previous || previous.port !== next.port) {
          add('availability', 'Suivi du contrôleur disponible.', next); previous = {};
        }
        if (previous.state !== next.state) add('state', 'État du contrôleur : ' + (next.state || 'non précisé') + '.', next);
        if (next.loading && !previous.loading) add('file', 'Chargement du fichier en cours.', next);
        if (!next.loading && (previous.loading || previous.name !== next.name || previous.revision !== next.revision)) {
          add('file', next.name ? 'Fichier chargé dans CNCjs.' : 'Aucun fichier chargé dans CNCjs.', next);
        }
        if (previous.workflow !== next.workflow) {
          var label = { running: 'en cours', paused: 'en pause', idle: 'au repos' }[next.workflow] || next.workflow || 'non précisé';
          add('workflow', 'Travail : ' + label + ' (CNCjs).', next);
        }
        previous = next;
        return sequence !== before;
      },
      report: function () {
        return { version: 1, mode: 'interface-reelle', exportedAt: new Date(clock()).toISOString(),
          note: 'Événements observés sur cet appareil, 100 maximum. Le rechargement de la page efface le journal. Un retour au repos ne certifie pas la fin des mouvements.',
          events: events.map(function (event) {
            var copy = { id: event.id, time: event.time, kind: event.kind, message: event.message };
            if (event.port) copy.port = event.port;
            if (event.file) copy.file = event.file;
            return copy;
          }) };
      }
    };
  }
  function text(report) {
    return 'CNCjs TOUCH — Journal de l’interface réelle\nExport : ' + report.exportedAt + '\n' + report.note + '\n\n' +
      report.events.map(function (e) { return e.time + ' — ' + e.message + (e.port ? '\nContrôleur : ' + e.port : '') + (e.file ? '\nFichier : ' + e.file : ''); }).join('\n\n');
  }
  root.cncSessionJournal = { create: create, text: text };
})(typeof window === 'undefined' ? globalThis : window);
