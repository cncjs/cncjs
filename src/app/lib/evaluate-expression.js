/* eslint no-bitwise: 0 */
import { generate } from 'escodegen';
import { parse } from 'esprima';
import logger from './logger';

const log = logger('evaluate-expression');

const UNRESOLVED = Symbol('unresolved');

const evaluateExpression = (src, vars) => {
    if (!vars || typeof vars !== 'object') {
        vars = { ...vars };
    }

    const walk = (node) => {
        if (node.type === 'Literal') {
            return node.value;
        }

        if (node.type === 'UnaryExpression') {
            const val = walk(node.argument);
            if (node.operator === '+') {
                return +val;
            }
            if (node.operator === '-') {
                return -val;
            }
            if (node.operator === '~') {
                return ~val;
            }
            if (node.operator === '!') {
                return !val;
            }
            return UNRESOLVED;
        }

        if (node.type === 'ArrayExpression') {
            const xs = [];
            for (let i = 0, l = node.elements.length; i < l; i++) {
                const x = walk(node.elements[i]);
                if (x === UNRESOLVED) {
                    return UNRESOLVED;
                }
                xs.push(x);
            }
            return xs;
        }

        if (node.type === 'ObjectExpression') {
            const obj = {};
            for (let i = 0; i < node.properties.length; i++) {
                const prop = node.properties[i];
                const value = (prop.value === null)
                    ? prop.value
                    : walk(prop.value);
                if (value === UNRESOLVED) {
                    return UNRESOLVED;
                }
                obj[prop.key.value || prop.key.name] = value;
            }
            return obj;
        }

        if (node.type === 'BinaryExpression' || node.type === 'LogicalExpression') {
            const l = walk(node.left);
            if (l === UNRESOLVED) {
                return UNRESOLVED;
            }
            const r = walk(node.right);
            if (r === UNRESOLVED) {
                return UNRESOLVED;
            }
            const op = node.operator;
            if (op === '==') {
                return l == r; // eslint-disable-line eqeqeq
            }
            if (op === '===') {
                return l === r;
            }
            if (op === '!=') {
                return l != r; // eslint-disable-line eqeqeq
            }
            if (op === '!==') {
                return l !== r;
            }
            if (op === '+') {
                return l + r;
            }
            if (op === '-') {
                return l - r;
            }
            if (op === '*') {
                return l * r;
            }
            if (op === '/') {
                return l / r;
            }
            if (op === '%') {
                return l % r;
            }
            if (op === '<') {
                return l < r;
            }
            if (op === '<=') {
                return l <= r;
            }
            if (op === '>') {
                return l > r;
            }
            if (op === '>=') {
                return l >= r;
            }
            if (op === '|') {
                return l | r;
            }
            if (op === '&') {
                return l & r;
            }
            if (op === '^') {
                return l ^ r;
            }
            if (op === '&&') {
                return l && r;
            }
            if (op === '||') {
                return l || r;
            }
            return UNRESOLVED;
        }

        if (node.type === 'Identifier') {
            if (Object.hasOwnProperty.call(vars, node.name)) {
                return vars[node.name];
            }
            return UNRESOLVED;
        }

        if (node.type === 'ThisExpression') {
            if (Object.hasOwnProperty.call(vars, 'this')) {
                return vars['this']; // eslint-disable-line dot-notation
            }
            return UNRESOLVED;
        }

        if (node.type === 'CallExpression') {
            const callee = walk(node.callee);
            if (callee === UNRESOLVED) {
                return UNRESOLVED;
            }
            if (typeof callee !== 'function') {
                return UNRESOLVED;
            }
            let ctx = node.callee.object ? walk(node.callee.object) : UNRESOLVED;
            if (ctx === UNRESOLVED) {
                ctx = null;
            }
            const args = [];
            for (let i = 0, l = node.arguments.length; i < l; i++) {
                const x = walk(node.arguments[i]);
                if (x === UNRESOLVED) {
                    return UNRESOLVED;
                }
                args.push(x);
            }
            return callee.apply(ctx, args);
        }

        if (node.type === 'MemberExpression') {
            const obj = walk(node.object);
            if (obj === UNRESOLVED) {
                return UNRESOLVED;
            }
            if (node.property.type === 'Identifier') {
                return obj[node.property.name];
            }
            const prop = walk(node.property);
            if (prop === UNRESOLVED) {
                return UNRESOLVED;
            }
            return obj[prop];
        }

        if (node.type === 'ConditionalExpression') {
            const val = walk(node.test);
            if (val === UNRESOLVED) {
                return UNRESOLVED;
            }
            return val ? walk(node.consequent) : walk(node.alternate);
        }

        if (node.type === 'ExpressionStatement') {
            const val = walk(node.expression);
            if (val === UNRESOLVED) {
                return UNRESOLVED;
            }
            return val;
        }

        if (node.type === 'ReturnStatement') {
            return walk(node.argument);
        }

        if (node.type === 'FunctionExpression') {
            const bodies = node.body.body;

            // Create a "scope" for our arguments
            const oldVars = {};
            Object.keys(vars).forEach(element => {
                oldVars[element] = vars[element];
            });

            for (let i = 0; i < node.params.length; i++) {
                const key = node.params[i];
                if (key.type !== 'Identifier') {
                    return UNRESOLVED;
                }

                vars[key.name] = null;
            }

            for (let i in bodies) {
                if (walk(bodies[i]) === UNRESOLVED) {
                    return UNRESOLVED;
                }
            }

            // restore the vars and scope after walk
            vars = oldVars;

            const keys = Object.keys(vars);
            const vals = keys.map(key => {
                return vars[key];
            });

            return Function(keys.join(', '), 'return ' + generate(node)).apply(null, vals); // eslint-disable-line no-new-func
        }

        if (node.type === 'TemplateLiteral') {
            let str = '';
            let i = 0;
            for (i = 0; i < node.expressions.length; i++) {
                str += walk(node.quasis[i]);
                str += walk(node.expressions[i]);
            }
            str += walk(node.quasis[i]);
            return str;
        }

        if (node.type === 'TaggedTemplateExpression') {
            const tag = walk(node.tag);
            const quasi = node.quasi;
            const strings = quasi.quasis.map(walk);
            const values = quasi.expressions.map(walk);
            return tag.apply(null, [strings].concat(values));
        }

        if (node.type === 'TemplateElement') {
            return node.value.cooked;
        }

        return UNRESOLVED;
    };

    let result = UNRESOLVED;

    try {
        let ast;

        if (typeof src === 'string') {
            ast = parse(src).body[0].expression;
        } else {
            ast = src;
        }

        result = walk(ast);
    } catch (e) {
        log.error(`src="${src}", vars=${JSON.stringify(vars)}`);
        log.error(e);
    }

    return (result === UNRESOLVED) ? undefined : result;
};

export default evaluateExpression;
