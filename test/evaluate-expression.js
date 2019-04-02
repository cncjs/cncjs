import { test } from 'tap';
import logger from '../src/app/lib/logger';
import evaluateExpression from '../src/app/lib/evaluate-expression';

test('exceptions', (t) => {
    // Suppress the output
    const silent = logger.logger.silent;
    logger.logger.silent = true;

    // Unexpected identifier
    evaluateExpression('Not a valid expression');

    // Restore to previous default
    logger.logger.silent = silent;

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
        evaluateExpression('value = 0.1', vars);
        t.same(vars, {
            wposx: 10,
            wposy: 20,
            wposz: 30,
            value: 0.1,
        });

        // Evaluate sequence expression
        evaluateExpression('  _x=(wposx+5), _y = wposy + 5, _z = (wposz+1*5)  ', vars);
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
        const bar = "0";
        const baz = 1;

        t.test(t => {
            const vars = evaluateExpression('bar = "0", baz = 1, foo[bar][baz] = `${bar}${baz}`', { bar, baz });
            t.equal(vars.bar, bar);
            t.equal(vars.baz, baz);
            t.equal(vars.foo[bar][baz], '01');
            t.end();
        });

        t.test(t => {
            const vars = evaluateExpression('bar = "0", baz = 1, foo[1][`baz`] = baz', { bar, baz });
            t.equal(vars.foo[1][`baz`], baz);
            t.end();
        });

        t.test(t => {
            const vars = evaluateExpression('bar = "0", baz = 1, foo[bar][baz] = `${bar}${baz}`', { bar, baz });
            t.equal(vars.foo[bar][baz], `${bar}${baz}`);
            t.end();
        });

        t.test(t => {
            const vars = evaluateExpression('bar = "0", baz = 1, foo.bar.baz = `${bar}${baz}`', { bar, baz });
            t.equal(vars.foo.bar.baz, `${bar}${baz}`);
            t.end();
        });
    }

    { // Sets the value at path of object
        t.test(t => {
            const vars = evaluateExpression('x.y.z.a.b.c = 1');
            t.equal(vars.x.y.z.a.b.c, 1);
            t.end();
        });

        t.test(t => {
            const vars = evaluateExpression('dx = 4000, dy = 3000, dz = 1000, global.volume = dx * dy * dz');
            t.equal(vars.dx, 4000);
            t.equal(vars.dy, 3000);
            t.equal(vars.dz, 1000);
            t.equal(vars.global.volume, 4000 * 3000 * 1000);
            t.end();
        });
    }

    t.end();
});
