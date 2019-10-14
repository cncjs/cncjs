import PropTypes from 'prop-types';
import React, { Component } from 'react';
import GCodeStats from './GCodeStats';

class GCode extends Component {
    static propTypes = {
        state: PropTypes.object,
        actions: PropTypes.object
    };

    render() {
        return (
            <GCodeStats {...this.props} />
        );
    }
}

export default GCode;
