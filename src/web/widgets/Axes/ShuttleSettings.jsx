import Slider from 'rc-slider';
import React from 'react';
import i18n from '../../lib/i18n';
import store from '../../store';

const FEEDRATE_RANGE = [100, 2500];
const FEEDRATE_STEP = 50;
const OVERSHOOT_RANGE = [1, 1.5];
const OVERSHOOT_STEP = 0.01;

class ShuttleSettings extends React.Component {
    state = {
        feedrateMin: store.get('widgets.axes.shuttle.feedrateMin'),
        feedrateMax: store.get('widgets.axes.shuttle.feedrateMax'),
        hertz: store.get('widgets.axes.shuttle.hertz'),
        overshoot: store.get('widgets.axes.shuttle.overshoot')
    };

    onFeedrateSliderChange(value) {
        const [min, max] = value;
        this.setState({
            feedrateMin: min,
            feedrateMax: max
        });
    }
    onHertzChange(event) {
        const { value } = event.target;
        const hertz = Number(value);
        this.setState({ hertz });
    }
    onOvershootSliderChange(value) {
        const overshoot = value;
        this.setState({ overshoot });
    }
    save() {
        store.set('widgets.axes.shuttle.feedrateMin', this.state.feedrateMin);
        store.set('widgets.axes.shuttle.feedrateMax', this.state.feedrateMax);
        store.set('widgets.axes.shuttle.hertz', this.state.hertz);
        store.set('widgets.axes.shuttle.overshoot', this.state.overshoot);
    }
    render() {
        const { feedrateMin, feedrateMax, hertz, overshoot } = this.state;

        return (
            <div className="panel panel-default" style={{ marginBottom: 0 }}>
                <div className="panel-heading">
                    <h3 className="panel-title">{i18n._('Shuttle Settings')}</h3>
                </div>
                <div className="panel-body">
                    <div className="form-group form-group-sm">
                        <p>
                            {i18n._('Feed Rate Range:')}
                            &nbsp;
                            {i18n._('{{min}} - {{max}} mm/min', { min: feedrateMin, max: feedrateMax })}
                        </p>
                        <Slider
                            range
                            allowCross={false}
                            defaultValue={[feedrateMin, feedrateMax]}
                            min={FEEDRATE_RANGE[0]}
                            max={FEEDRATE_RANGE[1]}
                            step={FEEDRATE_STEP}
                            onChange={::this.onFeedrateSliderChange}
                        />
                    </div>
                    <div className="form-group form-group-sm">
                        <label>{i18n._('Repeat Rate:')}&nbsp;{i18n._('{{hertz}}Hz', { hertz })}</label>
                        <select className="form-control" defaultValue={hertz} onChange={::this.onHertzChange}>
                            <option value="60">{i18n._('60 Times per Second')}</option>
                            <option value="45">{i18n._('45 Times per Second')}</option>
                            <option value="30">{i18n._('30 Times per Second')}</option>
                            <option value="15">{i18n._('15 Times per Second')}</option>
                            <option value="10">{i18n._('10 Times per Second')}</option>
                            <option value="5">{i18n._('5 Times per Second')}</option>
                            <option value="2">{i18n._('2 Times per Second')}</option>
                            <option value="1">{i18n._('Once Every Second')}</option>
                        </select>
                    </div>
                    <div className="form-group form-group-sm" style={{ marginBottom: 0 }}>
                        <p>{i18n._('Distance Overshoot:')}&nbsp;{overshoot}x</p>
                        <Slider
                            defaultValue={overshoot}
                            min={OVERSHOOT_RANGE[0]}
                            max={OVERSHOOT_RANGE[1]}
                            step={OVERSHOOT_STEP}
                            onChange={::this.onOvershootSliderChange}
                        />
                    </div>
                </div>
            </div>
        );
    }
}

export default ShuttleSettings;
