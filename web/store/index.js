import _ from 'lodash';

let state;

try {
    state = _.extend({}, JSON.parse(localStorage.getItem('state') || {}));
}
catch(err) {
    state = {};
}

const setState = (key, value) => {
    let result = _.set(state, key, value);
    localStorage.setItem('state', JSON.stringify(state));
    return result;
};

const getState = (key, defaultValue) => {
    let value = _.get(state, key);
    return (typeof value !== 'undefined') ? value : defaultValue;
};

const clearState = () => {
    localStorage.setItem('state', JSON.stringify({}));
};

export default {
    setState: setState,
    getState: getState,
    clearState: clearState
};
