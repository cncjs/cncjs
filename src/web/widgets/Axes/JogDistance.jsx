import _ from 'lodash';
import classNames from 'classnames';
import React, { Component, PropTypes } from 'react';
import CSSModules from 'react-css-modules';
import i18n from '../../lib/i18n';
import combokeys from '../../lib/combokeys';
import PressAndHold from '../../components/PressAndHold';
import {
    DISTANCE_MIN,
    DISTANCE_MAX,
    DISTANCE_STEP
} from './constants';
import styles from './index.styl';

@CSSModules(styles)
class JogDistance extends Component {
    static propTypes = {
        state: PropTypes.object,
        actions: PropTypes.object
    };

    actionHandlers = {
        JOG_LEVER_SWITCH: (event) => {
            const { state, actions } = this.props;
            const { selectedDistance } = state;
            const distances = ['1', '0.1', '0.01', '0.001', ''];
            const currentIndex = distances.indexOf(selectedDistance);
            const distance = distances[(currentIndex + 1) % distances.length];
            actions.selectDistance(distance);
        }
    };

    componentDidMount() {
        _.each(this.actionHandlers, (callback, eventName) => {
            combokeys.on(eventName, callback);
        });
    }
    componentWillUnmount() {
        _.each(this.actionHandlers, (callback, eventName) => {
            combokeys.removeListener(eventName, callback);
        });
    }
    shouldComponentUpdate(nextProps, nextState) {
        return !_.isEqual(nextProps, this.props);
    }
    render() {
        const { state, actions } = this.props;
        const { units, selectedDistance, customDistance } = state;
        const distance = String(selectedDistance); // force convert to string
        const isCustomDistanceSelected = !(_.includes(['1', '0.1', '0.01', '0.001'], distance));
        const classes = {
            1: classNames(
                'btn',
                'btn-default',
                { 'btn-select': distance === '1' }
            ),
            0.1: classNames(
                'btn',
                'btn-default',
                { 'btn-select': distance === '0.1' }
            ),
            0.01: classNames(
                'btn',
                'btn-default',
                { 'btn-select': distance === '0.01' }
            ),
            0.001: classNames(
                'btn',
                'btn-default',
                { 'btn-select': distance === '0.001' }
            ),
            custom: classNames(
                'btn',
                'btn-default',
                { 'btn-select': isCustomDistanceSelected }
            )
        };

        return (
            <div styleName="jog-distance-control">
                <div className="input-group input-group-xs">
                    <div className="input-group-btn">
                        <button
                            type="button"
                            className={classes['1']}
                            title={'1 ' + units}
                            onClick={() => actions.selectDistance('1')}
                        >
                            1
                        </button>
                        <button
                            type="button"
                            className={classes['0.1']}
                            title={'0.1 ' + units}
                            onClick={() => actions.selectDistance('0.1')}
                        >
                            0.1
                        </button>
                        <button
                            type="button"
                            className={classes['0.01']}
                            title={'0.01 ' + units}
                            onClick={() => actions.selectDistance('0.01')}
                        >
                            0.01
                        </button>
                        <button
                            type="button"
                            className={classes['0.001']}
                            title={'0.001 ' + units}
                            onClick={() => actions.selectDistance('0.001')}
                        >
                            0.001
                        </button>
                        <button
                            type="button"
                            className={classes.custom}
                            title={i18n._('Custom')}
                            onClick={() => actions.selectDistance()}
                        >
                            {i18n._('Custom')}
                        </button>
                    </div>
                    <input
                        type="number"
                        className="form-control"
                        style={{ borderRadius: 0 }}
                        min={DISTANCE_MIN}
                        max={DISTANCE_MAX}
                        step={DISTANCE_STEP}
                        value={customDistance}
                        onChange={(event) => {
                            const customDistance = event.target.value;
                            actions.changeCustomDistance(customDistance);
                        }}
                        title={i18n._('Custom distance for every move operation')}
                    />
                    <div className="input-group-btn">
                        <PressAndHold
                            className="btn btn-default"
                            onClick={(event) => {
                                actions.increaseCustomDistance();
                            }}
                            title={i18n._('Increase custom distance by one unit')}
                        >
                            <i className="fa fa-plus" />
                        </PressAndHold>
                        <PressAndHold
                            className="btn btn-default"
                            onClick={(event) => {
                                actions.decreaseCustomDistance();
                            }}
                            title={i18n._('Decrease custom distance by one unit')}
                        >
                            <i className="fa fa-minus" />
                        </PressAndHold>
                    </div>
                </div>
            </div>
        );
    }
}

export default JogDistance;
