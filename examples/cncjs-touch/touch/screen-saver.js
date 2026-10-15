(function () {
  'use strict';
  var overlay = document.createElement('button');
  overlay.id = 'touch-screen-saver'; overlay.type = 'button'; overlay.hidden = true;
  overlay.setAttribute('aria-label', 'Réveiller l’écran');
  overlay.textContent = 'Écran en veille · Touchez pour réveiller';
  document.body.appendChild(overlay);
  var minutes = 0, lastActivity = Date.now(), timer = null, wakeTimer = null;
  var asleep = false, waking = false, previousFocus = null, background = [], held = {};
  function arm() {
    clearTimeout(timer); timer = null;
    if (!minutes || asleep || waking || document.hidden) return;
    timer = setTimeout(check, Math.max(1, minutes * 60000 - (Date.now() - lastActivity)));
  }
  function modalVisible() {
    return Array.prototype.some.call(document.querySelectorAll('[role="dialog"]'), function (el) { return !el.hidden && el.getClientRects().length > 0; });
  }
  function sleep() {
    if (document.hidden || asleep || waking || modalVisible()) return false;
    clearTimeout(timer); timer = null; previousFocus = document.activeElement;
    background = Array.prototype.filter.call(document.body.children, function (el) { return el !== overlay && !/^(SCRIPT|STYLE|LINK)$/.test(el.tagName); })
      .map(function (el) { var entry = { el: el, inert: el.inert }; el.inert = true; return entry; });
    held = {}; asleep = true; overlay.hidden = false; overlay.focus({ preventScroll: true }); return true;
  }
  function check() {
    if (Date.now() - lastActivity < minutes * 60000) { arm(); return; }
    if (!sleep()) { lastActivity = Date.now(); arm(); }
  }
  function restore() {
    clearTimeout(wakeTimer); wakeTimer = null;
    if (!asleep && !waking) return;
    asleep = false; waking = false; held = {}; overlay.hidden = true;
    background.forEach(function (entry) { entry.el.inert = entry.inert; }); background = [];
    if (previousFocus && previousFocus.isConnected) previousFocus.focus({ preventScroll: true });
    lastActivity = Date.now(); arm();
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
    lastActivity = Date.now();
  }
  ['pointerdown','pointerup','pointercancel','mousedown','mouseup','touchstart','touchend','touchcancel','keydown','keyup','click','dblclick','wheel'].forEach(function (event) {
    window.addEventListener(event, activity, { capture: true, passive: false });
  });
  window.addEventListener('blur', function () { held = {}; finishWake(); });
  document.addEventListener('visibilitychange', function () {
    clearTimeout(timer); timer = null; held = {}; finishWake();
    if (!document.hidden) { lastActivity = Date.now(); arm(); }
  });
  window.cncScreenSaver = {
    configure: function (value) {
      minutes = [0,1,2,5,10,30].indexOf(value) >= 0 ? value : 5;
      restore(); lastActivity = Date.now(); arm();
    },
    preview: sleep
  };
})();
