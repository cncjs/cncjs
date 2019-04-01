import { test } from 'tap';
import logger from '../src/server/lib/logger';
import translateExpression from '../src/server/lib/translate-expression';

test('exceptions', (t) => {
    // Suppress the output
    const silent = logger.logger.silent;
    logger.logger.silent = true;

    // Not a string type
    t.equal(translateExpression(0), '');

    // Unexpected end of input
    t.equal(translateExpression('X[!]', {}), 'X[!]');

    // Restore to previous default
    logger.logger.silent = silent;

    t.end();
});

test('expressions', (t) => {
    const data = 'G0 X[_x] Y[_y]\nG4 P[delay]\nG0 Z[_z]';
    const context = {
        _x: 10,
        _y: 20,
        _z: 30,
        delay: 1000
    };

    const found = translateExpression(data, context);
    const wanted = 'G0 X10 Y20\nG4 P1000\nG0 Z30';
    t.equal(found, wanted);

    t.end();
});
