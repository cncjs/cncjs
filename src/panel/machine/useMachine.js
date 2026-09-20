import { useEffect, useState } from 'react';
import controller from './controller';
import { signIn } from './session';
import { fetchOpenController } from './snapshot';
import { readMachine } from './readings';

/**
 * Everything the panel knows about the machine, as one hook.
 *
 * The socket client is the one thing taken from the old application. It is
 * framework-free — socket.io and a protocol — and rewriting it would mean
 * rewriting the part of cncjs that actually talks to a controller, which is
 * where its value is.
 *
 * The connection is opened once for the page, not once per component: several
 * tiles want the same readings and a socket each would be several sockets.
 */
export const useMachine = () => {
  const [snapshot, setSnapshot] = useState(() => ({
    connection: 'connecting',
    error: null,
    port: controller.port,
    type: controller.type,
    state: controller.state,
  }));

  useEffect(() => {
    let live = true;

    const events = {
      'serialport:open': ({ port, controllerType }) => {
        setSnapshot((previous) => ({ ...previous, port, type: controllerType }));
      },
      'serialport:close': () => {
        // The readings described a machine that is no longer there. Keeping
        // them on screen would be the panel answering for a controller it can
        // no longer hear.
        setSnapshot((previous) => ({ ...previous, port: '', type: '', state: {} }));
      },
      'controller:state': (type, state) => {
        setSnapshot((previous) => ({ ...previous, type, state }));
      },
    };

    const subscribe = () => {
      Object.entries(events).forEach(([name, handler]) => controller.addListener(name, handler));
    };
    const unsubscribe = () => {
      Object.entries(events).forEach(([name, handler]) => controller.removeListener(name, handler));
    };

    subscribe();

    signIn()
      .then(async ({ token }) => {
        if (!live) {
          return;
        }
        controller.connect('', { auth: { token } }, () => {
          if (live) {
            setSnapshot((previous) => ({ ...previous, connection: 'open' }));
          }
        });

        // Ask once what is already open. Without this the panel shows
        // "Disconnected" beside a running machine for as long as the page
        // stays up, because the event that would have told it fired before it
        // existed.
        const open = await fetchOpenController(token);
        if (live && open) {
          setSnapshot((previous) => ({ ...previous, ...open }));
        }
      })
      .catch((error) => {
        if (live) {
          setSnapshot((previous) => ({ ...previous, connection: 'failed', error: error.message }));
        }
      });

    return () => {
      live = false;
      unsubscribe();
    };
  }, []);

  return readMachine(snapshot);
};

export default useMachine;
