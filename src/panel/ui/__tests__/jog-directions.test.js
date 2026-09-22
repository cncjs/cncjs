import { composeDirection, sameDirection } from '../jog-directions';

describe('what the held keys add up to', () => {
  test('one arrow is one axis', () => {
    expect(composeDirection(['ArrowRight'])).toEqual({ x: 1 });
    expect(composeDirection(['ArrowDown'])).toEqual({ y: -1 });
  });

  test('two arrows are a diagonal', () => {
    // The whole point: holding both moves at 45°, exactly as the corner keys
    // on the pad do.
    expect(composeDirection(['ArrowRight', 'ArrowUp'])).toEqual({ x: 1, y: 1 });
    expect(composeDirection(['ArrowDown', 'ArrowLeft'])).toEqual({ x: -1, y: -1 });
  });

  test('letting one go leaves the move on the other', () => {
    // This is what makes the direction follow the keys rather than the press.
    expect(composeDirection(['ArrowRight'])).toEqual({ x: 1 });
  });

  test('opposite keys cancel that axis rather than fighting', () => {
    expect(composeDirection(['ArrowLeft', 'ArrowRight'])).toBeNull();
    expect(composeDirection(['ArrowLeft', 'ArrowRight', 'ArrowUp'])).toEqual({ y: 1 });
  });

  test('Z does not mix with X and Y', () => {
    // They carry their own step and their own feed rate; a combined move
    // would have to pick one set of numbers and be wrong about the other.
    expect(composeDirection(['ArrowRight', 'PageUp'])).toEqual({ z: 1 });
    expect(composeDirection(['PageUp', 'ArrowRight'])).toEqual({ x: 1 });
  });

  test('nothing held is no direction', () => {
    expect(composeDirection([])).toBeNull();
    expect(composeDirection(['KeyA'])).toBeNull();
  });

  test('a repeated key does not double the axis', () => {
    // The browser repeats `keydown`; the set must not turn that into a
    // stronger move.
    expect(composeDirection(['ArrowRight', 'ArrowRight'])).toEqual({ x: 1 });
  });
});

describe('telling two directions apart', () => {
  test('the same move compares equal whatever order it was built in', () => {
    expect(sameDirection({ x: 1, y: -1 }, { y: -1, x: 1 })).toBe(true);
  });

  test('a changed sign or a changed axis is a different move', () => {
    expect(sameDirection({ x: 1 }, { x: -1 })).toBe(false);
    expect(sameDirection({ x: 1 }, { x: 1, y: 1 })).toBe(false);
    expect(sameDirection({ x: 1 }, null)).toBe(false);
    expect(sameDirection(null, null)).toBe(true);
  });
});
