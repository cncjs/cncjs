(function (root) {
  'use strict';
  var uiLocale=(typeof window!=='undefined'&&window.cncI18n)||{t:function(s){return s;},html:function(s){return s;}};
  // Store only a small, explicit subset. Never retain a controller response or ticket.
  function clean(value, limit) { return typeof value === 'string' ? value.slice(0, limit) : ''; }
  function create(clock) {
    var events = [], sequence = 0, previous, connection, identity;
    clock = clock || Date.now;
    function add(kind, message, state) {
      var event = { id: ++sequence, time: new Date(clock()).toISOString(), kind: kind, message: message };
      if (state) { event.port = state.port; event.file = state.file; }
      events.unshift(event); if (events.length > 100) events.pop();
    }
    add('session', uiLocale.t('Journal ouvert sur cet appareil.'));
    return {
      connection: function (connected) {
        if (connection === connected) return false;
        connection = connected;
        add('connection', connected ? uiLocale.t('Connexion au serveur CNCjs établie.') : uiLocale.t('Connexion au serveur CNCjs indisponible.'));
        return true;
      },
      observe: function (machine) {
        var before = sequence;
        if (!machine || !machine.fresh) {
          if (previous !== null) add('availability', uiLocale.t('État du travail indisponible ou périmé.'));
          previous = null;
          return sequence !== before;
        }
        var next = {
          port: clean(machine.port, 96), file: clean(machine.originalName || machine.name, 256),
          name: clean(machine.name, 256), revision: clean(machine.revision, 96),
          state: clean(machine.activeState, 32), workflow: clean(machine.workflow, 32), loading: !!machine.loading
        };
        // Keep only the last fresh identity across observation gaps. A generation
        // change identifies a new CNCjs instance, not necessarily new hardware.
        var generation = clean(machine.generation, 128);
        var changed = identity && identity.port === next.port && identity.generation && generation && identity.generation !== generation;
        if (!previous || previous.port !== next.port || changed) {
          add('availability', changed ? uiLocale.t('Nouvelle instance du contrôleur observée sur le même port.') : uiLocale.t('Suivi du contrôleur disponible.'), next); previous = {};
        }
        identity = { port: next.port, generation: generation };
        if (previous.state !== next.state) add('state', uiLocale.t('État du contrôleur : ') + (next.state || uiLocale.t('non précisé')) + '.', next);
        if (next.loading && !previous.loading) add('file', uiLocale.t('Chargement du fichier en cours.'), next);
        if (!next.loading && (previous.loading || previous.name !== next.name || previous.revision !== next.revision)) {
          add('file', next.name ? uiLocale.t('Fichier chargé dans CNCjs.') : uiLocale.t('Aucun fichier chargé dans CNCjs.'), next);
        }
        if (previous.workflow !== next.workflow) {
          var label = { running: uiLocale.t('en cours'), paused: uiLocale.t('en pause'), idle: uiLocale.t('au repos') }[next.workflow] || next.workflow || uiLocale.t('non précisé');
          add('workflow', uiLocale.t('Travail : ') + label + ' (CNCjs).', next);
        }
        previous = next;
        return sequence !== before;
      },
      report: function () {
        return { version: 1, mode: 'interface-reelle', language: uiLocale.language || 'fr', exportedAt: new Date(clock()).toISOString(),
          note: uiLocale.t('Événements observés sur cet appareil, 100 maximum. Le rechargement de la page efface le journal. Un retour au repos ne certifie pas la fin des mouvements.'),
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
    return uiLocale.t('CNC TOUCH — Journal de l’interface réelle') + '\n' + uiLocale.t('Export : ') + report.exportedAt + '\n' + report.note + '\n\n' +
      report.events.map(function (e) { return e.time + ' — ' + e.message + (e.port ? uiLocale.t('\nContrôleur : ') + e.port : '') + (e.file ? uiLocale.t('\nFichier : ') + e.file : ''); }).join('\n\n');
  }
  root.cncSessionJournal = { create: create, text: text };
})(typeof window === 'undefined' ? globalThis : window);
