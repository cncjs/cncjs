import { test } from 'tap';
import evaluateExpression from '../src/server/lib/evaluate-expression';

test('resolved', (t) => {
  const src = '[1,2,3+4*10+(n||6),foo(3+5),obj[""+"x"].y]';
  const res = evaluateExpression(src, {
    n: false,
    foo: function (x) {
      return x * 100;
    },
    obj: {
      x: {
        y: 555
      }
    }
  });
  t.deepEqual(res, [1, 2, 49, 800, 555]);
  t.end();
});

test('unresolved', (t) => {
  const src = '[1,2,3+4*10*z+n,foo(3+5),obj[""+"x"].y]';
  const res = evaluateExpression(src, {
    n: 6,
    foo: function (x) {
      return x * 100;
    },
    obj: {
      x: {
        y: 555
      }
    }
  });
  t.equal(res, undefined);
  t.end();
});

test('boolean', (t) => {
  const src = '[ 1===2+3-16/4, [2]==2, [2]!==2, [2]!==[2] ]';
  t.deepEqual(evaluateExpression(src), [true, true, true, true]);
  t.end();
});

test('array methods', (t) => {
  const src = '[1, 2, 3].map(function(n) { return n * 2 })';
  t.deepEqual(evaluateExpression(src), [2, 4, 6]);
  t.end();
});

test('array methods with vars', (t) => {
  const src = '[1, 2, 3].map(function(n) { return n * x })';
  t.deepEqual(evaluateExpression(src, { x: 2 }), [2, 4, 6]);
  t.end();
});

test('evaluate this', (t) => {
  const src = 'this.x + this.y.z';
  const res = evaluateExpression(src, {
    'this': {
      x: 1,
      y: {
        z: 100
      }
    }
  });
  t.equal(res, 101);
  t.end();
});

test('unresolved function expression', (t) => {
  const src = '(function(){console.log("Not Good")})';
  const res = evaluateExpression(src);
  t.equal(res, undefined);
  t.end();
});

test('immediate-invoked function expression with a return value', (t) => {
  const src = '(function(){ return !!x; }(x))';
  const res = evaluateExpression(src, { x: 1 });
  t.equal(res, true);
  t.end();
});

test('function property', (t) => {
  const src = '[1,2,3+4*10+n,beep.boop(3+5),obj[""+"x"].y]';
  const res = evaluateExpression(src, {
    n: 6,
    beep: {
      boop: function (x) {
        return x * 100;
      }
    },
    obj: {
      x: {
        y: 555
      }
    }
  });
  t.deepEqual(res, [1, 2, 49, 800, 555]);
  t.end();
});

test('untagged template strings', (t) => {
  const src = '`${1},${2 + n},${"4,5"}`'; // eslint-disable-line no-template-curly-in-string
  const res = evaluateExpression(src, {
    n: 6
  });
  t.deepEqual(res, '1,8,4,5');
  t.end();
});

test('tagged template strings', (t) => {
  const src = 'taggedTemplate`${1},${2 + n},${"4,5"}`'; // eslint-disable-line no-template-curly-in-string
  const res = evaluateExpression(src, {
    taggedTemplate: function (strings, ...values) {
      t.deepEqual(strings, ['', ',', ',', '']);
      t.deepEqual(values, [1, 8, '4,5']);
      return 'foo';
    },
    n: 6
  });
  t.deepEqual(res, 'foo');
  t.end();
});
