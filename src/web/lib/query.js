import { each, reduce } from 'lodash';
import Uri from 'jsuri';

export const toQueryString = (qo, encode = true) => {
    const uri = new Uri();

    each(qo, (value, key) => {
        if (typeof value === 'undefined') {
            return;
        }

        if (encode === false) {
            uri.addQueryParam(key, value);
        } else {
            uri.addQueryParam(key, encodeURIComponent(value));
        }
    });

    return uri.toString().slice(1);
};

export const toQueryObject = (qs) => {
    qs = String(qs || '');
    if (qs[0] !== '?') {
        qs = '?' + qs;
    }
    const uri = new Uri(qs);
    const qo = reduce(uri.queryPairs, (obj, item) => {
        const key = item[0], value = item[1];
        obj[key] = decodeURIComponent(value);
        return obj;
    }, {});

    return qo;
};

export default {
    toQueryString,
    toQueryObject
};
