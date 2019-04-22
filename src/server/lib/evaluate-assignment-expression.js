import _set from 'lodash/set';
import { parse } from 'esprima';
import evaluateExpression from './evaluate-expression';
import logger from './logger';

const log = logger('evaluate-assignment-expression');

const isStaticMemberExpression = (node) => typeof node === 'object' && node.type === 'MemberExpression' && !node.computed;
const isComputedMemberExpression = (node) => typeof node === 'object' && node.type === 'MemberExpression' && !!node.computed;

const lookupObjectPath = (node, vars) => {
    if (!node) {
        return [];
    }

    /*
     * Expression: 'x = value'
     *
     * Identifier { type: 'Identifier', name: 'x' }
     */
    if (node.type === 'Identifier') {
        return [node.name];
    }

    if (isComputedMemberExpression(node)) {
        return [...lookupObjectPath(node.object, vars), evaluateExpression(node.property, vars)];
    }

    if (isStaticMemberExpression(node)) {
        /*
         * Expression: 'x.y = value'
         *
         * StaticMemberExpression {
         *   type: 'MemberExpression',
         *   computed: false,
         *   object: Identifier { type: 'Identifier', name: 'x' },
         *   property: Identifier { type: 'Identifier', name: 'y' }
         * }
         *
         * Expression: 'x[y] = value'
         *
         * ComputedMemberExpression {
         *   type: 'MemberExpression',
         *   computed: true,
         *   object: Identifier { type: 'Identifier', name: 'x' },
         *   property: Identifier { type: 'Identifier', name: 'y' }
         * }
         */
        if (node.property.type === 'Identifier') {
            return [...lookupObjectPath(node.object, vars), node.property.name];
        }

        /*
         * Expression: 'x["y"] = value'
         *
         * ComputedMemberExpression {
         *   type: 'MemberExpression',
         *   computed: true,
         *   object: Identifier { type: 'Identifier', name: 'x' },
         *   property: Literal { type: 'Literal', value: 'y', raw: '"y"' }
         * }
         */
        if (node.property.type === 'Literal') {
            return [...lookupObjectPath(node.object, vars), node.property.value];
        }

        return [...lookupObjectPath(node.object, vars), evaluateExpression(node.property, vars)];
    }

    return [node.name];
};

const walkAssignmentExpression = (node, vars) => {
    console.assert(node && node.type === 'AssignmentExpression');

    const path = lookupObjectPath(node.left, vars);
    if (path) {
        const value = evaluateExpression(node.right, vars);
        _set(vars, path, value);
    }
};

const walkSequenceExpression = (node, vars) => {
    console.assert(node && node.type === 'SequenceExpression');

    node.expressions.forEach(expr => {
        if (expr.type === 'AssignmentExpression') {
            walkAssignmentExpression(expr, vars);
            return;
        }

        evaluateExpression(expr, vars);
    });
};

const evaluateAssignmentExpression = (src, vars = {}) => {
    if (!src) {
        return vars;
    }

    try {
        const ast = parse(src).body[0].expression;

        if (ast.type === 'AssignmentExpression') {
            walkAssignmentExpression(ast, vars);
        } else if (ast.type === 'SequenceExpression') {
            walkSequenceExpression(ast, vars);
        } else {
            evaluateExpression(ast, vars);
        }
    } catch (e) {
        log.error(`src="${src}", vars=${JSON.stringify(vars)}`);
        log.error(e);
    }

    return vars;
};

export default evaluateAssignmentExpression;
