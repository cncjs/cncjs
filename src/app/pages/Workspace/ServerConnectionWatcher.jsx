import { useEffect } from 'react';
import { isControlledByServiceWorker, reloadPage } from '@app/lib/reload-page';
import { readConnectionRecoveryConfig, watchServer } from '@app/lib/server-watch';

// While the workspace is disconnected, probe HTTP before switching to the offline page.
const ServerConnectionWatcher = () => {
  useEffect(() => {
    const { offlineFallback } = readConnectionRecoveryConfig();
    if (!offlineFallback || !isControlledByServiceWorker()) {
      return undefined;
    }
    return watchServer({
      onUnreachable: () => {
        if (isControlledByServiceWorker()) {
          reloadPage();
        }
      },
    });
  }, []);

  return null;
};

export default ServerConnectionWatcher;
