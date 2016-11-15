import _ from 'lodash';
import React, { Component, PropTypes } from 'react';
import shallowCompare from 'react-addons-shallow-compare';
import PressAndHold from '../../components/PressAndHold';
import controller from '../../lib/controller';
import DigitalReadout from './DigitalReadout';
import styles from './index.styl';

class Overrides extends Component {
    static propTypes = {
        state: PropTypes.object,
        actions: PropTypes.object
    };

    shouldComponentUpdate(nextProps, nextState) {
        return shallowCompare(this, nextProps, nextState);
    }
    render() {
        const { state } = this.props;
        const none = '–';
        const controllerState = state.controller.state || {};
        const ov = _.get(controllerState, 'status.ov', []);
        const ovF = ov[0] ? ov[0] + '%' : none;
        const ovR = ov[1] ? ov[1] + '%' : none;
        const ovS = ov[2] ? ov[2] + '%' : none;

        return (
            <div className={styles.overrides}>
                <DigitalReadout label="F" value={ovF}>
                    <PressAndHold
                        type="button"
                        className="btn btn-default"
                        onClick={() => {
                            controller.write('\x93');
                        }}
                    >
                        +1%
                    </PressAndHold>
                    <PressAndHold
                        type="button"
                        className="btn btn-default"
                        onClick={() => {
                            controller.write('\x94');
                        }}
                    >
                        -1%
                    </PressAndHold>
                    <PressAndHold
                        type="button"
                        className="btn btn-default"
                        onClick={() => {
                            controller.write('\x91');
                        }}
                    >
                        +10%
                    </PressAndHold>
                    <PressAndHold
                        type="button"
                        className="btn btn-default"
                        onClick={() => {
                            controller.write('\x92');
                        }}
                    >
                        -10%
                    </PressAndHold>
                    <button
                        type="button"
                        className="btn btn-default"
                        onClick={() => {
                            controller.write('\x90');
                        }}
                    >
                        <i className="fa fa-fw fa-undo" />
                    </button>
                </DigitalReadout>
                <DigitalReadout label="R" value={ovR}>
                    <button
                        type="button"
                        className="btn btn-default"
                        onClick={() => {
                            controller.write('\x97');
                        }}
                    >
                        25%
                    </button>
                    <button
                        type="button"
                        className="btn btn-default"
                        onClick={() => {
                            controller.write('\x96');
                        }}
                    >
                        50%
                    </button>
                    <button
                        type="button"
                        className="btn btn-default"
                        onClick={() => {
                            controller.write('\x95');
                        }}
                    >
                        100%
                    </button>
                </DigitalReadout>
                <DigitalReadout label="S" value={ovS}>
                    <PressAndHold
                        type="button"
                        className="btn btn-default"
                        onClick={() => {
                            controller.write('\x9c');
                        }}
                    >
                        +1%
                    </PressAndHold>
                    <PressAndHold
                        type="button"
                        className="btn btn-default"
                        onClick={() => {
                            controller.write('\x9d');
                        }}
                    >
                        -1%
                    </PressAndHold>
                    <PressAndHold
                        type="button"
                        className="btn btn-default"
                        onClick={() => {
                            controller.write('\x9a');
                        }}
                    >
                        +10%
                    </PressAndHold>
                    <PressAndHold
                        type="button"
                        className="btn btn-default"
                        onClick={() => {
                            controller.write('\x9b');
                        }}
                    >
                        -10%
                    </PressAndHold>
                    <button
                        type="button"
                        className="btn btn-default"
                        onClick={() => {
                            controller.write('\x99');
                        }}
                    >
                        <i className="fa fa-fw fa-undo" />
                    </button>
                </DigitalReadout>
            </div>
        );
    }
}

export default Overrides;
