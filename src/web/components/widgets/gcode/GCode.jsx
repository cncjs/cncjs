import _ from 'lodash';
import React, { Component, PropTypes } from 'react';
import GCodeStats from './GCodeStats';
import GCodeTable from './GCodeTable';

class GCode extends Component {
    static propTypes = {
        state: PropTypes.object,
        actions: PropTypes.object
    };

    shouldComponentUpdate(nextProps, nextState) {
        return !_.isEqual(nextProps, this.props);
    }
    render() {
        const { state } = this.props;
        const { lines, sent } = state;

        return (
            <div>
                <GCodeStats {...this.props} />
            {_.size(lines) > 0 &&
                <GCodeTable rows={lines} scrollToRows={sent} />
            }
            </div>
        );
    }
}

export default GCode;
