/**
 * The top edge of the phone menu, mound and all, in a 500x30 box — and the
 * bite the content section takes out of itself a gap above it.
 *
 * **One path for the whole edge — that is the point.** It used to be two
 * rules with the mound's outline between them, and however the shoulders were
 * drawn the result was a line that appeared to run *under* the mound:
 * *"pod garbem widze te linie ktora poprawiales"*. It was never a seam. Two
 * greys a fraction of a pixel apart read as one line peeling off another, and
 * the gentler the shoulder the longer they ran together.
 *
 * Five columns of 100, so the mound spans two of them — the same two tiles it
 * sits over — and the box stretches to the bar's width, which keeps that true
 * on any phone.
 *
 * **The handles cross, and the foot's is the longer.** Each curve runs 100
 * across; the one at the foot reaches 65 and the one at the crest 50, both
 * level with the end they belong to — so the line leaves the flat even more
 * gradually than the crest comes over: *"dolny promien moze byc nawet
 * wiekszy"*. Crossing them is not a mistake: it asks for a flatter start than
 * finish, and the tangents at both ends stay horizontal either way.
 */

/** The mound alone, from the foot on the left to the foot on the right. */
export const MOUND = 'C215 29.5 200 3 250 3C300 3 285 29.5 350 29.5';

/** The whole edge: flat, mound, flat. */
export const EDGE = `M0 29.5H150${MOUND}H500`;

/**
 * How far the section keeps off the bar, and how wide a box the bite needs.
 *
 * The gap is `--gap` at the phone's density, and the box has to hold a curve
 * that rises seven units *above* the bar's own — see below.
 */
const GAP = 10;
const NOMINAL_WIDTH = 390;
const CEILING = -12;

/**
 * The section's own corner, which the bite has to carry.
 *
 * Mirrors `--r-card`, and `__tests__/navEdge.test.js` reads the token sheet
 * and fails if the two part company. It has to be here rather than read: the
 * curve is built where there is no document, and the number is needed to
 * build it.
 *
 * **The bite is the section's bottom edge now**, so the corners belong to it.
 * A mask that ended in a straight line cut them off flat — *"border radius na
 * rogach, teraz zniknely po tych zmianach"*. The radius the card had is 10px
 * further down, inside the strip the mask removes, so it was being deleted
 * along with everything else down there.
 */
const CARD_RADIUS = 6;

/*
 * The two halves of the mound, as the control points of the curves above.
 * Written out because the arithmetic below needs them as numbers, and parsing
 * them back out of `MOUND` would be a parser nobody asked for.
 */
const HALVES = [
  { x: [150, 215, 200, 250], y: [29.5, 29.5, 3, 3] },
  { x: [250, 300, 285, 350], y: [3, 3, 29.5, 29.5] },
];

const at = (p, t) => {
  const u = 1 - t;
  return (u * u * u * p[0]) + (3 * u * u * t * p[1]) + (3 * u * t * t * p[2]) + (t * t * t * p[3]);
};

const slope = (p, t) => {
  const u = 1 - t;
  return (3 * u * u * (p[1] - p[0])) + (6 * u * t * (p[2] - p[1])) + (3 * t * t * (p[3] - p[2]));
};

/**
 * The same curve, a fixed distance from it — measured the way an eye measures.
 *
 * **A curve shifted straight up is not a parallel curve**, and it shows.
 * Perpendicular distance is the shift times the cosine of the slope, so the
 * gap pinches wherever the line is steep and opens out at the crest. Reported
 * from the phone before it was measured: *"wyglada jakby byla scisnieta, czyli
 * blizej bokow garba ale dalej od jego szczytu"*. Measured after: 7.80 at the
 * shoulders against 10.00 at the crest, a fifth of the gap.
 *
 * So each point is pushed along its own normal instead. And the normal is
 * taken **on screen**, not in the box: 500 units are drawn across 390 pixels
 * and 30 units across 30, so the slopes an eye sees are steeper than the ones
 * the numbers have. Offsetting in box units would have fixed the wrong curve.
 *
 * Which makes the result width-dependent, so it is computed for a nominal
 * phone and left there. The error that buys is small and was measured rather
 * than assumed: 0.37px at 430 wide, 0.33px at 360, and 0.22px at the compact
 * density's 9px gap — against 2.20px for the straight shift it replaces.
 */
export const offsetEdge = (width = NOMINAL_WIDTH, gap = GAP, steps = 22, inset = 0) => {
  const sx = width / 500;
  const out = [];

  /*
   * `inset` pulls both ends in, for the line and not for the fill.
   *
   * A section's border is drawn *inside* its box — 10.0 to 11.0 of a box that
   * starts at 10 — and an SVG stroke is centred on its path, so a path at
   * 10.0 covers 9.5 to 10.5 and the two are half a pixel apart. It shows as a
   * step where the side border meets the corner: *"border nie pokrywa sie z
   * krzywa"*.
   *
   * Moving the whole shape in fixes the line and breaks the fill, which then
   * leaves that half pixel of border showing below the curve for the whole
   * height of the card. So the fill keeps the full width and the line gets
   * its own geometry — one shape, two paths, which they already were.
   */
  const squeeze = (x) => Number((inset + (x * (500 - (2 * inset)) / 500)).toFixed(2));

  const push = (x, y, dx, dy) => {
    const len = Math.hypot(dx * sx, dy) || 1;
    out.push([
      squeeze(Number((((x * sx) + (gap * dy / len)) / sx).toFixed(1))),
      Number((y - (gap * dx * sx / len)).toFixed(1)),
    ]);
  };

  push(150, 29.5, 1, 0);
  for (const half of HALVES) {
    for (let i = 1; i <= steps; ++i) {
      const t = i / steps;
      push(at(half.x, t), at(half.y, t), slope(half.x, t), slope(half.y, t));
    }
  }

  const flat = out[0][1];
  const body = out.map(([x, y]) => `${x} ${y}`).join('L');

  /*
   * The corners, as elliptical arcs.
   *
   * The box is stretched — 500 units across `width` pixels, 30 across 30 — so
   * a circular corner on screen is an ellipse in here. `rx` is the radius
   * divided by that squeeze; `ry` is the radius itself.
   */
  const r = CARD_RADIUS;
  const rx = Number((r * 500 / width).toFixed(1));

  /*
   * Both sweep flags are 0, and that is not a coincidence.
   *
   * Each corner turns the same way: the edge comes in along one side and
   * leaves along the other, with the centre of the turn up and inboard. In
   * SVG's y-down frame that is the negative direction at both ends.
   */
  return [
    `M${squeeze(0)} ${flat - r}`,
    `A${rx} ${r} 0 0 0 ${squeeze(rx)} ${flat}`,
    `L${body}`,
    `L${squeeze(500 - rx)} ${flat}`,
    `A${rx} ${r} 0 0 0 ${squeeze(500)} ${flat - r}`,
  ].join('');
};

/** The bite's outline, as the fill follows it. */
export const BITE = offsetEdge();

/**
 * The same, pulled in half a pixel at each end, for the stroke.
 *
 * Half a pixel of the nominal content width — 370 of the phone's 390, the two
 * `--shellPad` margins taken off — so the line's centre lands on the centre
 * of the section's own border instead of half a pixel outside it.
 */
export const BITE_LINE = offsetEdge(NOMINAL_WIDTH, GAP, 22, 0.5 * 500 / (NOMINAL_WIDTH - 20));

/**
 * The same, closed *downwards*: the piece of page that covers the content.
 *
 * The bite is a shape now rather than a mask. Painted over the content in the
 * page's own colour it cuts as well as a mask did — and unlike a mask it has
 * a silhouette, which is what `drop-shadow` follows. That is the whole point
 * of the change: a shadow that goes round the curve by itself, instead of a
 * horizontal gradient that ran out before the curve reached it.
 *
 * The other half of the same idea was a circle for the mound, and that one
 * does not work: a circle meeting a straight edge corners at both shoulders
 * unless it is tangent, and the smoothness of that junction is what the bar's
 * cubic was shaped for.
 *
 * **Closed ten units past the foot of the box**, and the box is allowed to
 * overflow. Stopping exactly at the bottom left the section's own border — a
 * single pixel — showing underneath, which is the same artefact the bar's
 * fill solves the same way: no amount of getting the arithmetic right removes
 * half a pixel of antialiasing, and overlapping does.
 *
 * **And past both sides, for the same reason at a different scale.** Closed
 * flush with the ends, the fill's own right edge lands on a fraction of a
 * device pixel wherever the ratio is fractional, and what shows through the
 * part it does not cover is the section's border — a faint line running from
 * the corner all the way down the gap, on every screen. Reported from a
 * Samsung S24 and not reproducible until the phone's real numbers were read
 * off the screenshot: 411 CSS px at 2.625, not the 360 at 3 that 1080x2340
 * suggests. Measured there, the stray column reads 27 against a 19 page and a
 * 51 border; with the overhang it reads 19. Four units is a little over three
 * pixels, which lands inside the `--shellPad` margin and is wider than any
 * rounding error can be.
 */
const OVERHANG = 4;

/** Where the bite's own ends sit, and so where its skirt begins. */
const SHOULDER = 29.5 - GAP - CARD_RADIUS;

export const BITE_FILL = `${BITE}H${500 + OVERHANG}V40H${-OVERHANG}V${SHOULDER}Z`;

/** The box both of those are drawn in, tall enough for a crest above zero. */
export const BITE_VIEWBOX = `0 ${CEILING} 500 ${30 - CEILING}`;

export default EDGE;
