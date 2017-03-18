const ensureArray = (...args) => {
    if (args.length === 0 || args[0] === undefined || args[0] === null) {
        return [];
    }

    return [].concat(args);
};

export default ensureArray;
