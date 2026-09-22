import { useCallback, useEffect, useState } from 'react';
import controller from './controller';
import { requestPorts } from './ports';

/**
 * The server's serial ports, kept current.
 *
 * Its own hook rather than part of `useMachine`, because nothing but the
 * connection screen wants it: the list is a question about the *computer* the
 * server runs on, and asking it costs a `SerialPort.list()` — a real call into
 * the operating system's driver stack, which on Windows takes long enough to
 * be worth not making four times a second on every screen.
 *
 * `loadedControllers` and `baudrates` are read here too. They are plain
 * properties on the socket client, filled in when the server's `startup`
 * event arrives and never changed after — reading them beside the list is
 * what makes them arrive in React state rather than being sampled at whatever
 * moment a render happened to occur, which before the socket is up is the
 * empty array they start as.
 */
export const usePorts = (linked) => {
  const [answer, setAnswer] = useState({ list: [], controllers: [], baudrates: [] });
  // Separate from the list: an empty list from a server that has answered
  // means "no serial ports on this computer", and an empty list from one that
  // has not means nothing at all. They are drawn differently.
  const [asked, setAsked] = useState(false);

  const refresh = useCallback(() => {
    if (!controller.connected) {
      return;
    }
    setAsked(true);
    requestPorts();
  }, []);

  useEffect(() => {
    const received = (list) => {
      setAnswer({
        list,
        controllers: controller.loadedControllers,
        baudrates: controller.baudrates,
      });
    };

    // Listening before asking, not after. `serialport:list` is an event the
    // server emits to the socket, not the return value of `list` — the
    // callback the client passes is never invoked — so a subscription made
    // after the request is a list that silently never arrives.
    controller.addListener('serialport:list', received);

    // And asking again whenever a port opens or closes, by anyone. `inuse` is
    // the server's state, not this panel's: the old application connecting on
    // the next tab changes what this screen should be offering.
    controller.addListener('serialport:open', refresh);
    controller.addListener('serialport:close', refresh);

    return () => {
      controller.removeListener('serialport:list', received);
      controller.removeListener('serialport:open', refresh);
      controller.removeListener('serialport:close', refresh);
    };
  }, [refresh]);

  // Once the socket is up, and again if it comes back. Asking before it is up
  // is a no-op inside the client — `this.socket && this.socket.emit(...)` —
  // which is a list that never arrives and no error to say why.
  useEffect(() => {
    if (linked) {
      refresh();
    }
  }, [linked, refresh]);

  return { ...answer, asked, refresh };
};

export default usePorts;
