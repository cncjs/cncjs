import React, { PureComponent } from 'react';
import { Button } from 'app/components/Buttons';
import ModalTemplate from 'app/components/ModalTemplate';
import Modal from 'app/components/Modal';
import i18n from 'app/lib/i18n';

// Time to give socket.io to reconnect on its own before reloading
const RELOAD_DELAY = 5000;
// Don't auto-reload again if we already did it very recently (prevents reload loops)
const RELOAD_GUARD_MS = 30000;
const RELOAD_GUARD_KEY = 'cncjs.serverDisconnected.reloadedAt';

const reloadPage = (forcedReload = true) => {
  // Reload the current page, without using the cache
  window.location.reload(forcedReload);
};

const isControlledByServiceWorker = () => {
  return !!(navigator.serviceWorker && navigator.serviceWorker.controller);
};

const shouldAutoReload = () => {
  try {
    const last = Number(window.sessionStorage.getItem(RELOAD_GUARD_KEY) || 0);
    if (Date.now() - last < RELOAD_GUARD_MS) {
      return false;
    }
    window.sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()));
  } catch (e) {
    // sessionStorage unavailable: proceed without the guard
  }
  return true;
};

class ServerDisconnected extends PureComponent {
  reloadTimer = null;

  componentDidMount() {
    // Without a service worker, a reload would only show the browser's error page,
    // so keep the dialog and let the user decide.
    if (!isControlledByServiceWorker()) {
      return;
    }

    // With one, a reload is served the offline page (or the app, if the server is back).
    this.reloadTimer = setTimeout(() => {
      if (shouldAutoReload()) {
        reloadPage();
      }
    }, RELOAD_DELAY);
  }

  componentWillUnmount() {
    clearTimeout(this.reloadTimer);
  }

  render() {
    return (
      <Modal
        size="xs"
        disableOverlay={true}
        showCloseButton={false}
      >
        <Modal.Body>
          <ModalTemplate type="error">
            <h5>{i18n._('Server has stopped working')}</h5>
            <p>{i18n._('A problem caused the server to stop working correctly. Check out the server status and try again.')}</p>
          </ModalTemplate>
        </Modal.Body>
        <Modal.Footer>
          <Button
            btnStyle="primary"
            onClick={reloadPage}
          >
            {i18n._('Reload')}
          </Button>
        </Modal.Footer>
      </Modal>
    );
  }
}

export default ServerDisconnected;
