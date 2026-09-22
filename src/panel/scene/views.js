/**
 * Where the camera stands for each named view.
 *
 * The world is **Z up**, because a machine is. Three's own default is Y up
 * and every example is written that way, which is why this is stated once
 * here and set on the camera rather than left to be rediscovered from a
 * picture that came out lying on its side.
 *
 * The name each button carries is a key rather than a word. This file is
 * plain `.js` so that Jest can see it, and Jest runs with no browser for
 * i18next to detect a language from — so the words are looked up where the
 * bar is drawn.
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
  iso: { labelKey: 'scene.view.iso', direction: [1, -1, 1] },
  // Straight down: X right, Y up, the way the bed is drawn on paper.
  top: { labelKey: 'scene.view.top', direction: [0, 0, 1] },
  // From the front of the machine, looking at the XZ plane.
  front: { labelKey: 'scene.view.front', direction: [0, -1, 0] },
  // From the right-hand side, looking at the YZ plane.
  right: { labelKey: 'scene.view.right', direction: [1, 0, 0] },
};

export const VIEW_IDS = Object.keys(VIEWS);

export const DEFAULT_VIEW = 'iso';

/** Which way is up, everywhere in this scene. */
export const UP = [0, 0, 1];

export default VIEWS;
