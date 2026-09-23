import { MIN_THUMB, edgesOf, thumbOf } from '../scrollMetrics';

/** Just enough of an element to be measured. */
const scroller = (scrollTop, clientHeight, scrollHeight) => ({
  scrollTop, clientHeight, scrollHeight,
});

describe('edgesOf', () => {
  it('fades neither end of something that fits', () => {
    expect(edgesOf(scroller(0, 400, 400))).toEqual({ top: false, bottom: false });
  });

  it('fades the bottom of something not yet scrolled', () => {
    expect(edgesOf(scroller(0, 400, 900))).toEqual({ top: false, bottom: true });
  });

  it('fades both ends in the middle', () => {
    expect(edgesOf(scroller(250, 400, 900))).toEqual({ top: true, bottom: true });
  });

  it('fades only the top at the end', () => {
    expect(edgesOf(scroller(500, 400, 900))).toEqual({ top: true, bottom: false });
  });

  it('leaves the top alone for a fraction of a pixel', () => {
    // `scrollTop` is fractional on a phone with a scaled viewport, so a plain
    // `> 0` fades the top of a screen nobody has touched.
    expect(edgesOf(scroller(0.5, 400, 900)).top).toBe(false);
  });

  it('fades nothing when there is no scroller yet', () => {
    // The ref is null for the first render, and a fade decided from nothing
    // would flash on arrival.
    expect(edgesOf(null)).toEqual({ top: false, bottom: false });
  });
});

describe('thumbOf', () => {
  it('says nothing when everything fits', () => {
    // A thumb as long as its track is clutter on a card that does not scroll.
    expect(thumbOf(scroller(0, 400, 400))).toBeNull();
    expect(thumbOf(scroller(0, 400, 400.5))).toBeNull();
    expect(thumbOf(null)).toBeNull();
  });

  it('is as long as the share of the content on screen', () => {
    // Half the content visible, half the track.
    expect(thumbOf(scroller(0, 400, 800))).toEqual({ height: 200, top: 0 });
  });

  it('starts at the top and ends flush with the bottom', () => {
    // The travel is the track less the thumb. Positioned by the raw fraction,
    // the thumb hangs half of itself off the end of the scroll.
    expect(thumbOf(scroller(0, 400, 800)).top).toBe(0);
    expect(thumbOf(scroller(400, 400, 800)).top).toBe(200);
  });

  it('never gets shorter than a thumb worth seeing', () => {
    // 400 of 40000 is four pixels, which reads as dirt on the glass.
    const long = thumbOf(scroller(0, 400, 40000));
    expect(long.height).toBe(MIN_THUMB);
  });

  it('still reaches the end once it has been lengthened', () => {
    // Measured against the lengthened thumb, not the proportional one, or the
    // last screenful arrives before `scrollTop` does.
    const end = thumbOf(scroller(39600, 400, 40000));
    expect(end.top).toBe(400 - MIN_THUMB);
  });

  it('holds still rather than overshooting on a rubber band', () => {
    // iOS reports a negative `scrollTop` at the top of an elastic scroll and
    // more than the maximum at the bottom.
    expect(thumbOf(scroller(-30, 400, 800)).top).toBe(0);
    expect(thumbOf(scroller(900, 400, 800)).top).toBe(200);
  });
});
