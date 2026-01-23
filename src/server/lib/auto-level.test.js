/* eslint-env jest */
import { createProbeXYPoints, applyProbeCompensation } from './auto-level';

describe('auto-level', () => {
  describe('createProbeXYPoints', () => {
    test('should generate 3x3 grid (9 points)', () => {
      const positions = createProbeXYPoints({
        startX: 0,
        endX: 20,
        stepX: 10,
        startY: 0,
        endY: 20,
        stepY: 10,
      });

      expect(positions).toHaveLength(9);
      expect(positions).toEqual([
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 20, y: 0 },
        { x: 0, y: 10 },
        { x: 10, y: 10 },
        { x: 20, y: 10 },
        { x: 0, y: 20 },
        { x: 10, y: 20 },
        { x: 20, y: 20 },
      ]);
    });

    test('should generate points within range when end does not align with step', () => {
      const positions = createProbeXYPoints({
        startX: 0,
        endX: 35,
        stepX: 10,
        startY: 0,
        endY: 35,
        stepY: 10,
      });

      expect(positions).toEqual([
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 20, y: 0 },
        { x: 30, y: 0 },
        { x: 0, y: 10 },
        { x: 10, y: 10 },
        { x: 20, y: 10 },
        { x: 30, y: 10 },
        { x: 0, y: 20 },
        { x: 10, y: 20 },
        { x: 20, y: 20 },
        { x: 30, y: 20 },
        { x: 0, y: 30 },
        { x: 10, y: 30 },
        { x: 20, y: 30 },
        { x: 30, y: 30 },
      ]);

      // Verify no point exceeds boundaries
      const maxX = Math.max(...positions.map(p => p.x));
      const maxY = Math.max(...positions.map(p => p.y));
      expect(maxX).toBeLessThanOrEqual(35);
      expect(maxY).toBeLessThanOrEqual(35);
    });
  });

  describe('applyProbeCompensation', () => {
    describe('error handling', () => {
      test('should return original G-code if less than 3 probe points', () => {
        const gcode = 'G0 X10 Y10 Z5';
        const probeData = [
          { x: 0, y: 0, z: 0 },
          { x: 10, y: 0, z: 0.1 },
        ];

        const result = applyProbeCompensation(gcode, probeData);
        expect(result).toBe(gcode);
      });

      test('should return original G-code for empty probe data', () => {
        const gcode = 'G0 X10 Y10 Z5';
        const result = applyProbeCompensation(gcode, []);
        expect(result).toBe(gcode);
      });
    });

    describe('Z compensation verification', () => {
      test('should apply zero compensation for flat surface at origin', () => {
        const gcode = 'G0 X0 Y0 Z1.000';
        const probeData = [
          { x: 0, y: 0, z: 0 },
          { x: 10, y: 0, z: 0 },
          { x: 0, y: 10, z: 0 },
        ];

        const result = applyProbeCompensation(gcode, probeData);

        // At origin (0,0), surface is at Z=0, commanded Z=1 → compensated Z=1
        const expectedResult = 'G0 X0.000 Y0.000 Z1.000';
        expect(result).toEqual(expectedResult);
      });

      test('should compensate for tilted surface (Z increases with X)', () => {
        const gcode = 'G0 X0 Y0 Z0\nG0 X10 Y0 Z0';
        const probeData = [
          { x: 0, y: 0, z: 0 },
          { x: 10, y: 0, z: 1 },
          { x: 0, y: 10, z: 0 },
          { x: 10, y: 10, z: 1 },
        ];

        const result = applyProbeCompensation(gcode, probeData);
        const expectedResult = [
          'G0 X0.000 Y0.000 Z0.000',
          'G0 X5.000 Y0.000 Z0.500',
          'G0 X10.000 Y0.000 Z1.000',
        ].join('\n');
        expect(result).toEqual(expectedResult);
      });

      test('should correctly interpolate Z for point between probes', () => {
        const gcode = 'G0 X5 Y5 Z0';
        const probeData = [
          { x: 0, y: 0, z: 0 },
          { x: 10, y: 0, z: 0.2 },
          { x: 0, y: 10, z: 0.2 },
          { x: 10, y: 10, z: 0.4 },
        ];

        const result = applyProbeCompensation(gcode, probeData);

        // At (5,5), interpolated surface Z = 0.2mm (average of 4 corners)
        // Commanded Z=0 → compensated Z=0.2
        const expectedResult = 'G0 X5.000 Y5.000 Z0.200';
        expect(result).toEqual(expectedResult);
      });

      test('should apply negative compensation for sunken surface', () => {
        const gcode = 'G0 X5 Y5 Z0';
        const probeData = [
          { x: 0, y: 0, z: -0.5 },
          { x: 10, y: 0, z: -0.5 },
          { x: 0, y: 10, z: -0.5 },
          { x: 10, y: 10, z: -0.5 },
        ];

        const result = applyProbeCompensation(gcode, probeData);

        // At (5,5), surface is at Z=-0.5, commanded Z=0 → compensated Z=-0.5
        const expectedResult = 'G0 X5.000 Y5.000 Z-0.500';
        expect(result).toEqual(expectedResult);
      });

      test('should add probe deviation to commanded Z height', () => {
        const gcode = 'G0 X0 Y0 Z10';
        // Horizontal plane at Z=2
        const probeData = [
          { x: 0, y: 0, z: 2 },
          { x: 10, y: 0, z: 2 },
          { x: 0, y: 10, z: 2 },
          { x: 10, y: 10, z: 2 },
        ];

        const result = applyProbeCompensation(gcode, probeData);

        // At (0,0), surface Z=2, commanded Z=10 → compensated Z=12
        const expectedResult = 'G0 X0.000 Y0.000 Z12.000';
        expect(result).toEqual(expectedResult);
      });
    });

    describe('segment subdivision', () => {
      test('should subdivide long moves based on detected grid size', () => {
        const gcode = 'G0 X0 Y0 Z0\nG0 X50 Y0 Z0';
        // 10mm grid with non-collinear points (need Y variation for plane interpolation)
        const probeData = [
          { x: 0, y: 0, z: 0 },
          { x: 10, y: 0, z: 0.1 },
          { x: 20, y: 0, z: 0.2 },
          { x: 30, y: 0, z: 0.3 },
          { x: 40, y: 0, z: 0.4 },
          { x: 50, y: 0, z: 0.5 },
          { x: 0, y: 10, z: 0 },
          { x: 10, y: 10, z: 0.1 },
          { x: 20, y: 10, z: 0.2 },
          { x: 30, y: 10, z: 0.3 },
          { x: 40, y: 10, z: 0.4 },
          { x: 50, y: 10, z: 0.5 },
        ];

        const result = applyProbeCompensation(gcode, probeData);

        // Expected: First point + 10 subdivided segments
        expect(result).toEqual([
          'G0 X0.000 Y0.000 Z0.000',
          'G0 X5.000 Y0.000 Z0.050',
          'G0 X10.000 Y0.000 Z0.100',
          'G0 X15.000 Y0.000 Z0.150',
          'G0 X20.000 Y0.000 Z0.200',
          'G0 X25.000 Y0.000 Z0.250',
          'G0 X30.000 Y0.000 Z0.300',
          'G0 X35.000 Y0.000 Z0.350',
          'G0 X40.000 Y0.000 Z0.400',
          'G0 X45.000 Y0.000 Z0.450',
          'G0 X50.000 Y0.000 Z0.500',
        ].join('\n'));
      });

      test('should not over-subdivide short moves', () => {
        const gcode = 'G0 X0 Y0 Z0\nG0 X2 Y0 Z0';
        // 10mm grid → segment length = 5mm → 2mm move not subdivided (< 5mm)
        const probeData = [
          { x: 0, y: 0, z: 0 },
          { x: 10, y: 0, z: 0.1 },
          { x: 0, y: 10, z: 0 },
          { x: 10, y: 10, z: 0.1 },
        ];

        const result = applyProbeCompensation(gcode, probeData);

        // Short 2mm move should output only 2 points (no subdivision)
        expect(result).toEqual([
          'G0 X0.000 Y0.000 Z0.000',
          'G0 X2.000 Y0.000 Z0.020',
        ].join('\n'));
      });
    });

    describe('output format', () => {
      test('should format coordinates to 3 decimal places', () => {
        const gcode = 'G0 X10.123456 Y20.987654 Z0.555555';
        const probeData = [
          { x: 0, y: 0, z: 0 },
          { x: 10, y: 0, z: 0.1 },
          { x: 0, y: 20, z: 0.2 },
          { x: 10, y: 20, z: 0.15 },
        ];

        const result = applyProbeCompensation(gcode, probeData);

        // All coordinates should be formatted to exactly 3 decimal places
        expect(result).toEqual([
          'G0 X10.123 Y20.988 Z0.707',
        ].join('\n'));
      });

      test('should preserve non-coordinate parameters (F, S, etc)', () => {
        const gcode = 'G1 X0 Y0 Z10 F1000 S5000';
        const probeData = [
          { x: 0, y: 0, z: 2 },
          { x: 10, y: 0, z: 2 },
          { x: 0, y: 10, z: 2 },
          { x: 10, y: 10, z: 2 },
        ];

        const result = applyProbeCompensation(gcode, probeData);

        // Feedrate and spindle speed should be preserved
        expect(result).toEqual([
          'G1 F1000 S5000 X0.000 Y0.000 Z12.000',
        ].join('\n'));
      });
    });

    describe('probe data format', () => {
      test('should extract x,y,z from 9-column format', () => {
        const gcode = 'G0 X10 Y10 Z0';
        const probeData = [
          { x: 0, y: 0, z: 0, a: 1, b: 2, c: 3, u: 4, v: 5, w: 6 },
          { x: 10, y: 0, z: 0.1, a: 1, b: 2, c: 3, u: 4, v: 5, w: 6 },
          { x: 0, y: 10, z: 0.2, a: 1, b: 2, c: 3, u: 4, v: 5, w: 6 },
          { x: 10, y: 10, z: 0.15, a: 1, b: 2, c: 3, u: 4, v: 5, w: 6 },
        ];

        const result = applyProbeCompensation(gcode, probeData);

        // Should apply compensation using only x,y,z (a,b,c,u,v,w ignored)
        expect(result).toEqual([
          'G0 X10.000 Y10.000 Z0.150',
        ].join('\n'));
      });
    });
  });
});
