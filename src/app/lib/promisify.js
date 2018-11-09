/* eslint prefer-arrow-callback: 0 */
const promisify = (fn, options) => function (...args) {
    const {
        errorFirst = true,
        thisArg
    } = { ...options };

    return new Promise((resolve, reject) => {
        args.push(function (...results) {
            if (errorFirst) {
                const err = results.shift();
                if (err) {
                    reject(err);
                    return;
                }
            }

            if (results.length > 1) {
                resolve(results);
            } else if (results.length === 1) {
                resolve(results[0]);
            } else {
                resolve();
            }
        });

        if (typeof fn !== 'function') {
            reject(new TypeError('The first parameter must be a function'));
            return;
        }

        fn.apply(thisArg, args);
    });
};

export default promisify;
