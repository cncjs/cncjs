import React from 'react';
import ReactDOM from 'react-dom';
import i18n from '../../../lib/i18n';
import PressAndHold from '../../common/PressAndHold';
import store from '../../../store';
import {
    METRIC_UNIT,
    IMPERIAL_UNIT,
    STEP_DISTANCE_MIN,
    STEP_DISTANCE_MAX,
    STEP_DISTANCE_STEP,
    STEP_DISTANCE_DEFAULT
} from './constants';

// from mm to in
const mm2in = (val = 0) => val / 25.4;
// from in to mm
const in2mm = (val = 0) => val * 25.4;

class JogStepDistance extends React.Component {
    static propTypes = {
        unit: React.PropTypes.string
    };
    state = {
        stepDistance: this.toUnitString(store.getState('widgets.axes.jog.stepDistance'))
    };

    componentWillReceiveProps(nextProps) {
        if (nextProps.unit !== this.props.unit) {
            let stepDistance = store.getState('widgets.axes.jog.stepDistance');

            if (nextProps.unit === IMPERIAL_UNIT) {
                stepDistance = mm2in(stepDistance).toFixed(4) * 1;
            }
            if (nextProps.unit === METRIC_UNIT) {
                stepDistance = stepDistance.toFixed(3) * 1;
            }

            this.setState({ stepDistance: stepDistance });
        }
    }
    componentDidUpdate(prevProps, prevState) {
        let { unit } = this.props;

        let stepDistance = Number(this.state.stepDistance) || 0;
        if (unit === IMPERIAL_UNIT) {
            // from in to mm
            stepDistance = in2mm(stepDistance);
        }

        // To save in mm
        store.setState('widgets.axes.jog.stepDistance', stepDistance);
    }
    normalizeToRange(n, min, max) {
        if (n < min) {
            return min;
        }
        if (n > max) {
            return max;
        }
        return n;
    }
    handleChangeDistance(event) {
        let stepDistance = event.target.value;
        stepDistance = this.normalizeToRange(stepDistance, STEP_DISTANCE_MIN, STEP_DISTANCE_MAX);
        this.setState({ stepDistance: stepDistance });
    }
    increaseDistance() {
        let { unit } = this.props;
        let stepDistance = Math.min(Number(this.state.stepDistance) + STEP_DISTANCE_STEP, STEP_DISTANCE_MAX);
        if (unit === IMPERIAL_UNIT) {
            stepDistance = stepDistance.toFixed(4) * 1;
        }
        if (unit === METRIC_UNIT) {
            stepDistance = stepDistance.toFixed(3) * 1;
        }
        this.setState({ stepDistance: stepDistance });
    }
    decreaseDistance() {
        let { unit } = this.props;
        let stepDistance = Math.max(Number(this.state.stepDistance) - STEP_DISTANCE_STEP, STEP_DISTANCE_MIN);
        if (unit === IMPERIAL_UNIT) {
            stepDistance = stepDistance.toFixed(4) * 1;
        }
        if (unit === METRIC_UNIT) {
            stepDistance = stepDistance.toFixed(3) * 1;
        }
        this.setState({ stepDistance: stepDistance });
    }
    resetDistance() {
        let stepDistance = STEP_DISTANCE_DEFAULT;
        this.setState({ stepDistance: stepDistance });
    }
    toUnitString(val) {
        let { unit } = this.props;

        val = Number(val) || 0;
        if (unit === IMPERIAL_UNIT) {
            val = mm2in(val).toFixed(4) * 1;
        }
        if (unit === METRIC_UNIT) {
            val = val.toFixed(3) * 1;
        }
        return '' + val;
    }
    render() {
        let { stepDistance } = this.state;

        return (
            <div className="jog-distance-control">
                <div className="form-inline">
                    <div className="form-group">
                        <div className="input-group input-group-xs">
                            <div className="input-group-addon">{i18n._('Step')}</div>
                            <div className="input-group-btn">
                                <input
                                    type="number"
                                    className="form-control"
                                    style={{borderRadius: 0}}
                                    min={STEP_DISTANCE_MIN}
                                    max={STEP_DISTANCE_MAX}
                                    step={STEP_DISTANCE_STEP}
                                    value={stepDistance}
                                    onChange={::this.handleChangeDistance}
                                    title={i18n._('Step for every move operation')}
                                />
                                <PressAndHold className="btn btn-default" onClick={::this.increaseDistance} title={i18n._('Increase step by 0.1 unit')}>
                                    <span className="glyphicon glyphicon-plus"></span>
                                </PressAndHold>
                                <PressAndHold className="btn btn-default" onClick={::this.decreaseDistance} title={i18n._('Decrease step by 0.1 unit')}>
                                    <span className="glyphicon glyphicon-minus"></span>
                                </PressAndHold>
                                <button type="button" className="btn btn-default" onClick={::this.resetDistance} title={i18n._('Reset')}>
                                    <span className="glyphicon glyphicon-reset"></span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

export default JogStepDistance;
