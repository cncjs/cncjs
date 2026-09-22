import { useEffect, useState } from 'react';
import controller from './controller';
import { signIn } from './session';
import { fetchOpenController } from './snapshot';
import { readMachine } from './readings';
import { measureLinkMs } from './latency';
import { askForWorkOffsets } from './workOffsets';
import { t } from '../i18n';

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
    settings: controller.settings || {},
    job: null,
    /*
     * How long this installation takes to stop a jog, in milliseconds, as
     * measured by the server: the queue it keeps ahead plus the firmware's
     * own reply time. Null until it says. See `machine/stopping`.
     */
    timing: null,
    /*
     * One-way milliseconds to the server. Zero when it is this computer,
     * which is most of the time; not zero when the server is a mini PC by
     * the machine and this is a laptop. Null until measured.
     */
    linkMs: null,
    // The program the sender is holding, as text. See the `gcode:load`
    // handler below for why a panel gets this without asking.
    gcode: null,
  }));

  useEffect(() => {
    let live = true;
    let linkTimer = null;

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
       * The firmware's settings, which arrive once when the port opens and
       * again whenever they are re-read.
       *
       * The panel needs them for one thing so far: whether this machine can
       * home. That is not a preference — it is whether limit switches exist
       * and are turned on, and the only honest source is the controller.
       */
      /**
       * What a jog costs on *this* installation, measured rather than
       * assumed.
       *
       * It is the server's to measure — the queue depth depends on how
       * punctual the host computer's timers are, and the reply time on the
       * cable — and the panel's to turn into a distance, because only the
       * panel knows the feed rate in use.
       */
      'controller:timing': (timing) => {
        setSnapshot((previous) => ({ ...previous, timing }));
      },
      'controller:settings': (type, settings) => {
        setSnapshot((previous) => ({ ...previous, type, settings }));
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
      /**
       * The loaded program, in full.
       *
       * This is the one place the server *remembers* rather than merely
       * relays. `addConnection` replays the sender's own `gcode` to a socket
       * that has just arrived, so a panel refreshed in front of a loaded job
       * is handed the whole program back without anybody uploading it again.
       * Nothing else on this socket behaves that way, and the toolpath screen
       * would be unusable if it did not.
       */
      'gcode:load': (name, gcode) => {
        setSnapshot((previous) => ({ ...previous, gcode: { name, gcode } }));
      },
      'gcode:unload': () => {
        setSnapshot((previous) => ({ ...previous, gcode: null }));
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
          if (!live) {
            return;
          }
          setSnapshot((previous) => ({ ...previous, attached: true }));

          /*
           * Time the link, now and every half minute.
           *
           * Not once: a panel is carried around a workshop and a link that
           * was fast at the bench is not the link it has by the machine. Not
           * often either — five round trips is enough to be worth trusting
           * and too many to repeat for no reason.
           */
          const timeTheLink = () => {
            measureLinkMs().then((linkMs) => {
              if (live && linkMs !== null) {
                setSnapshot((previous) => ({ ...previous, linkMs }));
              }
            });
          };

          timeTheLink();
          linkTimer = setInterval(timeTheLink, 30000);

          // And ask where the work coordinate systems are, which is the one
          // reading no part of the server ever requests. See `workOffsets.js`.
          askForWorkOffsets();
        });
      })
      .catch((error) => {
        if (live) {
          setSnapshot((previous) => ({ ...previous, connection: 'failed', error: error.message }));
        }
      });

    return () => {
      live = false;
      if (linkTimer) {
        clearInterval(linkTimer);
      }
      unsubscribe();
    };
  }, []);

  const machine = readMachine(snapshot);

  // The one place a state key becomes a word. `readings` is the tier Jest
  // runs, so it names the state and stops; everything downstream reads
  // `status.word` exactly as it did before.
  return {
    ...machine,
    status: {
      ...machine.status,
      word: machine.status.key ? t(machine.status.key) : machine.status.word,
    },
  };
};

export default useMachine;
