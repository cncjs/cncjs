const shallowEqualArrays = (arrA, arrB) => {
    if (arrA === arrB) {
        return true;
    }

    const len = arrA.length;

    if (arrB.length !== len) {
        return false;
    }

    for (let i = 0; i < len; i++) {
        if (arrA[i] !== arrB[i]) {
            return false;
        }
    }

    return true;
};

export default shallowEqualArrays;
