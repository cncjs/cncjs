import i18n from 'i18next';
import React from 'react';
import PressAndHold from '../../common/PressAndHold';
import {
    FEEDRATE_MIN,
    FEEDRATE_MAX,
    FEEDRATE_STEP,
    FEEDRATE_DEFAULT
} from './constants';

class JogFeedrateControl extends React.Component {
    state = {
        feedrate: FEEDRATE_DEFAULT
    }
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
        return n;
    }
    handleChange(event) {
        let feedrate = event.target.value;
        this.setState({ feedrate: feedrate });
        this.props.onChange(feedrate);
    }
    increaseFeedrate() {
        let feedrate = Math.min(Number(this.state.feedrate) + FEEDRATE_STEP, FEEDRATE_MAX);
        this.setState({ feedrate: feedrate });
        this.props.onChange(feedrate);
    }
    decreaseFeedrate() {
        let feedrate = Math.max(Number(this.state.feedrate) - FEEDRATE_STEP, FEEDRATE_MIN);
        this.setState({ feedrate: feedrate });
        this.props.onChange(feedrate);
    }
    resetFeedrate() {
        let feedrate = FEEDRATE_DEFAULT;
        this.setState({ feedrate: feedrate });
        this.props.onChange(feedrate);
    }

    render() {
        let feedrate = this.normalizeToRange(this.state.feedrate, FEEDRATE_MIN, FEEDRATE_MAX);

        return (
            <div>
                <label className="control-label">
                    {i18n._('Feed rate (mm/min):')}
                </label>
                <div className="input-group input-group-xs">
                    <div className="input-group-btn">
                        <input
                            type="number"
                            className="form-control"
                            style={{width: 80}}
                            min={FEEDRATE_MIN}
                            max={FEEDRATE_MAX}
                            step={FEEDRATE_STEP}
                            value={feedrate}
                            onChange={::this.handleChange}
                        />
                        <PressAndHold className="btn btn-default" onClick={::this.increaseFeedrate} title={i18n._('Increase by 10 mm/min')}>
                            <span className="glyphicon glyphicon-plus"></span>
                        </PressAndHold>
                        <PressAndHold className="btn btn-default" onClick={::this.decreaseFeedrate} title={i18n._('Decrease by 10 mm/min')}>
                            <span className="glyphicon glyphicon-minus"></span>
                        </PressAndHold>
                        <button type="button" className="btn btn-default" onClick={::this.resetFeedrate} title={i18n._('Reset')}>
                            <span className="glyphicon glyphicon-reset"></span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }
}

export default JogFeedrateControl;
