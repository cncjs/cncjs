import PropTypes from 'prop-types';
import React from 'react';
import { Button } from 'app/components/Buttons';
import Modal from 'app/components/Modal';
import { Nav, NavItem } from 'app/components/Navs';
import { refreshSettings } from 'app/features/grbl/commands';
import i18n from 'app/lib/i18n';
import styles from './index.styl';

/**
 * The raw truth behind every reading on the panel.
 *
 * This is the first thing anyone opens when a figure looks wrong, so it shows
 * the controller's own JSON rather than anything derived from it: a formatted
 * view here would be another place for the same mistake to hide.
 */
const Controller = ({ controllerState, controllerSettings, activeTab = 'state', onSelectTab, onClose }) => {
  const height = Math.max(window.innerHeight / 2, 200);

  return (
    <Modal disableOverlay size="lg" onClose={onClose}>
      <Modal.Header>
        <Modal.Title>
          Grbl
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Nav
          navStyle="tabs"
          activeKey={activeTab}
          onSelect={(eventKey) => onSelectTab(eventKey)}
          style={{ marginBottom: 10 }}
        >
          <NavItem eventKey="state">{i18n._('Controller State')}</NavItem>
          <NavItem eventKey="settings">{i18n._('Controller Settings')}</NavItem>
        </Nav>
        <div className={styles.navContent} style={{ height: height }}>
          {activeTab === 'state' && (
            <pre className={styles.pre}>
              <code>{JSON.stringify(controllerState, null, 4)}</code>
            </pre>
          )}
          {activeTab === 'settings' && (
            <div>
              <Button
                btnSize="xs"
                btnStyle="flat"
                style={{
                  position: 'absolute',
                  right: 10,
                  top: 10
                }}
                onClick={refreshSettings}
              >
                <i className="fa fa-refresh" />
                {i18n._('Refresh')}
              </Button>
              <pre className={styles.pre}>
                <code>{JSON.stringify(controllerSettings, null, 4)}</code>
              </pre>
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

Controller.propTypes = {
  controllerState: PropTypes.object,
  controllerSettings: PropTypes.object,
  activeTab: PropTypes.string,
  onSelectTab: PropTypes.func,
  onClose: PropTypes.func
};

export default Controller;
