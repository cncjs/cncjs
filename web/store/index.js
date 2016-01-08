import _ from 'lodash';

let state;

const defaultState = {
    widgets: {
        connection: {
            port: ''
        },
        axes: {
            jog: {
                step: 10
            }
        },
        probe: {
            probeCommand: 'G38.2',
            probeDepth: 10,
            probeFeedrate: 20,
            tlo: 10,
            retractionDistance: 4
        }
    }
};

try {
    let userState = JSON.parse(localStorage.getItem('state') || {});
    state = _.merge({}, defaultState, userState);
}
catch(err) {
    state = _.merge({}, defaultState);
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
