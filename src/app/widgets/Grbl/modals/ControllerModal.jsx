import _get from 'lodash/get';
import PropTypes from 'prop-types';
import React, { useState } from 'react';
import { connect } from 'react-redux';
import { Button } from 'app/components/Buttons';
import Modal from 'app/components/Modal';
import { Nav, NavItem } from 'app/components/Navs';
import controller from 'app/lib/controller';
import i18n from 'app/lib/i18n';
import PreviewCode from './PreviewCode';

const ControllerModal = ({
    onClose,
    stringifiedControllerState,
    stringifiedControllerSettings,
}) => {
    const [activeTab, setActiveTab] = useState('state');

    return (
        <Modal size="lg" onClose={onClose}>
            <Modal.Header>
                <Modal.Title>
                    Grbl
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Nav
                    navStyle="tabs"
                    activeKey={activeTab}
                    onSelect={(eventKey, event) => {
                        setActiveTab(eventKey);
                    }}
                    style={{ marginBottom: 10 }}
                >
                    <NavItem eventKey="state">{i18n._('Controller State')}</NavItem>
                    <NavItem eventKey="settings">{i18n._('Controller Settings')}</NavItem>
                </Nav>
                <div
                    style={{
                        position: 'relative',
                        overflowY: 'auto',
                        background: '#000',
                        color: '#fff',
                        border: '1px solid #ddd',
                        height: Math.max(window.innerHeight / 2, 200),
                    }}
                >
                    {activeTab === 'state' && (
                        <PreviewCode>
                            {stringifiedControllerState}
                        </PreviewCode>
                    )}
                    {activeTab === 'settings' && (
                        <div>
                            <Button
                                xs
                                btnStyle="default"
                                style={{
                                    position: 'absolute',
                                    right: 10,
                                    top: 10
                                }}
                                onClick={event => {
                                    controller.writeln('$#'); // Parameters
                                    controller.writeln('$$'); // Settings
                                }}
                            >
                                <i className="fa fa-refresh" />
                                {i18n._('Refresh')}
                            </Button>
                            <PreviewCode>
                                {stringifiedControllerSettings}
                            </PreviewCode>
                        </div>
                    )}
                </div>
            </Modal.Body>
            <Modal.Footer>
                <Button onClick={onClose}>
                    {i18n._('Close')}
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

ControllerModal.propTypes = {
    onClose: PropTypes.func,
};

export default connect(store => {
    const controllerState = _get(store, 'controller.state');
    const controllerSettings = _get(store, 'controller.settings');

    return {
        stringifiedControllerState: JSON.stringify(controllerState, null, 2),
        stringifiedControllerSettings: JSON.stringify(controllerSettings, null, 2),
    };
})(ControllerModal);
