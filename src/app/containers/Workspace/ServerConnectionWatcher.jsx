import { PureComponent } from 'react';
import { isControlledByServiceWorker, reloadPage } from 'app/lib/reload-page';
import { readConnectionRecoveryConfig, watchServer } from 'app/lib/server-watch';

// While the workspace is disconnected, probe HTTP before switching to the offline page.
class ServerConnectionWatcher extends PureComponent {
  stop = null;

  componentDidMount() {
    const { offlineFallback } = readConnectionRecoveryConfig();
    if (!offlineFallback || !isControlledByServiceWorker()) {
      return;
    }
    this.stop = watchServer({
      onUnreachable: () => {
        if (isControlledByServiceWorker()) {
          reloadPage();
        }
      },
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

export default ServerConnectionWatcher;
