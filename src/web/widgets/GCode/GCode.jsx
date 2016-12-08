import _ from 'lodash';
import React, { Component, PropTypes } from 'react';
import shallowCompare from 'react-addons-shallow-compare';
import GCodeStats from './GCodeStats';
import GCodeTable from './GCodeTable';

class GCode extends Component {
    static propTypes = {
        state: PropTypes.object,
        actions: PropTypes.object
    };

    shouldComponentUpdate(nextProps, nextState) {
        return shallowCompare(this, nextProps, nextState);
    }
    render() {
        const { state } = this.props;
        const { lines, received } = state;

        return (
            <div>
                <GCodeStats {...this.props} />
                {_.size(lines) > 0 &&
                <GCodeTable rows={lines} scrollToRow={received} />
                }
            </div>
        );
    }
}

export default GCode;
