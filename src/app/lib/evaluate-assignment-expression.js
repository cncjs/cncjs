import _set from 'lodash/set';
import { parse } from 'esprima';
import evaluateExpression from './evaluate-expression';
import logger from './logger';

const log = logger('evaluate-assignment-expression');

const isStaticMemberExpression = (node) => typeof node === 'object' && node.type === 'MemberExpression' && !node.computed;
const isComputedMemberExpression = (node) => typeof node === 'object' && node.type === 'MemberExpression' && !!node.computed;

const lookupObjectPath = (node, context) => {
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
        return [...lookupObjectPath(node.object, context), evaluateExpression(node.property, context)];
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
            return [...lookupObjectPath(node.object, context), node.property.name];
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
            return [...lookupObjectPath(node.object, context), node.property.value];
        }

        return [...lookupObjectPath(node.object, context), evaluateExpression(node.property, context)];
    }

    return [node.name];
};

const walkAssignmentExpression = (node, context) => {
    console.assert(node && node.type === 'AssignmentExpression');

    const path = lookupObjectPath(node.left, context);
    if (path) {
        const value = evaluateExpression(node.right, context);
        _set(context, path, value);
    }
};

const walkSequenceExpression = (node, context) => {
    console.assert(node && node.type === 'SequenceExpression');

    node.expressions.forEach(expr => {
        if (expr.type === 'AssignmentExpression') {
            walkAssignmentExpression(expr, context);
            return;
        }

        evaluateExpression(expr, context);
    });
};

const evaluateAssignmentExpression = (src, context = {}) => {
    if (!src) {
        return context;
    }

    try {
        const ast = parse(src).body[0].expression;

        if (ast.type === 'AssignmentExpression') {
            walkAssignmentExpression(ast, context);
        } else if (ast.type === 'SequenceExpression') {
            walkSequenceExpression(ast, context);
        } else {
            evaluateExpression(ast, context);
        }
    } catch (e) {
        log.error(`src="${src}", context=${JSON.stringify(context)}`);
        log.error(e);
    }

    return context;
};

export default evaluateAssignmentExpression;
