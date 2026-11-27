import { PureComponent } from 'react';
import { reloadPage } from 'app/lib/reload-page';
import { readConnectionRecoveryConfig, watchServer } from 'app/lib/server-watch';

// Renders nothing. While mounted (the disconnect modal is open) it checks over HTTP
// whether the server is really gone. Only then does it reload, and the service worker
// answers that reload with the offline page. A socket-only outage never triggers it.
// It does nothing unless connectionRecovery.action is offline in .cncrc.
class ServerWatcher extends PureComponent {
  stop = null;

  componentDidMount() {
    // Without a service worker a reload would only show the browser's error page
    if (!(navigator.serviceWorker && navigator.serviceWorker.controller)) {
      return;
    }
    const { action } = readConnectionRecoveryConfig();
    if (action !== 'offline') {
      return;
    }
    this.stop = watchServer({
      onUnreachable: () => reloadPage(),
    });
  }

  componentWillUnmount() {
    if (this.stop) {
      this.stop();
    }
  }

  render() {
    return null;
  }
}

export default ServerWatcher;
