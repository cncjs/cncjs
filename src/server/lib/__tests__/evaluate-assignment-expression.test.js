/* eslint-env jest */
import evaluateAssignmentExpression from '../evaluate-assignment-expression';

describe('evaluateAssignmentExpression', () => {
  test('exceptions - handles invalid expressions', () => {
    // Should not throw
    evaluateAssignmentExpression('Not a valid expression');
  });

  describe('basic expressions', () => {
    test('evaluates expressions with variables', () => {
      const vars = {
        wposx: 10,
        wposy: 20,
        wposz: 30,
      };

      // Evaluate assignment expression
      evaluateAssignmentExpression('value = 0.1', vars);
      expect(vars).toEqual({
        wposx: 10,
        wposy: 20,
        wposz: 30,
        value: 0.1,
      });

      // Evaluate sequence expression
      evaluateAssignmentExpression('  _x=(wposx+5), _y = wposy + 5, _z = (wposz+1*5)  ', vars);
      expect(vars).toEqual({
        wposx: 10,
        wposy: 20,
        wposz: 30,
        value: 0.1,
        _x: 15,
        _y: 25,
        _z: 35,
      });
    });

    test('set object values with a path string', () => {
      const vars = evaluateAssignmentExpression('x.y.z.a.b.c = 1');
      expect(vars.x.y.z.a.b.c).toEqual(1);
    });
  });

  describe('template literals', () => {
    const bar = '0';
    const baz = 1;

    test('template literals with property access', () => {
      const vars = evaluateAssignmentExpression('bar = "0", baz = 1, foo[bar][baz] = `${bar}${baz}`', { bar, baz }); // eslint-disable-line no-template-curly-in-string
      expect(vars.bar).toEqual(bar);
      expect(vars.baz).toEqual(baz);
      expect(vars.foo[bar][baz]).toEqual('01');
    });

    test('template literals with dynamic keys', () => {
      const vars = evaluateAssignmentExpression('bar = "0", baz = 1, foo[1][`baz`] = baz', { bar, baz });
      expect(vars.foo[1].baz).toEqual(baz);
    });

    test('template literals in nested objects', () => {
      const vars = evaluateAssignmentExpression('bar = "0", baz = 1, foo[bar][baz] = `${bar}${baz}`', { bar, baz }); // eslint-disable-line no-template-curly-in-string
      expect(vars.foo[bar][baz]).toEqual(`${bar}${baz}`);
    });

    test('template literals with dot notation', () => {
      const vars = evaluateAssignmentExpression('bar = "0", baz = 1, foo.bar.baz = `${bar}${baz}`', { bar, baz }); // eslint-disable-line no-template-curly-in-string
      expect(vars.foo.bar.baz).toEqual(`${bar}${baz}`);
    });
  });

  describe('built-in functions', () => {
    test('Boolean', () => {
      const vars = evaluateAssignmentExpression('ok = Boolean(1), notOk = Boolean(0)', { Boolean });
      expect(vars.ok).toEqual(true);
      expect(vars.notOk).toEqual(false);
    });

    test('Number', () => {
      const vars = evaluateAssignmentExpression('dx = 4000, dy = 3000, dz = 1000, object.volume = Number(dx * dy * dz) || 0', { Number });
      expect(vars.dx).toEqual(4000);
      expect(vars.dy).toEqual(3000);
      expect(vars.dz).toEqual(1000);
      expect(vars.object.volume).toEqual(4000 * 3000 * 1000);
    });

    test('String', () => {
      const vars = evaluateAssignmentExpression('value = String(100)', { String });
      expect(vars.value).toEqual('100');
    });

    test('Date', () => {
      const now = Date.now();
      const vars = evaluateAssignmentExpression('now = Date.now()', { Date });
      expect(vars.now).toBeGreaterThanOrEqual(now);
    });

    test('JSON', () => {
      const vars = evaluateAssignmentExpression('global.state.pos = JSON.stringify({ x: 0, y: 0, z: 0 })', { JSON });
      expect(vars.global.state.pos).toEqual('{"x":0,"y":0,"z":0}');
    });

    test('Math', () => {
      const vars = evaluateAssignmentExpression('global.value = Math.floor(4.003)', { Math });
      expect(vars.global.value).toEqual(4);
    });

    test('parseInt', () => {
      const vars = evaluateAssignmentExpression('binaryValue = parseInt("10000", 2), decimalValue = parseInt("325mm", 10)', { parseInt });
      expect(vars.binaryValue).toEqual(16);
      expect(vars.decimalValue).toEqual(325);
    });
  });
});
