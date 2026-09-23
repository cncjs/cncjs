/**
 * The arithmetic of a scroller: where its edges are, and where its thumb goes.
 *
 * Its own file, in `.js`, because the Jest tier only transforms `.js` and this
 * is the part worth testing. It began inside the settings screen and moved out
 * when three more scrollers wanted the same behaviour.
 */

/**
 * Which edges have something hidden behind them.
 *
 * Both fades are conditional, and each for its own reason. A permanent top
 * fade would wash out the first row of a section nobody has scrolled yet --
 * *"ten fade od gory tez przy skorlu"*, at the scroll, not before it. And a
 * permanent bottom one would hide the very thing the bottom padding was added
 * to show: the end of the section, reached.
 *
 * A pixel of slack on each comparison. `scrollTop` is fractional on a phone
 * with a scaled viewport, so `> 0` is true at rest and the top would fade by
 * a hair on a screen nobody had touched.
 */
export const edgesOf = (el) => (el ? {
  top: el.scrollTop > 1,
  bottom: el.scrollTop + el.clientHeight < el.scrollHeight - 1,
} : { top: false, bottom: false });

/**
 * The shortest a thumb may be, in pixels.
 *
 * Proportion alone gives a very long list a three-pixel sliver, which reads
 * as a speck of dirt rather than as a position. Every phone does this.
 */
export const MIN_THUMB = 28;

/**
 * Where the indicator sits, in pixels down the scroller, or nothing.
 *
 * `null` when there is nothing to scroll: a thumb as long as its track says
 * "you are looking at all of it", which is true and is also clutter on the
 * many cards here that fit.
 *
 * The travel is the track less the thumb, not the track — a thumb positioned
 * by the raw fraction hangs its bottom half off the end at the end of the
 * scroll. And once the thumb has been lengthened to `MIN_THUMB`, the travel
 * has to be measured from the lengthened one or the last screenful arrives
 * before `scrollTop` does.
 */
export const thumbOf = (el, min = MIN_THUMB) => {
  if (!el) {
    return null;
  }

  const { scrollTop, clientHeight, scrollHeight } = el;
  const hidden = scrollHeight - clientHeight;

  if (hidden <= 1 || clientHeight <= 0) {
    return null;
  }

  const height = Math.min(clientHeight, Math.max(min, Math.round((clientHeight / scrollHeight) * clientHeight)));
  const travel = clientHeight - height;
  const at = Math.min(1, Math.max(0, scrollTop / hidden));

  return { height, top: Math.round(at * travel) };
};
