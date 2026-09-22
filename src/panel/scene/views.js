/**
 * Where the camera stands for each named view.
 *
 * The world is **Z up**, because a machine is. Three's own default is Y up
 * and every example is written that way, which is why this is stated once
 * here and set on the camera rather than left to be rediscovered from a
 * picture that came out lying on its side.
 *
 * Each vector points from what is being looked at *towards* the camera, which
 * is the direction `fitCameraToBounds` takes. A view is only a direction: how
 * far back the camera ends up is the size of what it is framing, which the fit
 * works out.
 */
export const VIEWS = {
  // The default, and not the usual choice. A plan view is what a toolpath
  // viewer normally opens on and it hides the whole Z story — depth of cut,
  // retract height, a plunge that goes through the bed. Isometric shows all
  // three axes at once at the cost of exact reading in any of them, and this
  // screen is for "is this program the shape I meant", not for measuring.
  iso: { label: 'IZO', direction: [1, -1, 1] },
  // Straight down: X right, Y up, the way the bed is drawn on paper.
  top: { label: 'GÓRA', direction: [0, 0, 1] },
  // From the front of the machine, looking at the XZ plane.
  front: { label: 'PRZÓD', direction: [0, -1, 0] },
  // From the right-hand side, looking at the YZ plane.
  right: { label: 'BOK', direction: [1, 0, 0] },
};

export const VIEW_IDS = Object.keys(VIEWS);

export const DEFAULT_VIEW = 'iso';

/** Which way is up, everywhere in this scene. */
export const UP = [0, 0, 1];

export default VIEWS;
