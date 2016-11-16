import _ from 'lodash';
import React, { Component, PropTypes } from 'react';
import shallowCompare from 'react-addons-shallow-compare';
import RepeatButton from '../../components/RepeatButton';
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
        const controllerState = state.controller.state || {};
        const ov = _.get(controllerState, 'status.ov', []);
        const ovF = ov[0] ? ov[0] + '%' : '';
        const ovR = ov[1] ? ov[1] + '%' : '';
        const ovS = ov[2] ? ov[2] + '%' : '';

        return (
            <div className={styles.overrides}>
                <DigitalReadout label="F" value={ovF}>
                    <RepeatButton
                        className="btn btn-default"
                        onClick={() => {
                            controller.write('\x93');
                        }}
                    >
                        +1%
                    </RepeatButton>
                    <RepeatButton
                        className="btn btn-default"
                        onClick={() => {
                            controller.write('\x94');
                        }}
                    >
                        -1%
                    </RepeatButton>
                    <RepeatButton
                        className="btn btn-default"
                        onClick={() => {
                            controller.write('\x91');
                        }}
                    >
                        +10%
                    </RepeatButton>
                    <RepeatButton
                        className="btn btn-default"
                        onClick={() => {
                            controller.write('\x92');
                        }}
                    >
                        -10%
                    </RepeatButton>
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
                    <RepeatButton
                        className="btn btn-default"
                        onClick={() => {
                            controller.write('\x9c');
                        }}
                    >
                        +1%
                    </RepeatButton>
                    <RepeatButton
                        className="btn btn-default"
                        onClick={() => {
                            controller.write('\x9d');
                        }}
                    >
                        -1%
                    </RepeatButton>
                    <RepeatButton
                        className="btn btn-default"
                        onClick={() => {
                            controller.write('\x9a');
                        }}
                    >
                        +10%
                    </RepeatButton>
                    <RepeatButton
                        className="btn btn-default"
                        onClick={() => {
                            controller.write('\x9b');
                        }}
                    >
                        -10%
                    </RepeatButton>
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
