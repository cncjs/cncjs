import React, { Component } from 'react';
import shallowCompare from 'react-addons-shallow-compare';
import Toolbar from './Toolbar';
import DisplayPanel from './DisplayPanel';
import ControlPanel from './ControlPanel';

class Axes extends Component {
    shouldComponentUpdate(nextProps, nextState) {
        return shallowCompare(this, nextProps, nextState);
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
