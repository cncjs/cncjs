import { test } from 'tap';
import evaluateExpression from '../src/server/lib/evaluate-expression';

test('exceptions', (t) => {
    // Unexpected identifier
    evaluateExpression('Not a valid expression');

    t.end();
});

test('expressions', (t) => {
    const context = {
        wposx: 10,
        wposy: 20,
        wposz: 30
    };

    evaluateExpression(' _a = 0.1', context);
    t.same(context, {
        wposx: 10,
        wposy: 20,
        wposz: 30,
        _a: 0.1
    });

    evaluateExpression('  _x=(wposx+5), _y = wposy + 5, _z = (wposz+1*5)  ', context);
    t.same(context, {
        wposx: 10,
        wposy: 20,
        wposz: 30,
        _x: 15,
        _y: 25,
        _z: 35,
        _a: 0.1
    });

    t.end();
});
