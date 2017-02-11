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
        const ovF = _.get(controllerState, 'status.ovF');
        const ovS = _.get(controllerState, 'status.ovS');

        return (
            <div className={styles.overrides}>
                <DigitalReadout label="F" value={ovF !== undefined ? ovF + '%' : ''}>
                    <RepeatButton
                        className="btn btn-default"
                        style={{ padding: 5 }}
                        onClick={() => {
                            controller.command('feedOverride', -10);
                        }}
                    >
                        <i className="fa fa-arrow-down" style={{ fontSize: 14 }} />
                        <span style={{ marginLeft: 5 }}>
                            -10%
                        </span>
                    </RepeatButton>
                    <RepeatButton
                        className="btn btn-default"
                        style={{ padding: 5 }}
                        onClick={() => {
                            controller.command('feedOverride', -1);
                        }}
                    >
                        <i className="fa fa-arrow-down" style={{ fontSize: 10 }} />
                        <span style={{ marginLeft: 5 }}>
                            -1%
                        </span>
                    </RepeatButton>
                    <RepeatButton
                        className="btn btn-default"
                        style={{ padding: 5 }}
                        onClick={() => {
                            controller.command('feedOverride', 1);
                        }}
                    >
                        <i className="fa fa-arrow-up" style={{ fontSize: 10 }} />
                        <span style={{ marginLeft: 5 }}>
                            1%
                        </span>
                    </RepeatButton>
                    <RepeatButton
                        className="btn btn-default"
                        style={{ padding: 5 }}
                        onClick={() => {
                            controller.command('feedOverride', 10);
                        }}
                    >
                        <i className="fa fa-arrow-up" style={{ fontSize: 14 }} />
                        <span style={{ marginLeft: 5 }}>
                            10%
                        </span>
                    </RepeatButton>
                    <button
                        type="button"
                        className="btn btn-default"
                        style={{ padding: 5 }}
                        onClick={() => {
                            controller.command('feedOverride', 0);
                        }}
                    >
                        <i className="fa fa-undo fa-fw" />
                    </button>
                </DigitalReadout>
                <DigitalReadout label="S" value={ovS !== undefined ? ovS + '%' : ''}>
                    <RepeatButton
                        className="btn btn-default"
                        style={{ padding: 5 }}
                        onClick={() => {
                            controller.command('spindleOverride', -10);
                        }}
                    >
                        <i className="fa fa-arrow-down" style={{ fontSize: 14 }} />
                        <span style={{ marginLeft: 5 }}>
                            -10%
                        </span>
                    </RepeatButton>
                    <RepeatButton
                        className="btn btn-default"
                        style={{ padding: 5 }}
                        onClick={() => {
                            controller.command('spindleOverride', -1);
                        }}
                    >
                        <i className="fa fa-arrow-down" style={{ fontSize: 10 }} />
                        <span style={{ marginLeft: 5 }}>
                            -1%
                        </span>
                    </RepeatButton>
                    <RepeatButton
                        className="btn btn-default"
                        style={{ padding: 5 }}
                        onClick={() => {
                            controller.command('spindleOverride', 1);
                        }}
                    >
                        <i className="fa fa-arrow-up" style={{ fontSize: 10 }} />
                        <span style={{ marginLeft: 5 }}>
                            1%
                        </span>
                    </RepeatButton>
                    <RepeatButton
                        className="btn btn-default"
                        style={{ padding: 5 }}
                        onClick={() => {
                            controller.command('spindleOverride', 10);
                        }}
                    >
                        <i className="fa fa-arrow-up" style={{ fontSize: 14 }} />
                        <span style={{ marginLeft: 5 }}>
                            10%
                        </span>
                    </RepeatButton>
                    <button
                        type="button"
                        className="btn btn-default"
                        style={{ padding: 5 }}
                        onClick={() => {
                            controller.command('spindleOverride', 0);
                        }}
                    >
                        <i className="fa  fa-undo fa-fw" />
                    </button>
                </DigitalReadout>
            </div>
        );
    }
}

export default Overrides;
