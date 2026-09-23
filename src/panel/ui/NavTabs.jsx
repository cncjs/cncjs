import { useEffect, useRef, useState } from 'react';
import { dimPanel } from './themeColor';
import { EDGE } from './navEdge';
import { t } from '../i18n';

/**
 * Where you can go, when there is no room for a rail.
 *
 * **One grid, of which one row is showing.** Pulling the handle raises the
 * rest of it; the bottom row never moves, because that is the row a thumb
 * finds without looking.
 *
 * It got here in two corrections. The bar carried six destinations and
 * `Połączenie` is eleven characters in a 65px tab, so the overflow went
 * behind a raised circle with a chevron — and the circle was wrong:
 * *"to ma tworzyc ciagly element razem z menu na dole, bez takeigo koleczka
 * … a elementy w menu to tez ikony, czyli jeden ciagly grid"* (2026-09-23).
 *
 * He is right, and the reason is worth keeping: a floating button is a second
 * object with its own rules, and what this is is one menu that happens to be
 * mostly off screen. A handle on the top edge says that without inventing
 * anything.
 *
 * Unbuilt destinations are shown and disabled, in every row, for the reason
 * the rail shows them: a menu whose items appear one release at a time moves
 * under a thumb that had stopped looking.
 */

/*
 * A glyph each, because at this size a word is read and a shape is
 * recognised. They are drawn rather than lettered — an icon font is a second
 * download and a second thing to keep.
 *
 * Every destination has one now. The overflow used to be words, which was a
 * way of not guessing what a screen that does not exist looks like; one
 * continuous grid does not leave that open, so these are drawn from what each
 * screen is *for* rather than from what it will contain.
 */
const MARKS = {
  dashboard: 'M3 11l9-8 9 8M5 9.5V20h14V9.5',
  jog: 'M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3',
  zero: 'M12 3v18M3 12h18M12 12m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0',
  files: 'M4 4h6l2 3h8v13H4zM4 9h16',
  alarms: 'M12 4a6 6 0 0 0-6 6v4l-2 3h16l-2-3v-4a6 6 0 0 0-6-6zM10 20a2 2 0 0 0 4 0',
  // The cut itself: a route across the work.
  path: 'M3 17l4-8 4 5 3-8 3 6 4-4',
  // A tip coming down onto a surface until it touches.
  probe: 'M12 3v9M9 9l3 3 3-3M4 19h16',
  /*
   * A gauge with a needle, not a trace.
   *
   * It was a pulse, and a pulse is a zigzag — so was `path` two lines up, and
   * at 28px in a row beside each other they read as the same icon twice. A
   * dial is the other half of what diagnostics is for and shares no line with
   * a route across the work.
   */
  diag: 'M4 17a8 8 0 0 1 16 0M12 17l4.5-5.5',
  // Back to the corner everything is measured from.
  homing: 'M5 19V5h14M17 12H9M12 9l-3 3 3 3',
  // A prompt, because that is what typing a line at the machine is.
  mdi: 'M4 5h16v14H4zM8 10l2.5 2.5L8 15M13 15h4',
  // Two things set once and left alone.
  settings: 'M4 8h9M17 8h3M4 16h3M11 16h9M13 8a2 2 0 1 0 4 0a2 2 0 1 0-4 0M7 16a2 2 0 1 0 4 0a2 2 0 1 0-4 0',
};

/**
 * How far a finger has to travel before it is a drag rather than a tap.
 *
 * Small enough that a deliberate push up is caught first time, large enough
 * that the wobble in a thumb pressing a tile is not.
 */
const SWIPE_PX = 24;

const Tile = ({ id, label, ready, here, onSelect }) => (
  <button
    type="button"
    aria-current={here ? 'page' : undefined}
    aria-label={label}
    disabled={!ready}
    onClick={() => onSelect(id)}
    className={[
      'flex min-w-0 flex-col items-center justify-center gap-1 py-1',
      here ? 'text-acc' : 'text-mut',
      ready ? '' : 'opacity-45',
    ].join(' ')}
  >
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="size-7 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={MARKS[id] || MARKS.files} />
    </svg>
    {/* The word stays under the shape. A glyph alone is a guess until it has
      * been learned, and this menu is used by whoever happens to be standing
      * at the machine. */}
    <span className="w-full truncate px-0.5 text-center text-label font-semibold uppercase tracking-[0.06em]">
      {label}
    </span>
  </button>
);

const NavTabs = ({ items, rest, current, onSelect, className = '' }) => {
  const [open, setOpen] = useState(false);

  // Escape closes it, like every other layer on this panel.
  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const onKey = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const go = (id) => {
    setOpen(false);
    onSelect(id);
  };

  /*
   * Dragged as well as pressed.
   *
   * *"ma oblsugiwac swipe, przeciagenie do gory"*. The chevron says which way
   * it goes; a thumb that has learned that will try to push it there before
   * it tries to tap, and a menu that only answers to a tap feels stuck.
   *
   * Anywhere on the bar, not only on the hump — a gesture that has to be
   * started on a 64px target is a gesture nobody finds twice.
   *
   * The threshold is what keeps the tiles tappable: under it this is a tap
   * and the button underneath gets it, over it the drag wins and the click
   * that follows is swallowed. Without that last part a swipe started on
   * `Jog` would open the menu *and* navigate.
   */
  const bar = useRef(null);
  const drag = useRef({ y: null, swiped: false });

  // The raised menu puts up the same scrim a sheet does, so the status bar
  // above it dims with everything else. See `ui/themeColor`.
  useEffect(() => (open ? dimPanel() : undefined), [open]);

  useEffect(() => {
    const node = bar.current;
    if (!node) {
      return undefined;
    }

    const down = (event) => {
      drag.current = { y: event.clientY, swiped: false };
    };

    const up = (event) => {
      const from = drag.current.y;
      drag.current.y = null;
      if (from === null) {
        return;
      }
      const moved = from - event.clientY;
      // Under the threshold this was a tap and the tile underneath gets it.
      if (Math.abs(moved) < SWIPE_PX) {
        return;
      }
      drag.current.swiped = true;
      setOpen(moved > 0);
    };

    /*
     * The click after a drag is swallowed here, in the capture phase.
     *
     * Without it a swipe started on `Jog` would open the menu *and* navigate
     * — the browser still fires a click on the element the gesture began on.
     */
    const click = (event) => {
      if (!drag.current.swiped) {
        return;
      }
      drag.current.swiped = false;
      event.preventDefault();
      event.stopPropagation();
    };

    /*
     * Down on the bar, up on the window.
     *
     * A swipe up ends above the bar — that is what makes it a swipe — so a
     * `pointerup` listener on the bar never hears the end of the gesture and
     * nothing happens. Measured: dragging 60px up from a tile left the menu
     * shut, and it looked exactly like the threshold being too high.
     *
     * The window rather than pointer capture, which would redirect the click
     * that follows to the bar and cost the tiles their taps.
     */
    node.addEventListener('pointerdown', down);
    window.addEventListener('pointerup', up);
    node.addEventListener('click', click, true);

    return () => {
      node.removeEventListener('pointerdown', down);
      window.removeEventListener('pointerup', up);
      node.removeEventListener('click', click, true);
    };
  }, []);

  const tile = (item) => (
    <Tile
      key={item.id}
      id={item.id}
      label={item.label}
      ready={item.ready}
      here={item.id === current}
      onSelect={go}
    />
  );

  return (
    <>
      {/* Tapping away closes it — the usual gesture, and it means the raised
        * menu can be got rid of without aiming at anything. */}
      {open ? (
        <button
          type="button"
          aria-label={t('sheet.close')}
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-20 cursor-default bg-scrim"
        />
      ) : null}

      <nav
        ref={bar}
        /*
         * The menu is one block, parked with all but its first row below the
         * screen, and opening raises the whole of it.
         *
         * It used to grow extra rows above a bar that stayed put. That is not
         * what was asked for and not what it should be: *"to nie pojawia sie
         * na menu tylko dolne menu ujawnia sie, przesuwa sie spod ekranu,
         * podnosic sie cale jako jedna calosc"*. One object that slides, not
         * a bar that sprouts.
         *
         * The `nav` keeps the height of its closed state, so the screen above
         * does not move when the menu opens — the block inside it is what
         * travels, and it hangs out of the bottom rather than being clipped.
         */
        className={`relative z-30 h-[calc(var(--btnh)+var(--navEdge))] shrink-0 ${className}`}
        aria-label={t('nav.label')}
      >
        <div
          className={[
            'absolute inset-x-0 top-0 flex flex-col transition-transform duration-200',
            open ? '-translate-y-navHidden' : 'translate-y-0',
          ].join(' ')}
        >
          {/*
            * The bar's top edge, drawn rather than bordered.
            *
            * A border with a rounded box on top of it meets the line at a
            * right angle however round the box is. CSS has no way to say
            * otherwise, so the edge is a path and the mound is part of it.
            *
            * **Two grid columns wide.** The first one was a quarter of this
            * and read as a pin, three columns was the other way past it, and
            * a flat crest between the shoulders made it a plateau. The shape
            * lives in `EDGE`, where the reasoning about its control points
            * belongs.
            *
            * Taller than it began, twice — *"chevorn daj troche nizej albo
            * garb troche wyzszy"*, then *"wiekszy padding dla chevrona, albo
            * cos za blisko krawedzi"*. The strip is 30 rather than the 20 it
            * started at, so there is air between the chevron and the curve.
            *
            * **Two paths, one shape.** The fill is the outline closed down to
            * the bottom of the strip, so it meets the menu's own background
            * with nothing between them; the stroke is the outline alone, left
            * open, so no line is drawn where the mound joins the bar.
            *
            * **And this strip has no background.** The nav used to carry
            * `bg-panel`, which painted the whole band above the line white.
            * The background lives on the rows below now, and the only thing
            * filled up here is the inside of the mound.
            */}
          <button
            type="button"
            aria-label={t('nav.more')}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
            className={`relative block h-navEdge w-full shrink-0 ${open ? 'text-acc' : 'text-mut'}`}
          >
          <svg
            viewBox="0 0 500 30"
            preserveAspectRatio="none"
            aria-hidden="true"
            className="absolute inset-0 size-full overflow-visible"
            fill="none"
          >
            {/*
              * The fill is the outline closed *past* the bottom of the box —
              * `V40`, ten units below a box thirty deep, with the SVG allowed
              * to overflow.
              *
              * Closed exactly at the edge it left a hairline of whatever was
              * behind: invisible against the page, and a grey line under the
              * mound once the menu was open and the scrim was behind it —
              * *"dalej widze kreske pod garbem na telefonie, ale po
              * rozwinieciu"*. Half a pixel of antialiasing, and no amount of
              * getting the arithmetic right removes it. Overlapping does.
              *
              * The stroke is the outline alone, left open, so nothing is
              * drawn along the foot.
              */}
            <path d={`${EDGE} V40 H0 Z`} className="fill-panel" />
            <path
              d={EDGE}
              className="stroke-line"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          {/* Its own element, at its own size: the edge is stretched to the
            * width of the bar, and a chevron drawn in that viewBox would be
            * stretched with it. */}
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className={`absolute bottom-1.5 left-1/2 size-4 -translate-x-1/2 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 15l6-6 6 6" />
          </svg>
          </button>

          {/*
            * One grid, three rows deep, of which one is above the screen's
            * edge when it is closed. The row height is the same everywhere,
            * because they are the same rows — the first one is not a bar with
            * the others hanging off it.
            */}
          {/* Padded at the sides and under the last row: five tiles edge to
            * edge put the outer two against the glass, and on a rounded
            * screen that is partly off it. */}
          <div className="grid auto-rows-[--btnh] grid-cols-5 items-center bg-panel px-2 pb-safeB">
            {items.map(tile)}
            {rest.map(tile)}
          </div>
        </div>
      </nav>
    </>
  );
};

export default NavTabs;
