import Cuboid from '../Cuboid';

describe('Cuboid', () => {
  it('keeps zero-extent limits empty without converting faceless geometry', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    try {
      const lineSegments = new Cuboid({
        dx: Number.MIN_VALUE,
        dy: Number.MIN_VALUE,
        dz: Number.MIN_VALUE,
        dashed: true,
      });

      expect(lineSegments.geometry.getAttribute('position')?.count || 0).toBe(0);
      expect(consoleError).not.toHaveBeenCalled();
      lineSegments.geometry.dispose();
      lineSegments.material.dispose();
    } finally {
      consoleError.mockRestore();
    }
  });

  it('retains edges for non-degenerate limits', () => {
    const lineSegments = new Cuboid({ dx: 10, dy: 20, dz: 30 });

    expect(lineSegments.geometry.getAttribute('position').count).toBe(24);
    lineSegments.geometry.dispose();
    lineSegments.material.dispose();
  });
});
