import React from 'react';
import i18n from '../../../lib/i18n';
import PressAndHold from '../../common/PressAndHold';
import {
    METRIC_UNIT,
    DISTANCE_MIN,
    DISTANCE_MAX,
    DISTANCE_STEP,
    DISTANCE_DEFAULT
} from './constants';

class JogDistanceControl extends React.Component {
    state = {
        distance: DISTANCE_DEFAULT
    };
    static propTypes = {
        unit: React.PropTypes.string,
        onChange: React.PropTypes.func
    };

    normalizeToRange(n, min, max) {
        if (n < min) {
            return min;
        }
        if (n > max) {
            return max;
        }
        return n;
    }
    handleChange(event) {
        let distance = event.target.value;

        this.setState({ distance: distance });
        this.props.onChange(distance);
    }
    increaseDistance() {
        let distance = Math.min(Number(this.state.distance) + DISTANCE_STEP, DISTANCE_MAX);
        let digits = (this.props.unit === METRIC_UNIT) ? 3 : 4;
        this.setState({ distance: distance.toFixed(digits) * 1 });
        this.props.onChange(distance);
    }
    decreaseDistance() {
        let distance = Math.max(Number(this.state.distance) - DISTANCE_STEP, DISTANCE_MIN);
        let digits = (this.props.unit === METRIC_UNIT) ? 3 : 4;
        this.setState({ distance: distance.toFixed(digits) * 1 });
        this.props.onChange(distance);
    }
    resetDistance() {
        let distance = DISTANCE_DEFAULT;
        this.setState({ distance: distance });
        this.props.onChange(distance);
    }
    render() {
        let distance = this.normalizeToRange(this.state.distance, DISTANCE_MIN, DISTANCE_MAX);

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
                                    min={DISTANCE_MIN}
                                    max={DISTANCE_MAX}
                                    step={DISTANCE_STEP}
                                    value={distance}
                                    onChange={::this.handleChange}
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

export default JogDistanceControl;
