import { PureComponent } from 'react';
import { watchServer } from 'app/lib/server-watch';

// Renders nothing. While mounted (the disconnect modal is open) it checks over HTTP
// whether the server is really gone. Only then does it reload, and the service worker
// answers that reload with the offline page. A socket-only outage never triggers it.
class ServerWatcher extends PureComponent {
  stop = null;

  componentDidMount() {
    // Without a service worker a reload would only show the browser's error page
    if (!(navigator.serviceWorker && navigator.serviceWorker.controller)) {
      return;
    }
    this.stop = watchServer({
      onUnreachable: () => window.location.reload(true),
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
