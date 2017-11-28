import ensureArray from 'ensure-array';
import noop from 'lodash/noop';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import Modal from '../../../components/Modal';
import { Nav, NavItem } from '../../../components/Navs';
import i18n from '../../../lib/i18n';
import General from './General';
import ShuttleXpress from './ShuttleXpress';
import {
    DEFAULT_AXES
} from '../constants';

class Settings extends PureComponent {
    static propTypes = {
        config: PropTypes.object.isRequired,
        onSave: PropTypes.func,
        onCancel: PropTypes.func
    };
    static defaultProps = {
        onSave: noop,
        onCancel: noop
    };

    config = this.props.config;
    node = {
        general: null,
        shuttleXpress: null
    };
    state = {
        activeKey: 'general'
    };

    load = () => {
        return {
            // General
            general: {
                axes: this.config.get('axes', DEFAULT_AXES),
                wzero: this.config.get('wzero'),
                mzero: this.config.get('mzero')
            },
            // ShuttleXpress
            shuttleXpress: {
                feedrateMin: this.config.get('shuttle.feedrateMin'),
                feedrateMax: this.config.get('shuttle.feedrateMax'),
                hertz: this.config.get('shuttle.hertz'),
                overshoot: this.config.get('shuttle.overshoot')
            }
        };
    };
    save = () => {
        // General
        const { axes = DEFAULT_AXES, wzero, mzero } = this.node.general.value;
        this.config.replace('axes', ensureArray(axes));
        this.config.set('wzero', wzero);
        this.config.set('mzero', mzero);

        // ShuttleXpress
        const { feedrateMin, feedrateMax, hertz, overshoot } = this.node.shuttleXpress.state;
        this.config.set('shuttle.feedrateMin', feedrateMin);
        this.config.set('shuttle.feedrateMax', feedrateMax);
        this.config.set('shuttle.hertz', hertz);
        this.config.set('shuttle.overshoot', overshoot);
    };

    render() {
        const { general, shuttleXpress } = this.load();

        return (
            <Modal size="sm" onClose={this.props.onCancel}>
                <Modal.Header>
                    <Modal.Title>{i18n._('Axes Settings')}</Modal.Title>
                </Modal.Header>
                <Modal.Body style={{ padding: '0 24px 16px 24px' }}>
                    <Nav
                        navStyle="light-tabs"
                        activeKey={this.state.activeKey}
                        onSelect={eventKey => {
                            this.setState({ activeKey: eventKey });
                        }}
                        style={{ marginBottom: 15 }}
                    >
                        <NavItem eventKey="general">{i18n._('General')}</NavItem>
                        <NavItem eventKey="shuttleXpress">{i18n._('ShuttleXpress')}</NavItem>
                    </Nav>
                    <div
                        style={{
                            border: '1px solid #ccc',
                            padding: '10px 15px',
                            minHeight: 240
                        }}
                    >
                        <General
                            ref={node => {
                                this.node.general = node;
                            }}
                            show={this.state.activeKey === 'general'}
                            axes={general.axes}
                            wzero={general.wzero}
                            mzero={general.mzero}
                        />
                        <ShuttleXpress
                            ref={node => {
                                this.node.shuttleXpress = node;
                            }}
                            show={this.state.activeKey === 'shuttleXpress'}
                            feedrateMin={shuttleXpress.feedrateMin}
                            feedrateMax={shuttleXpress.feedrateMax}
                            hertz={shuttleXpress.hertz}
                            overshoot={shuttleXpress.overshoot}
                        />
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <button
                        type="button"
                        className="btn btn-default"
                        onClick={this.props.onCancel}
                    >
                        {i18n._('Cancel')}
                    </button>
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={event => {
                            const { general } = this.node;

                            general.form.validate(err => {
                                if (err) {
                                    return;
                                }

                                this.save();

                                // Update parent state
                                this.props.onSave(event);
                            });
                        }}
                    >
                        {i18n._('Save Changes')}
                    </button>
                </Modal.Footer>
            </Modal>
        );
    }
}

export default Settings;
