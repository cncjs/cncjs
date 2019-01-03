import Slider from 'rc-slider';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import i18n from 'app/lib/i18n';
import FormGroup from 'app/components/FormGroup';
import Label from 'app/components/Label';

const FEEDRATE_RANGE = [100, 2500];
const FEEDRATE_STEP = 50;
const OVERSHOOT_RANGE = [1, 1.5];
const OVERSHOOT_STEP = 0.01;

class ShuttleXpress extends PureComponent {
    static propTypes = {
        feedrateMin: PropTypes.number,
        feedrateMax: PropTypes.number,
        hertz: PropTypes.number,
        overshoot: PropTypes.number
    };

    state = this.getInitialState();

    onChangeFeedrateSlider = (value) => {
        const [min, max] = value;

        this.setState({
            feedrateMin: min,
            feedrateMax: max
        });
    };

    onChangeHertz = (event) => {
        const { value } = event.target;
        const hertz = Number(value);
        this.setState({ hertz });
    };

    onChangeOvershootSlider = (value) => {
        const overshoot = value;
        this.setState({ overshoot });
    };

    getInitialState() {
        const {
            feedrateMin,
            feedrateMax,
            hertz,
            overshoot
        } = this.props;

        return { feedrateMin, feedrateMax, hertz, overshoot };
    }

    componentWillReceiveProps(nextProps) {
        const {
            feedrateMin,
            feedrateMax,
            hertz,
            overshoot
        } = nextProps;

        this.setState({ feedrateMin, feedrateMax, hertz, overshoot });
    }

    render() {
        const { feedrateMin, feedrateMax, hertz, overshoot } = this.state;

        return (
            <div>
                <FormGroup>
                    <Label>
                        {i18n._('Feed Rate Range: {{min}} - {{max}} mm/min', { min: feedrateMin, max: feedrateMax })}
                    </Label>
                    <Slider.Range
                        allowCross={false}
                        defaultValue={[feedrateMin, feedrateMax]}
                        min={FEEDRATE_RANGE[0]}
                        max={FEEDRATE_RANGE[1]}
                        step={FEEDRATE_STEP}
                        onChange={this.onChangeFeedrateSlider}
                    />
                </FormGroup>
                <FormGroup>
                    <Label>
                        {i18n._('Repeat Rate: {{hertz}}Hz', { hertz: hertz })}
                    </Label>
                    <select
                        className="form-control"
                        defaultValue={hertz}
                        onChange={this.onChangeHertz}
                    >
                        <option value="60">{i18n._('60 Times per Second')}</option>
                        <option value="45">{i18n._('45 Times per Second')}</option>
                        <option value="30">{i18n._('30 Times per Second')}</option>
                        <option value="15">{i18n._('15 Times per Second')}</option>
                        <option value="10">{i18n._('10 Times per Second')}</option>
                        <option value="5">{i18n._('5 Times per Second')}</option>
                        <option value="2">{i18n._('2 Times per Second')}</option>
                        <option value="1">{i18n._('Once Every Second')}</option>
                    </select>
                </FormGroup>
                <FormGroup>
                    <Label>
                        {i18n._('Distance Overshoot: {{overshoot}}x', { overshoot: overshoot })}
                    </Label>
                    <Slider
                        defaultValue={overshoot}
                        min={OVERSHOOT_RANGE[0]}
                        max={OVERSHOOT_RANGE[1]}
                        step={OVERSHOOT_STEP}
                        onChange={this.onChangeOvershootSlider}
                    />
                </FormGroup>
            </div>
        );
    }
}

export default ShuttleXpress;
