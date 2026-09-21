import { buildGrid, gridStep } from '../grid-lines';

/**
 * The one piece of arithmetic in the grid, and the one that decides whether it
 * reads as a surface or as a grey wash.
 */
describe('gridStep', () => {
  test.each([
    // A 200mm machine, which is COM3: 20mm squares, ten across.
    [200, 20],
    // A small part measured in a few millimetres still gets squares somebody
    // can count rather than one square with the part inside it.
    [10, 1],
    [30, 2],
    [80, 5],
    // A metre-plus gantry. Lines every 100mm, not every 68.75.
    [1200, 100],
    [2500, 200],
  ])('%dmm across gets %dmm squares', (extent, step) => {
    expect(gridStep(extent)).toBe(step);
  });

  test('never divides the view into more than it can show', () => {
    for (let extent = 1; extent <= 3000; extent += 7) {
      expect(extent / gridStep(extent)).toBeLessThanOrEqual(16);
    }
  });

  test('lands on numbers a machinist reads, not on the extent over sixteen', () => {
    // 137mm would be 8.5625mm squares if the step were computed rather than
    // chosen, and every line would sit at a number nobody can use.
    expect(gridStep(137)).toBe(10);
    expect(gridStep(137) % 1).toBe(0);
  });

  test('has a coarsest step rather than running off the end of the list', () => {
    // A machine this large does not exist, and a grid with no answer for it
    // would return undefined and draw nothing at all.
    expect(gridStep(10 ** 9)).toBe(1000);
  });
});

describe('buildGrid', () => {
  // COM3: the reachable volume is [-200, 0] on every axis.
  const COM3 = { min: { x: -200, y: -200, z: -200 }, max: { x: 0, y: 0, z: 0 } };

  const count = (geometry) => geometry.getAttribute('position').count / 2;

  test('draws the lines through zero apart from the rest', () => {
    const { lines, axes, step } = buildGrid(COM3, -200);

    expect(step).toBe(20);
    // Eleven lines each way at 20mm over 200mm; one of each passes through
    // zero and is drawn at its own weight.
    expect(count(axes)).toBe(2);
    expect(count(lines)).toBe(20);
  });

  test('lays every line at the height it is given', () => {
    const { lines } = buildGrid(COM3, -200);
    const position = lines.getAttribute('position');

    for (let i = 0; i < position.count; i += 1) {
      expect(position.getZ(i)).toBe(-200);
    }
  });

  test('snaps the extent out to the step rather than starting mid-square', () => {
    const { lines, axes } = buildGrid(
      { min: { x: -137, y: -137, z: 0 }, max: { x: 3, y: 3, z: 0 } },
      0
    );
    const all = [lines, axes].flatMap((geometry) => {
      const position = geometry.getAttribute('position');
      return Array.from({ length: position.count }, (_, i) => position.getX(i));
    });

    // 10mm squares over 140mm: the grid reaches -140 and +10, not -137 and +3.
    expect(Math.min(...all)).toBe(-140);
    expect(Math.max(...all)).toBe(10);
  });

  test('draws the line at each end, not just up to the last whole step', () => {
    const { lines, axes } = buildGrid(
      { min: { x: 0, y: 0, z: 0 }, max: { x: 100, y: 100, z: 0 } },
      0
    );

    // Eleven each way over 100mm at 10mm, both edges included.
    expect(count(lines) + count(axes)).toBe(2 * 11);
  });
});
