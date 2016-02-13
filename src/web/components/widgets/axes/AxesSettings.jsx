import _ from 'lodash';
import React from 'react';
import ReactDOM from 'react-dom';
import { Button, Modal } from 'react-bootstrap';
import i18n from '../../../lib/i18n';
import store from '../../../store';
import Slider from 'rc-slider';

const FEEDRATE_MIN = 100;
const FEEDRATE_MAX = 5000;
const FEEDRATE_STEP = 100;
const OVERSHOOT_MIN = 1;
const OVERSHOOT_MAX = 1.5;
const OVERSHOOT_STEP = 0.01;

const noop = () => {};

class AxesSettings extends React.Component {
    static propTypes = {
        onSave: React.PropTypes.func,
        onClose: React.PropTypes.func.isRequired
    };
    state = {
        show: true,
        feedrateMin: store.get('widgets.axes.shuttle.feedrateMin'),
        feedrateMax: store.get('widgets.axes.shuttle.feedrateMax'),
        hertz: store.get('widgets.axes.shuttle.hertz'),
        overshoot: store.get('widgets.axes.shuttle.overshoot')
    };

    componentDidUpdate(prevProps, prevState) {
        if (!(this.state.show)) {
            this.props.onClose();
        }
    }
    handleSave() {
        store.set('widgets.axes.shuttle.feedrateMin', this.state.feedrateMin);
        store.set('widgets.axes.shuttle.feedrateMax', this.state.feedrateMax);
        store.set('widgets.axes.shuttle.hertz', this.state.hertz);
        store.set('widgets.axes.shuttle.overshoot', this.state.overshoot);
        this.setState({ show: false });
        this.props.onSave();
    }
    handleCancel() {
        this.setState({ show: false });
    }
    onFeedrateSliderChange(value) {
        const [ min, max ] = value;
        this.setState({
            feedrateMin: min,
            feedrateMax: max
        });
    }
    onHertzChange(event) {
        const { value } = event.target;
        const hertz = Number(value);
        this.setState({ hertz: hertz });
    }
    onOvershootSliderChange(value) {
        const overshoot = value;
        this.setState({ overshoot: overshoot });
    }
    render() {
        const { show, feedrateMin, feedrateMax, hertz, overshoot } = this.state;

        return (
            <Modal
                backdrop="static"
                dialogClassName="modal-vertical-center"
                onHide={::this.handleCancel}
                show={show}
            >
                <Modal.Header closeButton>
                    <Modal.Title>{i18n._('Axes Settings')}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div className="panel panel-default">
                        <div className="panel-heading">
                            <h3 className="panel-title">{i18n._('Shuttle Settings')}</h3>
                        </div>
                        <div className="panel-body">
                            <div className="form-group form-group-sm">
                                <p>{i18n._('Feed Rate Range:')}&nbsp;{i18n._('{{min}} - {{max}} mm/min', { min: feedrateMin, max: feedrateMax })}</p>
                                <Slider range allowCross={false}
                                    defaultValue={[feedrateMin, feedrateMax]}
                                    min={FEEDRATE_MIN}
                                    max={FEEDRATE_MAX}
                                    step={FEEDRATE_STEP}
                                    onChange={::this.onFeedrateSliderChange}
                                />
                            </div>
                            <div className="form-group form-group-sm">
                                <label>{i18n._('Repeat Rate:')}&nbsp;{i18n._('{{hertz}}Hz', { hertz: hertz })}</label>
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
                            <div className="form-group form-group-sm" style={{marginBottom: 0}}>
                                <p>{i18n._('Overshoot Factor:')}&nbsp;{overshoot}x</p>
                                <Slider
                                    defaultValue={overshoot}
                                    min={OVERSHOOT_MIN}
                                    max={OVERSHOOT_MAX}
                                    step={OVERSHOOT_STEP}
                                    onChange={::this.onOvershootSliderChange}
                                />
                                <i>{i18n._('The amount of overshoot for Shuttle Wheel')}</i>
                            </div>
                        </div>
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <Button onClick={::this.handleSave}>{i18n._('Save')}</Button>
                    <Button onClick={::this.handleCancel}>{i18n._('Cancel')}</Button>
                </Modal.Footer>
            </Modal>
        );
    }
}

export const show = (callback = noop) => {
    const el = document.body.appendChild(document.createElement('div'));  
    const handleClose = (e) => {
        ReactDOM.unmountComponentAtNode(el);
        setTimeout(() => {
            el.remove();
        }, 0);
    };

    ReactDOM.render(<AxesSettings onSave={callback} onClose={handleClose} />, el);
};

export default AxesSettings;
