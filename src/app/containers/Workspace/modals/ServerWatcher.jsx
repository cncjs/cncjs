import { PureComponent } from 'react';
import { reloadPage } from 'app/lib/reload-page';
import { readFailoverConfig, watchServer } from 'app/lib/server-watch';

// Renders nothing. While mounted (the disconnect modal is open) it checks over HTTP
// whether the server is really gone. Only then does it reload, and the service worker
// answers that reload with the offline page. A socket-only outage never triggers it.
// It does nothing unless offlineFailover is enabled in .cncrc.
class ServerWatcher extends PureComponent {
  stop = null;

  componentDidMount() {
    // Without a service worker a reload would only show the browser's error page
    if (!(navigator.serviceWorker && navigator.serviceWorker.controller)) {
      return;
    }
    const { enabled, timeout } = readFailoverConfig();
    if (!enabled) {
      return;
    }
    this.stop = watchServer({
      timeout,
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
