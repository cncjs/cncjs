import { readFileSync } from 'fs';
import { join } from 'path';
import { ABOVE_EDGE, EDGE, MOUND } from '../navEdge';

describe('navEdge', () => {
  it('builds the whole edge out of the mound', () => {
    // One curve, one string. Three things draw this profile and a shape
    // assembled from three copies of a set of control points comes apart the
    // first time one of them is adjusted.
    expect(EDGE).toContain(MOUND);
    expect(EDGE.startsWith('M0 29.5H150')).toBe(true);
    expect(EDGE.endsWith('H500')).toBe(true);
  });

  it('closes the same outline upwards for the mask', () => {
    // `ABOVE_EDGE` is the region the bite keeps. Written out rather than
    // derived, because reversing a path is not a string operation — so what
    // is checked is that both describe the same mound: the crest at the same
    // height, and the same handles either side of it.
    expect(EDGE).toContain('250 3');
    expect(ABOVE_EDGE).toContain('250 3');
    expect(EDGE).toContain('215 29.5');
    expect(ABOVE_EDGE).toContain('215 29.5');
  });

  /*
   * The fourth copy, and the one that cannot import.
   *
   * `tailwind.panel.config.js` carries the same outline inside a data URI,
   * because a mask is a stylesheet value and the config is CommonJS while
   * this is a module. Nothing stops the two drifting except this.
   */
  it('matches the outline the mask in the Tailwind config uses', () => {
    const config = readFileSync(
      join(__dirname, '..', '..', '..', '..', 'tailwind.panel.config.js'),
      'utf8',
    );

    expect(config).toContain(ABOVE_EDGE);
  });
});
