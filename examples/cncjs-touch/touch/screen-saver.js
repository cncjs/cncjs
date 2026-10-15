(function () {
  'use strict';
  var uiLocale=window.cncI18n||{t:function(s){return s;},html:function(s){return s;}};
  var overlay = document.createElement('button');
  overlay.id = 'touch-screen-saver'; overlay.type = 'button'; overlay.hidden = true;
  overlay.setAttribute('aria-label', uiLocale.t('Réveiller l’écran'));
  overlay.textContent = uiLocale.t('Écran en veille · Touchez pour réveiller');
  document.body.appendChild(overlay);
  function elapsedClock(){return window.performance&&typeof window.performance.now==='function'?window.performance.now():Date.now();}
  var minutes = 0, lastActivity = elapsedClock(), timer = null, wakeTimer = null;
  var asleep = false, waking = false, previousFocus = null, background = [], held = {};
  var activeController = null, policyReason = '';
  function arm() {
    clearTimeout(timer); timer = null;
    if (!minutes || asleep || waking || document.hidden || activeController) return;
    timer = setTimeout(check, Math.max(1, minutes * 60000 - Math.max(0,elapsedClock() - lastActivity)));
  }
  function modalVisible() {
    return Array.prototype.some.call(document.querySelectorAll('[role="dialog"]'), function (el) { return !el.hidden && el.getClientRects().length > 0; });
  }
  function sleep() {
    if (document.hidden || asleep || waking || activeController || modalVisible()) return false;
    clearTimeout(timer); timer = null; previousFocus = document.activeElement;
    background = Array.prototype.filter.call(document.body.children, function (el) { return el !== overlay && !/^(SCRIPT|STYLE|LINK)$/.test(el.tagName); })
      .map(function (el) { var entry = { el: el, inert: el.inert }; el.inert = true; return entry; });
    held = {}; asleep = true; overlay.hidden = false; overlay.focus({ preventScroll: true }); return true;
  }
  function check() {
    var now=elapsedClock();if(now<lastActivity)lastActivity=now;
    if (now - lastActivity < minutes * 60000) { arm(); return; }
    if (!sleep()) { lastActivity = elapsedClock(); arm(); }
  }
  function restore() {
    clearTimeout(wakeTimer); wakeTimer = null;
    if (!asleep && !waking) return;
    asleep = false; waking = false; held = {}; overlay.hidden = true;
    background.forEach(function (entry) { entry.el.inert = entry.inert; }); background = [];
    if (previousFocus && previousFocus.isConnected) previousFocus.focus({ preventScroll: true });
    lastActivity = elapsedClock(); arm();
  }
  function finishWake() {
    clearTimeout(wakeTimer); wakeTimer = null;
    if (waking && !Object.keys(held).length) wakeTimer = setTimeout(restore, 450);
  }
  function track(e) {
    var type = e.type, key;
    if (type.indexOf('pointer') === 0) key = 'pointer-' + e.pointerId;
    else if (type.indexOf('mouse') === 0) key = 'mouse';
    else if (type.indexOf('touch') === 0) key = 'touch';
    else if (type.indexOf('key') === 0) key = 'key-' + (e.code || e.key);
    if (/down$|start$/.test(type)) held[key] = true;
    if (/up$|end$|cancel$/.test(type) && !(e.touches && e.touches.length)) delete held[key];
  }
  function activity(e) {
    if (asleep || waking) {
      e.preventDefault(); e.stopImmediatePropagation(); track(e);
      // Keep the shield through release and the following synthetic/double click.
      if (e.type === 'click' || e.type === 'pointerup' || e.type === 'mouseup' || e.type === 'touchend' || e.type === 'keyup') {
        asleep = false; waking = true;
      }
      finishWake(); return;
    }
    lastActivity = elapsedClock();
  }
  ['pointerdown','pointerup','pointercancel','mousedown','mouseup','touchstart','touchend','touchcancel','keydown','keyup','click','dblclick','wheel'].forEach(function (event) {
    window.addEventListener(event, activity, { capture: true, passive: false });
  });
  window.addEventListener('blur', function () { held = {}; finishWake(); });
  function status() { return { blocked: !!activeController, reason: policyReason }; }
  function jobStatus(event) {
    var c = event.detail && event.detail.machine, wasBlocked = !!activeController, previousReason = policyReason;
    var active = c && (c.probeBusy || c.canStop || c.workflow === 'running' || c.workflow === 'paused' || /^(Run|Hold|Jog|Home|Door)(:|$)/.test(c.activeState || ''));
    if (!activeController && active) activeController = { port: c.port, generation: c.generation };
    // A different controller or a disconnected/replaced instance cannot prove this operation ended.
    var same = activeController && c && c.port === activeController.port && c.generation === activeController.generation;
    if (same && c.fresh && c.activeState === 'Idle' && c.workflow === 'idle' && !active) activeController = null;
    policyReason = !activeController ? '' : !same || !c.fresh ? uiLocale.t('Veille suspendue : retour au repos non confirmé.') :
      c.probeBusy ? uiLocale.t('Veille suspendue pendant le palpage simulé.') : /^Alarm/.test(c.activeState || '') ? uiLocale.t('Veille suspendue : alarme pendant le travail.') :
      c.workflow === 'paused' || /^Hold/.test(c.activeState || '') ? uiLocale.t('Veille suspendue pendant la pause.') :
      active ? uiLocale.t('Veille suspendue pendant le travail.') : uiLocale.t('Veille suspendue : retour au repos non confirmé.');
    if (wasBlocked !== !!activeController) {
      clearTimeout(timer); timer = null; lastActivity = elapsedClock();
      if (activeController && (asleep || waking)) {
        // Wake without exposing controls under a held touch or its synthetic click.
        asleep = false; waking = true; finishWake();
      } else arm();
    }
    if ((wasBlocked !== !!activeController || previousReason !== policyReason) && window.dispatchEvent)
      window.dispatchEvent(new CustomEvent('cnc-screen-saver-status', { detail: status() }));
  }
  window.addEventListener('cnc-job-status', jobStatus);
  if (window.cncState) jobStatus({ detail: window.cncState.get() });
  document.addEventListener('visibilitychange', function () {
    clearTimeout(timer); timer = null; held = {}; finishWake();
    if (!document.hidden) { lastActivity = elapsedClock(); arm(); }
  });
  window.cncScreenSaver = {
    configure: function (value) {
      minutes = [0,1,2,5,10,30].indexOf(value) >= 0 ? value : 5;
      restore(); lastActivity = elapsedClock(); arm();
    },
    preview: sleep,
    status: status
  };
})();
