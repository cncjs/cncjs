import { useCallback, useEffect, useRef, useState } from 'react';
import { edgesOf, thumbOf } from './scrollMetrics';

/**
 * The panel's one way of scrolling something inside it.
 *
 * **The browser's scrollbar is not the panel's.** A grey track down the side
 * of a card is a web page's furniture: it is drawn by whatever browser is
 * open rather than from the token sheet like everything else here, it takes
 * a permanent gutter out of the content on a desktop and none on a phone,
 * and it invites a drag that is useless on a touchscreen. On a pendant it
 * reads as a mistake.
 *
 * So the native bar goes and two things of our own replace it, each
 * answering a different question:
 *
 *   - **the fade** says *there is more* — content thinning out as it runs
 *     under an edge. A mask and not a coloured gradient, because the strip
 *     passes over the white card *and* the grey behind it, and one colour
 *     cannot be right on both.
 *   - **the thumb** says *where you are*, in the way a phone does: it is not
 *     there until you move, and it fades out a moment after you stop. Never
 *     draggable — no phone's is, and a 4px drag target beside a jog pad is a
 *     mis-tap waiting to happen.
 *
 * The geometry is set as custom properties on the thumb rather than as a
 * `style` prop: Tailwind cannot see a class assembled at runtime, and the
 * panel does not write inline styles. Same trick the fade uses for its two
 * stops, one step further because these change with every scroll event.
 */

/** How long the thumb stays after the last movement, in milliseconds. */
const LINGER = 700;

const FadeScroller = ({ className = '', children }) => {
  const [scroller, setScroller] = useState(null);
  const [edges, setEdges] = useState({ top: false, bottom: false });
  const [moving, setMoving] = useState(false);
  const thumb = useRef(null);
  const idle = useRef(null);

  const measure = useCallback(() => {
    const at = edgesOf(scroller);
    setEdges(at);

    /*
     * Tell the content area when something is running under its bottom edge.
     *
     * The edge is drawn twice over: as an outline when the section simply
     * ends there, and as content dissolving into the page when there is more
     * of it below. Both at once is a line ruled across half-faded text, which
     * is what the settings screen looked like — *"A, mozesz sciagnac ale
     * tylko jesli pojawia sie cien bo sam border ma zostac w normalnym
     * przypadku"*.
     *
     * Marked on `main` rather than passed up through five screens: the
     * scroller is the only thing that knows, and `main` is the only thing
     * that draws. A sheet's scroller is portalled to the shell root, so
     * `closest` finds no `main` and a sheet cannot speak for the page behind
     * it.
     */
    scroller?.closest('main')?.toggleAttribute('data-under-edge', at.bottom);

    const bar = thumbOf(scroller);
    const node = thumb.current;
    if (!node) {
      return;
    }

    // Hidden by height rather than unmounted, so nothing reflows when a
    // scroller becomes scrollable while it is being looked at.
    node.style.setProperty('--thumbH', `${bar ? bar.height : 0}px`);
    node.style.setProperty('--thumbY', `${bar ? bar.top : 0}px`);
  }, [scroller]);

  const onScroll = useCallback(() => {
    measure();
    setMoving(true);
    clearTimeout(idle.current);
    idle.current = setTimeout(() => setMoving(false), LINGER);
  }, [measure]);

  useEffect(() => () => clearTimeout(idle.current), []);

  /*
   * Measured on arrival, on scroll, and whenever the content changes --- not
   * only on scroll. Switching a tab swaps a short section for a tall one
   * without anybody scrolling, and a bottom fade that only appears after the
   * first drag says "there is more" one gesture too late.
   *
   * Two observers, because they answer different questions. `ResizeObserver`
   * catches the scroller itself changing height, which is what a rotating
   * phone and a resized window do. `MutationObserver` catches the content
   * changing, which is what a tab, a port list and a sheet do --- and the
   * thing the settings screen had to pass its current tab in as a dependency
   * to notice.
   */
  useEffect(() => {
    if (!scroller) {
      return undefined;
    }

    measure();

    const resize = new ResizeObserver(measure);
    resize.observe(scroller);

    const mutation = new MutationObserver(measure);
    mutation.observe(scroller, { childList: true, subtree: true, characterData: true });

    return () => {
      resize.disconnect();
      mutation.disconnect();
    };
  }, [scroller, measure]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        ref={setScroller}
        onScroll={onScroll}
        className={[
          'min-h-0 flex-1 overflow-y-auto scroll-quiet',
          '[mask-image:linear-gradient(to_bottom,transparent_0,black_var(--fadeT),black_calc(100%-var(--fadeB)),transparent_100%)]',
          edges.top ? '[--fadeT:1.75rem]' : '[--fadeT:0px]',
          edges.bottom ? '[--fadeB:1.75rem]' : '[--fadeB:0px]',
          className,
        ].join(' ')}
      >
        {children}
      </div>
      {/*
        * Outside the scroller, not in it.
        *
        * `mask-image` above establishes a containing block, so a thumb inside
        * would be positioned against the scrolled content and would also be
        * faded out by the very mask it is meant to stand beside.
        */}
      {/*
        * In the gutter, not against the text.
        *
        * It sat at the scroller's own right edge, which on a padded card puts
        * it a couple of pixels from the last word on every line — *"scroll
        * mozna przesunac jeszcze na prawo tam jest duzo miejsca na scroll a to
        * jest parent kontenera scrolowanego"* (2026-09-23, with the state help
        * sheet as the example).
        *
        * Against the outer edge of the parent's gutter, not halfway into it.
        *
        * It was half of `--pad` out, which assumed every container's padding
        * *is* `--pad`. A sheet's is, and the content area's is `--shellPad` —
        * ten rather than eighteen — so the same rule left the thumb five
        * pixels from the text and nine from the edge in one place and hard
        * against the screen in the other: *"po prawej jest duzo miejsca a
        * teraz wyglada na sklejony z kontentem"*.
        *
        * So the parent says how much room it leaves and this sits two pixels
        * inside it, the way a phone's own indicator hugs the edge. `--pad` is
        * the default because most of the things that scroll here are cards.
        */}
      <span
        ref={thumb}
        aria-hidden="true"
        className={[
          'pointer-events-none absolute right-[calc(2px-var(--thumbGutter,var(--pad)))] top-0 w-1 rounded-full bg-mut transition-opacity duration-300',
          'h-[var(--thumbH,0px)] translate-y-[var(--thumbY,0px)]',
          moving ? 'opacity-40' : 'opacity-0',
        ].join(' ')}
      />
    </div>
  );
};

export default FadeScroller;
