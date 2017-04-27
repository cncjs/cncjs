import get from 'lodash/get';
import esprima from 'esprima';
import evaluate from 'static-eval';
import logger from './logger';

const log = logger('evaluateExpression');

const evaluateExpression = (src, context) => {
    try {
        const ast = esprima.parse(src).body[0].expression;

        if (ast.type === 'SequenceExpression') {
            ast.expressions.forEach((expr) => {
                if (get(expr, 'left.type') === 'Identifier') {
                    const name = get(expr, 'left.name') || '';
                    if (name) {
                        const value = evaluate(expr.right, context);
                        context[name] = value;
                    }
                }
            });
        } else if (ast.type === 'AssignmentExpression') {
            const expr = ast;
            if (get(expr, 'left.type') === 'Identifier') {
                const name = get(expr, 'left.name') || '';
                if (name) {
                    const value = evaluate(expr.right, context);
                    context[name] = value;
                }
            }
        }
    } catch (e) {
        log.error(e);
    }
};

export default evaluateExpression;
