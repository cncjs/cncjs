import { test } from 'tap';
import evaluateAssignmentExpression from '../src/server/lib/evaluate-assignment-expression';

test('exceptions', (t) => {
  // Unexpected identifier
  evaluateAssignmentExpression('Not a valid expression');

  t.end();
});

test('expressions', (t) => {
  { // Evaluates expressions with variables
    const vars = {
      wposx: 10,
      wposy: 20,
      wposz: 30,
    };

    // Evaluate assignment expression
    evaluateAssignmentExpression('value = 0.1', vars);
    t.same(vars, {
      wposx: 10,
      wposy: 20,
      wposz: 30,
      value: 0.1,
    });

    // Evaluate sequence expression
    evaluateAssignmentExpression('  _x=(wposx+5), _y = wposy + 5, _z = (wposz+1*5)  ', vars);
    t.same(vars, {
      wposx: 10,
      wposy: 20,
      wposz: 30,
      value: 0.1,
      _x: 15,
      _y: 25,
      _z: 35,
    });
  }

  { // Evaluates expressions containing template literals
    const bar = '0';
    const baz = 1;

    t.test(t => {
      const vars = evaluateAssignmentExpression('bar = "0", baz = 1, foo[bar][baz] = `${bar}${baz}`', { bar, baz }); // eslint-disable-line no-template-curly-in-string
      t.equal(vars.bar, bar);
      t.equal(vars.baz, baz);
      t.equal(vars.foo[bar][baz], '01');
      t.end();
    });

    t.test(t => {
      const vars = evaluateAssignmentExpression('bar = "0", baz = 1, foo[1][`baz`] = baz', { bar, baz });
      t.equal(vars.foo[1].baz, baz);
      t.end();
    });

    t.test(t => {
      const vars = evaluateAssignmentExpression('bar = "0", baz = 1, foo[bar][baz] = `${bar}${baz}`', { bar, baz }); // eslint-disable-line no-template-curly-in-string
      t.equal(vars.foo[bar][baz], `${bar}${baz}`);
      t.end();
    });

    t.test(t => {
      const vars = evaluateAssignmentExpression('bar = "0", baz = 1, foo.bar.baz = `${bar}${baz}`', { bar, baz }); // eslint-disable-line no-template-curly-in-string
      t.equal(vars.foo.bar.baz, `${bar}${baz}`);
      t.end();
    });
  }

  // Set object values with a path string
  t.test(t => {
    const vars = evaluateAssignmentExpression('x.y.z.a.b.c = 1');
    t.equal(vars.x.y.z.a.b.c, 1);
    t.end();
  });

  // Boolean
  t.test(t => {
    const vars = evaluateAssignmentExpression('ok = Boolean(1), notOk = Boolean(0)', { Boolean });
    t.equal(vars.ok, true);
    t.equal(vars.notOk, false);
    t.end();
  });

  // Number
  t.test(t => {
    const vars = evaluateAssignmentExpression('dx = 4000, dy = 3000, dz = 1000, object.volume = Number(dx * dy * dz) || 0', { Number });
    t.equal(vars.dx, 4000);
    t.equal(vars.dy, 3000);
    t.equal(vars.dz, 1000);
    t.equal(vars.object.volume, 4000 * 3000 * 1000);
    t.end();
  });

  // String
  t.test(t => {
    const vars = evaluateAssignmentExpression('value = String(100)', { String });
    t.equal(vars.value, '100');
    t.end();
  });

  // Date
  t.test(t => {
    const now = Date.now();
    const vars = evaluateAssignmentExpression('now = Date.now()', { Date });
    t.ok(vars.now >= now);
    t.end();
  });

  // JSON
  t.test(t => {
    const vars = evaluateAssignmentExpression('global.state.pos = JSON.stringify({ x: 0, y: 0, z: 0 })', { JSON });
    t.equal(vars.global.state.pos, '{"x":0,"y":0,"z":0}');
    t.end();
  });

  // Math
  t.test(t => {
    const vars = evaluateAssignmentExpression('global.value = Math.floor(4.003)', { Math });
    t.equal(vars.global.value, 4);
    t.end();
  });

  // parseInt
  t.test(t => {
    const vars = evaluateAssignmentExpression('binaryValue = parseInt("10000", 2), decimalValue = parseInt("325mm", 10)', { parseInt });
    t.equal(vars.binaryValue, 16);
    t.equal(vars.decimalValue, 325);
    t.end();
  });

  t.end();
});
