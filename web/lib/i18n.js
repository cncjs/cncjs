import i18n from 'i18next';
import sha1 from 'sha1';

i18n._ = function() {
    let args = Array.prototype.slice.call(arguments);
    if ((args.length === 0) || (typeof args[0] === 'undefined')) {
        i18n.t.apply(i18n, args);
        return;
    }

    let value = args[0];
    let options = args[1] || {};
    let key = sha1(value);
    args[0] = value;

    options.defaultValue = value;

    return i18n.t(key, options);
};

export default i18n;
