/*
 * Comments pinned to places, on the running panel.
 *
 * Claude Design lets you click a spot on a drawing and leave a note there.
 * This is that, on the other side: click anything in the live panel, say what
 * is wrong with it, and the note lands in `design/review.json` with enough
 * about the element that it can be found in the source without a description.
 *
 * Loaded by a bookmarklet, so it attaches to whatever is open — the panel, or
 * the side-by-side review page from `design-diff.js` — and nothing about it
 * ships in the product.
 *
 * Served by `scripts/design-review.js`, which also takes the POSTs.
 */
(() => {
  const HOST = window.__reviewHost || 'http://localhost:8765';

  if (window.__reviewLoaded) {
    window.__reviewToggle();
    return;
  }
  window.__reviewLoaded = true;

  let notes = [];
  let picking = false;
  let hovered = null;

  // ---- where the click landed -------------------------------------------

  // A path good enough to find the element again after a reload, and good
  // enough for a person reading the note to know what was meant.
  const pathOf = (el) => {
    const parts = [];
    let node = el;
    while (node && node.nodeType === 1 && parts.length < 8 && node.tagName !== 'BODY') {
      const parent = node.parentElement;
      if (!parent) { break; }
      const same = Array.from(parent.children).filter((c) => c.tagName === node.tagName);
      const index = same.indexOf(node) + 1;
      parts.unshift(same.length > 1 ? `${node.tagName.toLowerCase()}:nth-of-type(${index})` : node.tagName.toLowerCase());
      node = parent;
    }
    return parts.join(' > ');
  };

  const screenOf = () => {
    const here = document.querySelector('[aria-current="page"]');
    return here ? here.textContent.trim() : document.title;
  };

  // Which card the element sits in, by the caption the card carries. "The
  // stepper" is ambiguous on a screen with two of them; "the stepper in
  // PRĘDKOŚĆ Z" is not.
  const cardOf = (el) => {
    const section = el.closest('section');
    const head = section && section.querySelector('h2');
    if (head) { return head.textContent.trim().slice(0, 40); }
    // Some cards carry no caption — the drawing gives the jog card none — so
    // fall back to the nearest labelled group, which is what an operator would
    // name it anyway.
    const group = el.closest('[role="group"][aria-label]');
    return group ? group.getAttribute('aria-label').slice(0, 40) : '';
  };

  // What the control is currently saying or doing. A note that reads "this is
  // wrong" against a button is answerable; against a button whose state nobody
  // recorded it is a second round of questions.
  const stateOf = (el) => {
    const bits = [];
    const pressed = el.getAttribute('aria-pressed');
    const current = el.getAttribute('aria-current');
    if (pressed) { bits.push(pressed === 'true' ? 'wybrany' : 'niewybrany'); }
    if (current) { bits.push('bieżący'); }
    if (el.disabled) { bits.push('wyłączony'); }
    const output = el.tagName === 'OUTPUT' ? el : el.querySelector('output');
    if (output) { bits.push(`wartość ${output.textContent.trim().slice(0, 24)}`); }
    return bits.join(', ');
  };

  const describe = (el) => {
    const box = el.getBoundingClientRect();
    const root = document.documentElement;
    return {
      // The frame being looked at. A note about spacing means one thing at
      // 1024 and another at 390, and the same sentence arrives for both.
      target: root.dataset.target || 'base',
      theme: root.querySelector('[data-theme]')
        ? root.querySelector('[data-theme]').dataset.theme
        : 'light',
      screen: screenOf(),
      card: cardOf(el),
      state: stateOf(el),
      path: pathOf(el),
      tag: el.tagName.toLowerCase(),
      // The Tailwind class string is how a component is found in the source.
      className: typeof el.className === 'string' ? el.className.slice(0, 200) : '',
      label: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 60),
      box: {
        x: Math.round(box.x), y: Math.round(box.y),
        w: Math.round(box.width), h: Math.round(box.height),
      },
    };
  };

  // ---- chrome ------------------------------------------------------------

  const style = document.createElement('style');
  style.textContent = `
    #rv-bar { position: fixed; z-index: 2147483000; right: 16px; bottom: 16px;
      display: flex; gap: 8px; align-items: center; background: #171d25; color: #e6ecf3;
      border: 1px solid #3a424c; border-radius: 6px; padding: 8px 10px;
      font: 13px/1.3 system-ui, sans-serif; box-shadow: 0 6px 24px rgba(0,0,0,.4); }
    #rv-bar button { font: inherit; cursor: pointer; border-radius: 4px; padding: 6px 10px;
      border: 1px solid #3a424c; background: #2c323a; color: #e6ecf3; }
    #rv-bar button.on { background: #e04a4a; border-color: #e04a4a; }
    #rv-bar .count { color: #8b97a6; }
    #rv-bar .sep { width: 1px; height: 22px; background: #3a424c; }
    #rv-bar .targets { display: flex; gap: 4px; }
    #rv-bar .targets button.on { background: #1557c0; border-color: #1557c0; }
    #rv-bar .scale { font: 600 12px/1 'IBM Plex Mono', monospace; min-width: 62px; }
    .rv-hover { outline: 2px solid #e04a4a !important; outline-offset: -2px !important; }
    #rv-sheet { position: fixed; inset: 0; z-index: 2147482500; cursor: crosshair;
      background: transparent; }
    #rv-size { position: absolute; z-index: 2147482400; font: 600 11px/1 'IBM Plex Mono', monospace;
      color: #e6ecf3; background: #e04a4a; padding: 4px 8px; border-radius: 0 0 4px 0; }
    .rv-pin { position: absolute; z-index: 2147482000; width: 22px; height: 22px;
      margin: -11px 0 0 -11px; border-radius: 50%; background: #e04a4a; color: #fff;
      font: 700 12px/22px system-ui, sans-serif; text-align: center; cursor: pointer;
      box-shadow: 0 2px 6px rgba(0,0,0,.4); }
    #rv-form { position: fixed; z-index: 2147483600; background: #171d25; color: #e6ecf3;
      border: 1px solid #3a424c; border-radius: 6px; padding: 10px; width: 280px;
      font: 13px/1.4 system-ui, sans-serif; box-shadow: 0 6px 24px rgba(0,0,0,.4); }
    #rv-form textarea { width: 100%; height: 70px; box-sizing: border-box; background: #0e1319;
      color: #e6ecf3; border: 1px solid #3a424c; border-radius: 4px; padding: 6px; font: inherit; }
    #rv-form .what { color: #8b97a6; font-size: 11px; margin-bottom: 6px;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    #rv-form .row { display: flex; gap: 6px; justify-content: flex-end; margin-top: 8px; }
    #rv-form button { font: inherit; cursor: pointer; border-radius: 4px; padding: 5px 10px;
      border: 1px solid #3a424c; background: #2c323a; color: #e6ecf3; }
    #rv-form button.save { background: #1557c0; border-color: #1557c0; }
  `;
  document.head.appendChild(style);

  const bar = document.createElement('div');
  bar.id = 'rv-bar';
  bar.innerHTML = `
    <span class="targets">
      <button data-target="base" class="on" title="1024 x 768">1024</button>
      <button data-target="fullhd" title="1920 x 1080">Full HD</button>
      <button data-target="phone" title="390 x 844">Telefon</button>
    </span>
    <span class="scale" id="rv-scale"></span>
    <button id="rv-open" title="Otwórz w oknie o rozmiarze celu">Nowe okno</button>
    <span class="sep"></span>
    <button id="rv-pick">Komentarz</button>
    <span class="count" id="rv-count"></span>
    <button id="rv-clear" title="Usuń wszystkie uwagi">Wyczyść</button>`;
  document.body.appendChild(bar);

  const count = bar.querySelector('#rv-count');
  const pickButton = bar.querySelector('#rv-pick');
  const scaleNote = bar.querySelector('#rv-scale');
  const openButton = bar.querySelector('#rv-open');

  // ---- target --------------------------------------------------------------

  /*
   * The mockup's `data-target` switch, on the running panel.
   *
   * Every target is framed at its own size, including 1024. The first version
   * left 1024 unframed — the panel simply filled the window — so on a 1440-wide
   * window it drew the 1024 token scale across 1440 pixels while Full HD was
   * correctly framed and scaled down to fit. The result read as the two being
   * swapped: the small target looked roomy and the large one looked cramped.
   * A preview that is not framed is not a preview of anything.
   *
   * Scale is only ever downwards, and only when the window cannot hold the
   * target. When it fits, the frame is 1:1 and what is on screen is what the
   * device would show. When it does not, the bar says the percentage, because a
   * layout judged at 73% is being judged at the wrong size and whoever is
   * looking at it should know that rather than infer it.
   *
   * For a true 1:1 look at a target too big for the current window, `Nowe okno`
   * opens one sized to the target itself.
   */
  const TARGETS = {
    base: { w: 1024, h: 768 },
    fullhd: { w: 1920, h: 1080 },
    phone: { w: 390, h: 844 },
  };

  const mount = document.getElementById('panel-root');
  const sizeTag = document.createElement('div');
  sizeTag.id = 'rv-size';
  document.body.appendChild(sizeTag);

  let current = 'base';

  const setTarget = (name) => {
    if (!mount) { return; }
    current = TARGETS[name] ? name : 'base';
    const target = TARGETS[current];

    // `base` is the drawing's default and declares no attribute of its own.
    if (current === 'base') {
      delete document.documentElement.dataset.target;
    } else {
      document.documentElement.dataset.target = current;
    }

    const scale = Math.min(
      (window.innerWidth - 40) / target.w,
      (window.innerHeight - 40) / target.h,
      1
    );
    /*
     * Everything outside the frame is dimmed by a shadow large enough to reach
     * any edge, so where the device ends is never a guess. A hairline border
     * was not enough: against a light panel on a light page there was nothing
     * to see.
     */
    mount.style.cssText = `width:${target.w}px;height:${target.h}px;`
      + `transform:scale(${scale});transform-origin:top left;`
      + 'position:absolute;top:28px;left:20px;'
      + 'outline:2px solid #e04a4a;box-shadow:0 0 0 100vmax rgba(10,14,20,.62);';
    document.body.style.overflow = 'hidden';

    sizeTag.textContent = `${target.w} x ${target.h}`;
    sizeTag.style.left = '20px';
    sizeTag.style.top = `${28 - 20}px`;

    const exact = scale > 0.999;
    scaleNote.textContent = exact ? '1:1' : `skala ${Math.round(scale * 100)}%`;
    scaleNote.style.color = exact ? '#2ea36a' : '#d08a1b';
    openButton.hidden = exact;
    drawPins();
  };

  /*
   * A window the size of the target, so the panel is looked at rather than at a
   * picture of the panel. The browser puts its own chrome around the viewport,
   * so the size asked for is corrected once the window is up.
   */
  const openAtTarget = () => {
    const target = TARGETS[current];
    const win = window.open(window.location.href, `rv-${current}`,
      `width=${target.w},height=${target.h}`);
    if (!win) {
      window.alert('Przeglądarka zablokowała nowe okno — zezwól na wyskakujące okna dla tej strony.');
      return;
    }
    const fit = () => {
      win.resizeBy(target.w - win.innerWidth, target.h - win.innerHeight);
      const script = win.document.createElement('script');
      script.src = `${HOST}/overlay.js?${Date.now()}`;
      win.document.body.appendChild(script);
    };
    if (win.document.readyState === 'complete') { setTimeout(fit, 300); } else { win.addEventListener('load', () => setTimeout(fit, 300)); }
  };

  bar.querySelectorAll('[data-target]').forEach((button) => {
    button.addEventListener('click', () => {
      bar.querySelectorAll('[data-target]')
        .forEach((b) => b.classList.toggle('on', b === button));
      setTarget(button.dataset.target);
    });
  });

  // ---- pins --------------------------------------------------------------

  const clearPins = () => document.querySelectorAll('.rv-pin').forEach((p) => p.remove());

  const drawPins = () => {
    clearPins();
    notes.forEach((note, index) => {
      let target = null;
      try { target = document.querySelector(note.path); } catch (err) { target = null; }
      const box = target
        ? target.getBoundingClientRect()
        : { x: note.box.x, y: note.box.y, width: note.box.w, height: note.box.h };
      const pin = document.createElement('div');
      pin.className = 'rv-pin';
      pin.textContent = String(index + 1);
      pin.style.left = `${box.x + box.width / 2 + window.scrollX}px`;
      pin.style.top = `${box.y + window.scrollY + 11}px`;
      pin.title = note.text;
      pin.addEventListener('click', async (event) => {
        event.stopPropagation();
        if (window.confirm(`${index + 1}. ${note.text}\n\nUsunąć tę uwagę?`)) {
          await fetch(`${HOST}/notes/${note.id}`, { method: 'DELETE' });
          await load();
        }
      });
      document.body.appendChild(pin);
    });
    count.textContent = notes.length ? `${notes.length} uwag` : 'brak uwag';
  };

  const load = async () => {
    const response = await fetch(`${HOST}/notes`);
    notes = await response.json();
    drawPins();
  };

  // ---- picking -----------------------------------------------------------

  const unhover = () => {
    if (hovered) { hovered.classList.remove('rv-hover'); }
    hovered = null;
  };

  const ask = (el) => {
    const where = describe(el);
    const form = document.createElement('div');
    form.id = 'rv-form';
    const box = el.getBoundingClientRect();
    /*
     * Fixed and clamped to the viewport. Positioned in page coordinates it
     * went under the framed screen — the frame is absolutely placed and the
     * body does not scroll while a target is framed, so anything below the
     * fold was simply not reachable.
     */
    const FORM = { w: 280, h: 150 };
    form.style.left = `${Math.max(8, Math.min(box.x, window.innerWidth - FORM.w - 8))}px`;
    form.style.top = box.bottom + 8 + FORM.h < window.innerHeight
      ? `${box.bottom + 8}px`
      : `${Math.max(8, box.top - FORM.h - 8)}px`;
    form.innerHTML = `
      <div class="what">${where.target} · ${where.screen}${where.card ? ` · ${where.card}` : ''} · &lt;${where.tag}&gt; ${where.label || ''}${where.state ? ` · ${where.state}` : ''}</div>
      <textarea placeholder="Co jest nie tak w tym miejscu?"></textarea>
      <div class="row"><button class="cancel">Anuluj</button><button class="save">Zapisz</button></div>`;
    document.body.appendChild(form);

    const area = form.querySelector('textarea');
    area.focus();

    const close = () => form.remove();
    const save = async () => {
      const text = area.value.trim();
      if (!text) { close(); return; }
      await fetch(`${HOST}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...where, text }),
      });
      close();
      await load();
    };

    form.querySelector('.cancel').addEventListener('click', close);
    form.querySelector('.save').addEventListener('click', save);
    area.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) { save(); }
      if (event.key === 'Escape') { close(); }
    });
  };

  /*
   * Picking goes through a sheet over the whole viewport rather than through
   * listeners on the page, and that is not defensiveness — it is the only
   * thing that works here.
   *
   * A disabled control fires no mouse events at all, and on a panel with no
   * machine attached most of the screen is disabled: every jog key, every step
   * chip, Start, Probe. Those are exactly the places worth commenting on, and
   * listening for clicks would have made them the only places that could not
   * be commented on.
   *
   * The sheet catches the click, steps out of the way for one call to
   * `elementFromPoint`, and steps back. It also means the page never sees the
   * click, so nothing is pressed while marking things up.
   */
  let sheet = null;

  const under = (x, y) => {
    sheet.style.pointerEvents = 'none';
    const el = document.elementFromPoint(x, y);
    sheet.style.pointerEvents = 'auto';
    return el;
  };

  const onSheetMove = (event) => {
    const el = under(event.clientX, event.clientY);
    if (!el || el === hovered || el.closest('#rv-bar, #rv-form')) { return; }
    unhover();
    hovered = el;
    el.classList.add('rv-hover');
  };

  const onSheetClick = (event) => {
    const el = under(event.clientX, event.clientY);
    setPicking(false);
    if (el && !el.closest('#rv-bar, #rv-form')) { ask(el); }
  };

  const onKey = (event) => {
    if (event.key === 'Escape') { setPicking(false); }
  };

  function setPicking(on) {
    picking = on;
    pickButton.classList.toggle('on', on);
    pickButton.textContent = on ? 'Kliknij miejsce…' : 'Komentarz';

    if (on) {
      sheet = document.createElement('div');
      sheet.id = 'rv-sheet';
      document.body.appendChild(sheet);
      sheet.addEventListener('mousemove', onSheetMove);
      sheet.addEventListener('click', onSheetClick);
      document.addEventListener('keydown', onKey);
      return;
    }

    if (sheet) { sheet.remove(); sheet = null; }
    document.removeEventListener('keydown', onKey);
    unhover();
  }

  window.__reviewToggle = () => setPicking(!picking);

  pickButton.addEventListener('click', () => setPicking(!picking));
  bar.querySelector('#rv-clear').addEventListener('click', async () => {
    if (!notes.length || !window.confirm('Usunąć wszystkie uwagi?')) { return; }
    await fetch(`${HOST}/notes`, { method: 'DELETE' });
    await load();
  });

  openButton.addEventListener('click', openAtTarget);
  window.addEventListener('resize', () => setTarget(current));

  /*
   * The notes are polled rather than only read once. A pin is removed at the
   * other end — by whoever fixed it — and the board should empty itself as
   * that happens instead of after a reload nobody thought to do.
   */
  setInterval(load, 2000);
  // The panel is a single page; pins follow whatever it redraws.
  setInterval(drawPins, 1000);

  /*
   * Reload when the bundle changes.
   *
   * The panel's compiler has no hot reload, so every fix meant somebody
   * pressing F5 — and a review loop where the reviewer has to remember to
   * refresh is a loop that shows stale screens and produces notes about things
   * already fixed.
   *
   * The bundle's own `Last-Modified` is the signal. Not while a note is being
   * written: reloading would throw the sentence away.
   */
  const watchBuild = () => {
    const url = document.querySelector('script[src*="panel.bundle"]');
    if (!url) { return; }
    let seen = null;
    setInterval(async () => {
      if (document.getElementById('rv-form')) { return; }
      try {
        const head = await fetch(url.src, { method: 'HEAD', cache: 'no-store' });
        const stamp = head.headers.get('last-modified') || head.headers.get('etag');
        if (!stamp) { return; }
        if (seen && stamp !== seen) { window.location.reload(); }
        seen = stamp;
      } catch (err) {
        // The dev server restarting is not news.
      }
    }, 2000);
  };

  /*
   * A reload drops the overlay with the page, so it puts itself back. Which
   * target was being looked at survives too — being returned to the desk
   * layout every time the bundle rebuilds is its own kind of lost work.
   */
  const KEEP = 'rv-target';
  window.addEventListener('beforeunload', () => {
    try { window.sessionStorage.setItem(KEEP, current); } catch (err) { /* private mode */ }
  });

  let remembered = 'base';
  try { remembered = window.sessionStorage.getItem(KEEP) || 'base'; } catch (err) { remembered = 'base'; }
  bar.querySelectorAll('.targets button')
    .forEach((b) => b.classList.toggle('on', b.dataset.target === remembered));

  setTarget(remembered);
  load();
  watchBuild();
})();
