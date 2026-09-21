/**
 * The scene's colours, taken from Universal Gcode Sender's defaults.
 *
 * Matching UGS is the point rather than a coincidence: it is the reference
 * these numbers were read out of (`VisualizerOptions.java`), and the reason it
 * reads as calm is that almost nothing in it is saturated. The grid sits at
 * alpha 29 of 255 — about a tenth — which is what makes a workspace full of
 * grid lines recede instead of competing with the toolpath drawn on top of it.
 *
 * Plain hex, and no three.js, so `toolpath-segments` can use the same values
 * and still be unit-tested without a renderer.
 */

// rgb(220, 235, 255) — pale, slightly cold. Dark enough to let a light grid
// show and light enough for dark toolpath colours to sit on.
export const BACKGROUND = 0xdcebff;

// rgb(179, 179, 179) at UGS's alpha 29/255. The centre lines are given a
// little more presence because they are the only thing marking the origin
// once the axis lines themselves are off the visible area.
export const GRID = 0xb3b3b3;
export const GRID_OPACITY = 0.11;
export const GRID_CENTER = 0x9a9a9a;
export const GRID_CENTER_OPACITY = 0.22;

// rgb(230, 0, 0) / rgb(0, 230, 0) / rgb(0, 0, 230) — a shade off full
// saturation, which is most of why they sit in the picture rather than on it.
export const AXIS_X = 0xe60000;
export const AXIS_Y = 0x00e600;
export const AXIS_Z = 0x0000e6;

// rgb(128, 128, 128), UGS's "size display" grey. Grid numbers are reference
// material, not content: legible when looked for, ignorable otherwise.
export const LABEL = 0x808080;
export const LABEL_OPACITY = 0.7;

// rgb(119, 139, 168), UGS's machine boundary. Steel blue rather than the red
// this used to be — the envelope is context, not a warning.
export const MACHINE_LIMITS = 0x778ba8;
export const MACHINE_LIMITS_OPACITY = 0.55;

// rgb(204, 204, 0), UGS's rapid. Far enough from the blues that a travel move
// cannot be mistaken for a cut at some depth.
export const TOOLPATH_RAPID = 0xcccc00;

/**
 * The cutting ramp, shallow to deep.
 *
 * UGS ships a cyan-to-dark-blue ramp and spends it on feed rate; this spends
 * it on depth, which is what was asked for. The shallow end is pulled in from
 * UGS's rgb(204, 255, 255) to something with contrast against the background —
 * at that pale a cyan the shallowest pass, which is usually most of the
 * programme, would have been the hardest thing on screen to see.
 */
export const TOOLPATH_CUT_SHALLOW = 0x569cd6;
export const TOOLPATH_CUT_DEEP = 0x00009e;

// rgb(190, 190, 190), UGS's completed colour.
export const TOOLPATH_DONE = 0xbebebe;

/**
 * rgb(237, 255, 0) — the one saturated colour in UGS's palette, and
 * deliberately so: the tool is the thing you want to find without looking for
 * it. Small enough that it does not shout.
 */
export const TOOL = 0xedff00;
