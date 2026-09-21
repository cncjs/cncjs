import { useEffect, useState } from 'react';

/**
 * The scene's colours, taken from the token sheet at runtime.
 *
 * A canvas cannot wear a CSS class, so this is the one place in the panel
 * where a colour is read in JavaScript rather than written as a utility. It
 * still comes from `tokens.css` and nowhere else: reading the custom
 * properties keeps the rule intact and is what makes the scene follow the
 * theme, the density and the target like everything around it.
 *
 * Writing `0x6d7886` here instead would have frozen the light theme into the
 * outlines, and on the dark theme the envelope would have been a grey box on
 * a nearly black one.
 *
 * That includes the toolpath. It did not at first: its colours came baked
 * into the vertex buffer from `lib/toolpath/palette`, which is where the old
 * visualiser still gets them. Measuring them against this panel's own field
 * is what changed the answer — see the entries below.
 */
const TOKENS = {
  // The canvas ground. The field colour rather than the card's, so the
  // viewport reads as something recessed into the card rather than as more
  // card.
  ground: '--field',
  // Hairlines: the grid, and the program's own extents.
  line: '--line',
  // The machine's own outline. Context, not content.
  edge: '--mut',
  // Work coordinate systems — the thing the operator is actually setting.
  work: '--acc',
  // The tool. The one mark on screen that has to be found without looking.
  tool: '--amb',
  /*
   * The toolpath.
   *
   * These *do* follow the theme, and it took a measurement to decide that
   * they should. The hues are Universal Gcode Sender's and do not change —
   * a warm rapid, a blue ramp for depth — but UGS chose its lightnesses
   * against a pale blue background, and against this panel's they fail at one
   * end each: the rapid at 1.62:1 on the light theme and the deep end of the
   * ramp at 1.14:1 on the dark one. A depth ramp legible on a near-white
   * ground and one legible on a near-black ground cannot be the same three
   * numbers, so they are tokens and the sheet answers for them.
   */
  rapid: '--rapid',
  cutTop: '--cutTop',
  cutDeep: '--cutDeep',
};

const read = () => {
  const style = getComputedStyle(document.documentElement);
  const colors = {};

  for (const [name, token] of Object.entries(TOKENS)) {
    colors[name] = style.getPropertyValue(token).trim();
  }

  return colors;
};

/**
 * Re-read when the theme changes.
 *
 * The panel switches theme by attribute on the root and nothing in React
 * knows a theme exists — which is what lets the review overlay flip it
 * without fighting a re-render. Every CSS utility follows that for free; a
 * canvas does not, so this is the one thing that has to watch for it.
 */
export const useSceneColors = () => {
  const [colors, setColors] = useState(read);

  useEffect(() => {
    const observer = new MutationObserver(() => setColors(read()));

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'data-target', 'data-density'],
    });

    return () => observer.disconnect();
  }, []);

  return colors;
};

export default useSceneColors;
