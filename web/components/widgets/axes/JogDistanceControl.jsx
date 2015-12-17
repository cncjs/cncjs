import i18n from 'i18next';
import React from 'react';
import PressAndHold from '../../common/PressAndHold';
import {
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
        onChange: React.PropTypes.func
    };

    normalizeToRange(n, min, max) {
        if (n < min) {
            return min;
        }
        if (n > max) {
            return max;
        }
        return n * 1;
    }
    handleChange(event) {
        let distance = event.target.value;
        this.setState({ distance: distance });
        this.props.onChange(distance);
    }
    increaseDistance() {
        let distance = Math.min(Number(this.state.distance) + DISTANCE_STEP, DISTANCE_MAX);
        this.setState({ distance: distance });
        this.props.onChange(distance);
    }
    decreaseDistance() {
        let distance = Math.max(Number(this.state.distance) - DISTANCE_STEP, DISTANCE_MIN);
        this.setState({ distance: distance });
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
            <div>
                <label className="control-label">
                    {i18n._('Distance:')}
                </label>
                <div className="input-group input-group-xs">
                    <div className="input-group-btn">
                        <input
                            type="number"
                            className="form-control"
                            style={{width: 80}}
                            min={DISTANCE_MIN}
                            max={DISTANCE_MAX}
                            step={DISTANCE_STEP}
                            value={distance}
                            onChange={::this.handleChange}
                        />
                        <PressAndHold className="btn btn-default" onClick={::this.increaseDistance} title={i18n._('Increase by 0.1 unit')}>
                            <span className="glyphicon glyphicon-plus"></span>
                        </PressAndHold>
                        <PressAndHold className="btn btn-default" onClick={::this.decreaseDistance} title={i18n._('Decrease by 0.1 unit')}>
                            <span className="glyphicon glyphicon-minus"></span>
                        </PressAndHold>
                        <button type="button" className="btn btn-default" onClick={::this.resetDistance} title={i18n._('Reset')}>
                            <span className="glyphicon glyphicon-reset"></span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }
}

export default JogDistanceControl;
