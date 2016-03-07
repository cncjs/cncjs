import i18next from 'i18next';
import sha1 from 'sha1';

const translateText = (...args) => {
    if ((args.length === 0) || (typeof args[0] === 'undefined')) {
        return i18next.t.apply(i18next, args);
    }

    const value = args[0];
    const options = args[1] || {};
    const key = sha1(value);
    args[0] = value;

    options.defaultValue = value;

    return i18next.t(key, options);
};

export default {
    _: translateText
};
