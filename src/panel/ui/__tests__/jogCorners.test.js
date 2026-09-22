import { CORNERS, DOWN_LEFT, DOWN_RIGHT, UP_LEFT, UP_RIGHT } from '../jogCorners';

describe('the corners of the jog cross', () => {
  test('each one moves the two axes its position means', () => {
    expect(UP_LEFT.dir).toEqual({ x: -1, y: 1 });
    expect(UP_RIGHT.dir).toEqual({ x: 1, y: 1 });
    expect(DOWN_LEFT.dir).toEqual({ x: -1, y: -1 });
    expect(DOWN_RIGHT.dir).toEqual({ x: 1, y: -1 });
  });

  test('the arrow is turned to point the way the key moves', () => {
    // The glyph is drawn pointing up and to the right, and CSS turns
    // clockwise. Get a sign wrong here and a key points at the opposite
    // corner from the one it drives.
    expect(UP_RIGHT.rotate).toBe('');
    expect(DOWN_RIGHT.rotate).toBe('rotate-90');
    expect(DOWN_LEFT.rotate).toBe('rotate-180');
    expect(UP_LEFT.rotate).toBe('-rotate-90');
  });

  test('the rounded corner is the one facing out of the cross', () => {
    // Round an inner corner instead and the keys stop meeting each other,
    // which reads as a gap in the pad rather than as a compass.
    expect(UP_LEFT.round).toBe('rounded-tl-jcorner');
    expect(UP_RIGHT.round).toBe('rounded-tr-jcorner');
    expect(DOWN_LEFT.round).toBe('rounded-bl-jcorner');
    expect(DOWN_RIGHT.round).toBe('rounded-br-jcorner');
  });

  test('every corner carries the sign of both axes', () => {
    // The words around them belong to the translation; what this file owes
    // the pad is which way each corner goes.
    expect(CORNERS.map((c) => `${c.signs.x}${c.signs.y}`)).toEqual(['−+', '++', '−−', '+−']);
  });
});
