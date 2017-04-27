import { test } from 'tap';
import translateWithContext from '../src/app/lib/translateWithContext';

test('translateWithContext', (t) => {
    const data = 'G0 X[_x] Y[_y]\nG4 P[delay]\nG0 Z[_z]';
    const context = {
        _x: 10,
        _y: 20,
        _z: 30,
        delay: 1000
    };

    const found = translateWithContext(data, context);
    const wanted = 'G0 X10 Y20\nG4 P1000\nG0 Z30';
    t.equal(found, wanted);

    t.end();
});
