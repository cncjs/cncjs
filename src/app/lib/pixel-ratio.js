// Cap the device pixel ratio at 2x. Beyond that the extra texture/render
// resolution costs GPU memory without a perceptible gain in crispness.
const MAX_PIXEL_RATIO = 2;

// Returns the device pixel ratio to render at, capped at MAX_PIXEL_RATIO.
export const getRenderPixelRatio = () => Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
