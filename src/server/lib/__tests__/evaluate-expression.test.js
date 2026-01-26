/* eslint-env jest */
import evaluateExpression from '../evaluate-expression';

describe('evaluateExpression', () => {
  test('resolved expression', () => {
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
    expect(res).toEqual([1, 2, 49, 800, 555]);
  });

  test('unresolved expression', () => {
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
    expect(res).toEqual(undefined);
  });

  test('boolean operations', () => {
    const src = '[ 1===2+3-16/4, [2]==2, [2]!==2, [2]!==[2] ]';
    expect(evaluateExpression(src)).toEqual([true, true, true, true]);
  });

  test('array methods', () => {
    const src = '[1, 2, 3].map(function(n) { return n * 2 })';
    expect(evaluateExpression(src)).toEqual([2, 4, 6]);
  });

  test('array methods with vars', () => {
    const src = '[1, 2, 3].map(function(n) { return n * x })';
    expect(evaluateExpression(src, { x: 2 })).toEqual([2, 4, 6]);
  });

  test('evaluate this', () => {
    const src = 'this.x + this.y.z';
    const res = evaluateExpression(src, {
      'this': {
        x: 1,
        y: {
          z: 100
        }
      }
    });
    expect(res).toEqual(101);
  });

  test('unresolved function expression', () => {
    const src = '(function(){console.log("Not Good")})';
    const res = evaluateExpression(src);
    expect(res).toEqual(undefined);
  });

  test('immediate-invoked function expression with a return value', () => {
    const src = '(function(){ return !!x; }(x))';
    const res = evaluateExpression(src, { x: 1 });
    expect(res).toEqual(true);
  });

  test('function property', () => {
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
    expect(res).toEqual([1, 2, 49, 800, 555]);
  });

  test('untagged template strings', () => {
    const src = '`${1},${2 + n},${"4,5"}`'; // eslint-disable-line no-template-curly-in-string
    const res = evaluateExpression(src, {
      n: 6
    });
    expect(res).toEqual('1,8,4,5');
  });

  test('tagged template strings', () => {
    const src = 'taggedTemplate`${1},${2 + n},${"4,5"}`'; // eslint-disable-line no-template-curly-in-string
    const res = evaluateExpression(src, {
      taggedTemplate: function (strings, ...values) {
        expect(strings).toEqual(['', ',', ',', '']);
        expect(values).toEqual([1, 8, '4,5']);
        return 'foo';
      },
      n: 6
    });

    expect(res).toEqual('foo');
  });
});
