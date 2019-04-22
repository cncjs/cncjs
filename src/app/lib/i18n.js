import sha1 from 'sha1';
import i18next from 'i18next';

const t = (...args) => {
    const key = args[0];
    const options = args[1];

    let text = i18next.t(key, options);
    if (typeof text === 'string' && text.length === 0) {
        text = i18next.t(key, { ...options, lng: 'en' });
    }

    return text;
};

const _ = (...args) => {
    if ((args.length === 0) || (typeof args[0] === 'undefined')) {
        return i18next.t.apply(i18next, args);
    }

    const [value = '', options = {}] = args;
    const key = ((value, options) => {
        const { context, count } = { ...options };
        const containsContext = (context !== undefined) && (context !== null);
        const containsPlural = (typeof count === 'number');
        if (containsContext) {
            value = value + i18next.options.contextSeparator + options.context;
        }
        if (containsPlural) {
            value = value + i18next.options.pluralSeparator + 'plural';
        }
        return sha1(value);
    })(value, options);

    options.defaultValue = value;

    let text = i18next.t(key, options);
    if (typeof text !== 'string' || text.length === 0) {
        text = i18next.t(key, { ...options, lng: 'en' });
    }

    return text;
};

export default {
    t,
    _
};
