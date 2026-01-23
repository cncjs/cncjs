/* eslint-env jest */
import translateExpression from '../translate-expression';

describe('translateExpression', () => {
  describe('exceptions', () => {
    test('handles non-string type', () => {
      expect(translateExpression(0)).toEqual('');
    });

    test('handles unexpected end of input', () => {
      expect(translateExpression('X[!]', {})).toEqual('X[!]');
    });
  });

  describe('expressions', () => {
    test('translates variables in G-code', () => {
      const data = 'G0 X[_x] Y[_y]\nG4 P[delay]\nG0 Z[_z]';
      const context = {
        _x: 10,
        _y: 20,
        _z: 30,
        delay: 1000
      };

      const result = translateExpression(data, context);
      const expected = 'G0 X10 Y20\nG4 P1000\nG0 Z30';
      expect(result).toEqual(expected);
    });
  });
});
