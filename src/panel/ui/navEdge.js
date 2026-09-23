/**
 * The top edge of the phone menu, mound and all, in a 500x30 box.
 *
 * **One path for the whole edge — that is the point.** It used to be two
 * rules with the mound's outline between them, and however the shoulders were
 * drawn the result was a line that appeared to run *under* the mound:
 * *"pod garbem widze te linie ktora poprawiales"*. It was never a seam. Two
 * greys a fraction of a pixel apart read as one line peeling off another, and
 * the gentler the shoulder the longer they ran together — so every attempt to
 * make the junction smoother made the artefact worse.
 *
 * Drawn as one stroke there is nothing to double. Which is what lets the
 * junction have the radius it was asked for: *"wiekszy promien na lacznieu z
 * menu, przejscie ma byc gladkie"*.
 *
 * Five columns of 100, so the mound spans two of them — the same two tiles it
 * sits over — and the box stretches to the bar's width, which keeps that true
 * on any phone.
 *
 * **The handles cross, and the foot's is the longer.** Each curve runs 100
 * across; the one at the foot reaches 65 and the one at the crest 50, both
 * level with the end they belong to — so the line leaves the flat even more
 * gradually than the crest comes over: *"dolny promien moze byc nawet
 * wiekszy"*.
 *
 * They were 40 and 40, which made the foot the *tighter* of the two and was
 * the thing being complained about. Crossing them is not a mistake: it is
 * what asks for a flatter start than finish, and the tangents at both ends
 * stay horizontal either way, so there is still no corner anywhere in it.
 *
 * **Its own file because three things draw this profile now**: the bar's own
 * edge, the bite the content section takes out of itself a `--gap` above it,
 * and the outline of that bite. A shape assembled from three copies of a set
 * of control points comes apart the first time one of them is adjusted. The
 * mask in `tailwind.panel.config.js` is a fourth, and cannot import from here
 * — `__tests__/navEdge.test.js` is what keeps it honest.
 */

/** The mound alone, from the foot on the left to the foot on the right. */
export const MOUND = 'C215 29.5 200 3 250 3C300 3 285 29.5 350 29.5';

/** The whole edge: flat, mound, flat. */
export const EDGE = `M0 29.5H150${MOUND}H500`;

/** The same edge closed upwards, which is what the mask keeps. */
export const ABOVE_EDGE = 'M0 0H500V29.5H350C285 29.5 300 3 250 3C200 3 215 29.5 150 29.5H0Z';

export default EDGE;
