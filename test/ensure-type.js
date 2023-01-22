import { test } from 'tap';
import { ensureBoolean, ensureNumber, ensureString } from '../src/server/lib/ensure-type';

test('ensureBoolean', (t) => {
  t.equal(ensureBoolean({}), true);
  t.equal(ensureBoolean(true), true);
  t.equal(ensureBoolean(false), false);
  t.equal(ensureBoolean(0), false);
  t.equal(ensureBoolean(1), true);
  t.equal(ensureBoolean(Infinity), true);
  t.equal(ensureBoolean(-Infinity), true);
  t.equal(ensureBoolean(NaN), false);
  t.equal(ensureBoolean(undefined), false);
  t.equal(ensureBoolean(null), false);
  t.equal(ensureBoolean(''), false);
  t.equal(ensureBoolean(' '), true);
  t.equal(ensureBoolean('foo'), true);

  t.end();
});

test('ensureNumber', (t) => {
  t.ok(Number.isNaN(ensureNumber({})));
  t.equal(ensureNumber(true), 1);
  t.equal(ensureNumber(false), 0);
  t.equal(ensureNumber(0), 0);
  t.equal(ensureNumber(1), 1);
  t.equal(ensureNumber(Infinity), Infinity);
  t.equal(ensureNumber(-Infinity), -Infinity);
  t.ok(Number.isNaN(ensureNumber(NaN)));
  t.equal(ensureNumber(undefined), 0);
  t.equal(ensureNumber(null), 0);
  t.equal(ensureNumber(''), 0);
  t.equal(ensureNumber(' '), 0);
  t.ok(Number.isNaN(ensureNumber('foo')));

  t.end();
});

test('ensureString', (t) => {
  t.equal(ensureString({}), ({}).toString());
  t.equal(ensureString(true), 'true');
  t.equal(ensureString(false), 'false');
  t.equal(ensureString(0), '0');
  t.equal(ensureString(1), '1');
  t.equal(ensureString(Infinity), 'Infinity');
  t.equal(ensureString(-Infinity), '-Infinity');
  t.equal(ensureString(NaN), 'NaN');
  t.equal(ensureString(undefined), '');
  t.equal(ensureString(null), '');
  t.equal(ensureString(''), '');
  t.equal(ensureString(' '), ' ');
  t.equal(ensureString('foo'), 'foo');

  t.end();
});
