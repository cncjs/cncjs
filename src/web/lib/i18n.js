import i18next from 'i18next';
import sha1 from 'sha1';

const translateText = function() {
    let args = Array.prototype.slice.call(arguments);
    if ((args.length === 0) || (typeof args[0] === 'undefined')) {
        i18next.t.apply(i18next, args);
        return;
    }

    let value = args[0];
    let options = args[1] || {};
    let key = sha1(value);
    args[0] = value;

    options.defaultValue = value;

    return i18next.t(key, options);
};

export default {
    _: translateText
};
