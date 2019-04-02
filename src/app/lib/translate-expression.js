import { parse } from 'esprima';
import evaluate from 'static-eval';
import logger from './logger';

const log = logger('translate-expression');
const re = new RegExp(/\[[^\]]+\]/g);

const translateExpression = (data, context = {}) => {
    if (!data) {
        return '';
    }

    try {
        data = String(data).replace(re, (match) => {
            const expr = match.slice(1, -1);
            const ast = parse(expr).body[0].expression;
            const value = evaluate(ast, context);
            return value !== undefined ? value : match;
        });
    } catch (e) {
        log.error(`translateExpression: data="${data}", context=${JSON.stringify(context)}`);
        log.error(e);
    }

    return data;
};

export default translateExpression;
