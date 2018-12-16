const shallowEqualObjects = (objA, objB) => {
    if (objA === objB) {
        return true;
    }

    const keysA = Object.keys(objA);
    const keysB = Object.keys(objB);
    const len = keysA.length;

    if (keysB.length !== len) {
        return false;
    }

    for (let i = 0; i < len; i++) {
        const key = keysA[i];
        if (objA[key] !== objB[key]) {
            return false;
        }
    }

    return true;
};

export default shallowEqualObjects;
