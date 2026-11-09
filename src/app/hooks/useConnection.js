import { useSyncExternalStore } from 'react';
import connectionRuntime from '@app/runtime/connectionRuntimeSingleton';

const useConnection = (runtime = connectionRuntime) => {
  const snapshot = useSyncExternalStore(
    runtime.subscribe,
    runtime.getSnapshot,
    runtime.getSnapshot,
  );

  return {
    ...snapshot,
    open: runtime.open,
    close: runtime.close,
    command: runtime.command,
    write: runtime.write,
    writeln: runtime.writeln,
  };
};

export default useConnection;
