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
    // Knowing which port is open and being able to send to it are different
    // states, and the gap between them is real time. Until the socket has
    // attached, every control on the panel would look live and do nothing.
    attached: false,
    error: null,
    port: controller.port,
    type: controller.type,
    state: controller.state,
    job: null,
  }));

  useEffect(() => {
    let live = true;

    const events = {
      'serialport:open': ({ port, controllerType }) => {
        setSnapshot((previous) => ({ ...previous, port, type: controllerType }));
      },
      'serialport:close': () => {
        // Gone, and not merely quiet: the panel is no longer attached to
        // anything and its controls have to say so.
        // The readings described a machine that is no longer there. Keeping
        // them on screen would be the panel answering for a controller it can
        // no longer hear.
        setSnapshot((previous) => ({ ...previous, port: '', type: '', state: {}, attached: false }));
      },
      'controller:state': (type, state) => {
        setSnapshot((previous) => ({ ...previous, type, state }));
      },
      /**
       * How far through the job the sender is.
       *
       * It arrives on its own event rather than inside the controller state,
       * because it is the *server's* business — the controller knows only the
       * line it is executing, not how many there are.
       */
      'sender:status': (job) => {
        setSnapshot((previous) => ({ ...previous, job }));
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
        if (!live || !open) {
          return;
        }
        setSnapshot((previous) => ({ ...previous, ...open }));

        // And then *attach* to it, which is a different thing from knowing
        // about it. Two reasons, and both are silent failures otherwise:
        //
        // `Controller.command()` begins `if (!this.port) return` — the socket
        // client only learns the port from `serialport:open`, so a panel that
        // merely read the API would send nothing at all and report no error.
        // A jog key would look pressed and do nothing.
        //
        // And the server emits controller updates to the port's room, which a
        // socket joins by opening. Without this the readings would be frozen
        // at whatever the one snapshot said.
        //
        // Safe because the port is already open: the server attaches this
        // socket to the running controller rather than opening anything.
        controller.openPort(open.port, {
          controllerType: open.type,
          baudrate: open.baudrate,
          rtscts: open.rtscts,
        }, () => {
          if (live) {
            setSnapshot((previous) => ({ ...previous, attached: true }));
          }
        });
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
