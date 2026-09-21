import { createContext, useContext, useEffect } from 'react';

/**
 * The status bar as a slot rather than a fixed line.
 *
 * Whatever is on screen can fill it: the jog screen puts the handful of facts
 * checked between key presses there, a file screen could put what is selected,
 * a probe screen what it is about to touch. Nothing fills it and it falls back
 * to the job — which is the one thing worth seeing from every screen, because
 * a job runs for minutes while somebody is somewhere else.
 *
 * A render function and an explicit dependency list, not a node. A node is a
 * new object on every render, so storing one would set state on every render
 * and never stop. The deps are the values the line actually reads.
 *
 * Which contributor wins will be a setting once there is a settings screen.
 * Until then the screen that is open decides, which is the same answer for
 * every panel that only has one screen open at a time.
 */
const FooterSlot = createContext(() => {});

export const FooterSlotProvider = FooterSlot.Provider;

export const useFooterContent = (render, deps) => {
  const fill = useContext(FooterSlot);

  useEffect(() => {
    fill(() => render);
    return () => fill(null);
    // The caller names what the line reads; `render` itself is new every time.
  }, deps);
};

export default FooterSlot;
