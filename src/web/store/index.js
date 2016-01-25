import _ from 'lodash';

let state;

// Data Migration from v0.14.5
const migrateState = (userState) => {
    let probeWidget = _.get(userState, 'widgets.probe');

    // probeDepth
    let probeDepth = _.get(userState, 'widgets.probe.probeDepth');
    if (_.isObject(probeDepth)) {
        let value = probeDepth.mm || probeDepth.in;
        delete probeWidget.probeDepth.mm;
        delete probeWidget.probeDepth.in;
        _.set(probeWidget, 'probeDepth', value);
    }

    // probeFeedrate
    let probeFeedrate = _.get(userState, 'widgets.probe.probeFeedrate');
    if (_.isObject(probeFeedrate)) {
        let value = probeFeedrate.mm || probeFeedrate.in;
        delete probeWidget.probeFeedrate.mm;
        delete probeWidget.probeFeedrate.in;
        _.set(probeWidget, 'probeFeedrate', value);
    }

    // tlo
    let tlo = _.get(userState, 'widgets.probe.tlo');
    if (_.isObject(tlo)) {
        let value = tlo.mm || tlo.in;
        delete probeWidget.tlo.mm;
        delete probeWidget.tlo.in;
        _.set(probeWidget, 'tlo', value);
    }

    // retractionDistance
    let retractionDistance = _.get(userState, 'widgets.probe.retractionDistance');
    if (_.isObject(retractionDistance)) {
        let value = retractionDistance.mm || retractionDistance.in;
        delete probeWidget.retractionDistance.mm;
        delete probeWidget.retractionDistance.in;
        _.set(probeWidget, 'retractionDistance', value);
    }
};

const defaultState = {
    widgets: {
        connection: {
            port: '',
            baudrate: 115200,
            autoReconnect: true
        },
        axes: {
            jog: {
                selectedDistance: '1',
                customDistance: 10
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

    migrateState(userState); // for v0.14.5

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
