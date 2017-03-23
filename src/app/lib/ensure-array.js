const ensureArray = (...args) => {
    if (args.length === 0 || args[0] === undefined || args[0] === null) {
        return [];
    }
    if (args.length === 1) {
        return [].concat(args[0]);
    }
    return [].concat(args);
};

export default ensureArray;
