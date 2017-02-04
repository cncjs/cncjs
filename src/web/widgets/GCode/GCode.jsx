import React, { Component, PropTypes } from 'react';
import shallowCompare from 'react-addons-shallow-compare';
import GCodeStats from './GCodeStats';

class GCode extends Component {
    static propTypes = {
        state: PropTypes.object,
        actions: PropTypes.object
    };

    shouldComponentUpdate(nextProps, nextState) {
        return shallowCompare(this, nextProps, nextState);
    }
    render() {
        return (
            <GCodeStats {...this.props} />
        );
    }
}

export default GCode;
