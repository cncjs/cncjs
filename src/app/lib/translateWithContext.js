import { parse } from 'esprima';
import evaluate from 'static-eval';
import logger from './logger';

const log = logger('translateWithContext');
const re = new RegExp(/\[[^\]]+\]/g);

const translateWithContext = (data, context = {}) => {
    if (typeof data !== 'string') {
        return '';
    }

    try {
        data = data.replace(re, (match) => {
            const expr = match.slice(1, -1);
            const ast = parse(expr).body[0].expression;
            const value = evaluate(ast, context);
            return value !== undefined ? value : match;
        });
    } catch (e) {
        log.error(`translateWithContext: data="${data}", context=${context}`);
        log.error(e);
    }

    return data;
};

export default translateWithContext;
