import _set from 'lodash/set';
import { parse } from 'esprima';
import evaluate from 'static-eval';
import logger from './logger';

const log = logger('evaluate-expression');

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
        return [...lookupObjectPath(node.object, context), evaluate(node.property, context)];
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

        return [...lookupObjectPath(node.object, context), evaluate(node.property, context)];
    }

    return [node.name];
};

const evaluateAssignmentExpressionWithContext = (node, context) => {
    console.assert(node && node.type === 'AssignmentExpression');

    const path = lookupObjectPath(node.left, context);
    if (path) {
        const value = evaluate(node.right, context);
        _set(context, path, value);
    }
};

const evaluateSequenceExpressionWithContext = (node, context) => {
    console.assert(node && node.type === 'SequenceExpression');

    node.expressions.forEach(expr => {
        if (expr.type === 'AssignmentExpression') {
            evaluateAssignmentExpressionWithContext(expr, context);
            return;
        }

        evaluate(expr, context);
    });
};

const evaluateExpression = (src, context = {}) => {
    if (!src) {
        return context;
    }

    try {
        const ast = parse(src).body[0].expression;

        if (ast.type === 'AssignmentExpression') {
            evaluateAssignmentExpressionWithContext(ast, context);
        } else if (ast.type === 'SequenceExpression') {
            evaluateSequenceExpressionWithContext(ast, context);
        } else {
            evaluate(ast, context);
        }
    } catch (e) {
        log.error(`evaluateExpression: src="${src}", context=${JSON.stringify(context)}`);
        log.error(e);
    }

    return context;
};

export default evaluateExpression;
