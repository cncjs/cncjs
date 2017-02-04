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
        const [ovF = '', ovR = '', ovS = ''] = ov;

        return (
            <div className={styles.overrides}>
                <DigitalReadout label="F" value={ovF + '%'}>
                    <RepeatButton
                        className="btn btn-default"
                        style={{ padding: 5 }}
                        onClick={() => {
                            controller.command('feedOverride', 10);
                        }}
                    >
                        <i className="fa fa-arrow-up fa-fw" />10%
                    </RepeatButton>
                    <RepeatButton
                        className="btn btn-default"
                        style={{ padding: 5 }}
                        onClick={() => {
                            controller.command('feedOverride', -10);
                        }}
                    >
                        <i className="fa fa-arrow-down fa-fw" />10%
                    </RepeatButton>
                    <RepeatButton
                        className="btn btn-default"
                        style={{ padding: 5 }}
                        onClick={() => {
                            controller.command('feedOverride', 1);
                        }}
                    >
                        <i className="fa fa-arrow-up fa-fw" />1%
                    </RepeatButton>
                    <RepeatButton
                        className="btn btn-default"
                        style={{ padding: 5 }}
                        onClick={() => {
                            controller.command('feedOverride', -1);
                        }}
                    >
                        <i className="fa fa-arrow-down fa-fw" />1%
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
                <DigitalReadout label="S" value={ovS + '%'}>
                    <RepeatButton
                        className="btn btn-default"
                        style={{ padding: 5 }}
                        onClick={() => {
                            controller.command('spindleOverride', 10);
                        }}
                    >
                        <i className="fa fa-arrow-up fa-fw" />10%
                    </RepeatButton>
                    <RepeatButton
                        className="btn btn-default"
                        style={{ padding: 5 }}
                        onClick={() => {
                            controller.command('spindleOverride', -10);
                        }}
                    >
                        <i className="fa fa-arrow-down fa-fw" />10%
                    </RepeatButton>
                    <RepeatButton
                        className="btn btn-default"
                        style={{ padding: 5 }}
                        onClick={() => {
                            controller.command('spindleOverride', 1);
                        }}
                    >
                        <i className="fa fa-arrow-up fa-fw" />1%
                    </RepeatButton>
                    <RepeatButton
                        className="btn btn-default"
                        style={{ padding: 5 }}
                        onClick={() => {
                            controller.command('spindleOverride', -1);
                        }}
                    >
                        <i className="fa fa-arrow-down fa-fw" />1%
                    </RepeatButton>
                    <button
                        type="button"
                        className="btn btn-default"
                        style={{ padding: 5 }}
                        onClick={() => {
                            controller.command('spindleOverride', 0);
                        }}
                    >
                        <i className="fa fa-fw fa-undo" />
                    </button>
                </DigitalReadout>
                <DigitalReadout label="R" value={ovR + '%'}>
                    <button
                        type="button"
                        className="btn btn-default"
                        onClick={() => {
                            controller.command('rapidOverride', 100);
                        }}
                    >
                        <i className="fa fa-battery-full" />
                        <span className="space" />
                        100%
                    </button>
                    <button
                        type="button"
                        className="btn btn-default"
                        onClick={() => {
                            controller.command('rapidOverride', 50);
                        }}
                    >
                        <i className="fa fa-battery-half" />
                        <span className="space" />
                        50%
                    </button>
                    <button
                        type="button"
                        className="btn btn-default"
                        onClick={() => {
                            controller.command('rapidOverride', 25);
                        }}
                    >
                        <i className="fa fa-battery-quarter" />
                        <span className="space" />
                        25%
                    </button>
                </DigitalReadout>
            </div>
        );
    }
}

export default Overrides;
