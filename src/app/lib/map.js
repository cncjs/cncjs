var _ = require('lodash');

/**
 * @example
 *
 * var o = {'aaa':{'bbb':{'ccc':{'ddd':'foo/bar'}}}};
 * > map(o, '['aaa']['bbb']['ccc']['ddd']');
 *   'foo/bar'
 * > map(o, 'aaa['bbb']['ccc']['ddd']');
 *   'foo/bar'
 * > map(o, 'aaa['bbb']['ccc'].ddd');
 *   'foo/bar'
 * > map(o, 'aaa.bbb.ccc.ddd');
 *   'foo/bar'
 */
module.exports = function map(obj, key, value) {
    if (typeof obj !== 'object') {
        return;
    }
    if (typeof key === 'undefined' || key === null) {
        return;
    }
    if (typeof key === 'string' && key.length === 0) {
        return;
    }

    var re = new RegExp(/[\w\-]+|\[[^\]]*\]+/g),
        arr = key.match(re);
    for (var i = 0; i < arr.length; i++) {
        key = _.trim(arr[i], '\'"[]');

        if (typeof value !== 'undefined') {
            if (i === arr.length - 1) {
                break;
            } else if (i < (arr.length - 1)) {
                obj[key] = obj[key] || {};
            }
        }
        if (obj === null || typeof obj === 'undefined' || typeof obj !== 'object') {
            break;
        }
        obj = obj[key];
        if (obj === null || typeof obj === 'undefined') {
            break; // skip null or undefined object
        }
    }
    if (typeof value !== 'undefined') {
        obj[key] = value;
        obj = obj[key];
    }
    return obj;
};
