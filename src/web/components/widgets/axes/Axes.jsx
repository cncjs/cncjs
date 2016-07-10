import _ from 'lodash';
import React, { Component } from 'react';
import Toolbar from './Toolbar';
import DisplayPanel from './DisplayPanel';
import ControlPanel from './ControlPanel';

class Axes extends Component {
    shouldComponentUpdate(nextProps, nextState) {
        return !_.isEqual(nextProps, this.props);
    }
    render() {
        return (
            <div>
                <Toolbar {...this.props} />
                <DisplayPanel {...this.props} />
                <ControlPanel {...this.props} />
            </div>
        );
    }
}

export default Axes;
