(function (root) {
  'use strict';
  function create(initial) {
    var state = initial || {}, listeners = [];
    return {
      get: function () { return state; },
      set: function (patch) {
        var next = {}, changed = false;
        Object.keys(state).forEach(function (key) { next[key] = state[key]; });
        Object.keys(patch).forEach(function (key) { if (next[key] !== patch[key]) changed = true; next[key] = patch[key]; });
        if (!changed) return;
        state = next; listeners.slice().forEach(function (fn) { fn(state); });
      },
      subscribe: function (fn) {
        listeners.push(fn); fn(state);
        return function () { var i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); };
      }
    };
  }
  var prefix = root.location && root.location.pathname || '/touch/';
  prefix = prefix.indexOf('/touch/') >= 0 ? prefix.slice(0, prefix.indexOf('/touch/')) : '';
  root.cncState = create({machine:null, controllerId:null, transportConnected:false, transportReason:'Lecture du suivi…', apiBase:prefix + '/api'});
  root.CNCState = {create:create};
})(typeof window === 'undefined' ? globalThis : window);
