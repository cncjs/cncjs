import evaluateExpression from './evaluate-expression';
import logger from './logger';

const log = logger('translate-expression');
const re = new RegExp(/\[[^\]]+\]/g);

const translateExpression = (data, vars = {}) => {
    if (!data) {
        return '';
    }

    try {
        data = String(data).replace(re, (match) => {
            const src = match.slice(1, -1);
            const value = evaluateExpression(src, vars);
            return value !== undefined ? value : match;
        });
    } catch (e) {
        log.error(`data="${data}", vars=${JSON.stringify(vars)}`);
        log.error(e);
    }

    return data;
};

export default translateExpression;
