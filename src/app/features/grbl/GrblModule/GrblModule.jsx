import { PureComponent } from 'react';
import { GRBL } from 'app/constants';
import controller from 'app/lib/controller';
import { queueBuffers } from '../selectors';

/**
 * Everything the application knows about a Grbl controller, and nothing about
 * where it is shown.
 *
 * It renders no markup of its own: it calls `children` with the machine's
 * state and the three things that can be sent back to it, and lets whatever is
 * above decide what that looks like. The same controller can be a tile in the
 * workspace, a strip in a header or a screen of its own, and this file does
 * not change for any of them.
 *
 * `ready` is the question "is there a Grbl on the other end of this?", and it
 * is answered optimistically before a port is open: a server started with a
 * single controller loaded can only ever be that one, so the panel does not
 * have to wait for a connection to know it is the right panel.
 */
class GrblModule extends PureComponent {
    state = this.getInitialState();

    actions = {
      // The only three things this panel sends. Each is a realtime override
      // byte: it scales a motion that is already running and does nothing at
      // all to a machine that is standing still.
      feedOverride: (value) => {
        controller.command('feedOverride', value);
      },
      spindleOverride: (value) => {
        controller.command('spindleOverride', value);
      },
      rapidOverride: (value) => {
        controller.command('rapidOverride', value);
      },
    };

    controllerEvents = {
      'serialport:open': ({ port, controllerType }) => {
        this.setState({
          ready: controllerType === GRBL,
          port,
        });
      },
      'serialport:close': () => {
        // A closed port means these readings describe a machine that is gone.
        // Keeping them on screen would be the panel answering for a controller
        // it can no longer hear.
        this.setState(this.getInitialState());
      },
      'controller:settings': (type, settings) => {
        if (type === GRBL) {
          this.setState({ type, settings });
        }
      },
      'controller:state': (type, controllerState) => {
        if (type !== GRBL) {
          return;
        }
        this.setState((previous) => {
          // The planner's depth is never stated by the firmware, so the scale
          // for its bar is whatever it has been seen to reach. Tracked here
          // rather than in the view, because a view that accumulated across
          // renders would reset every time it was mounted somewhere else.
          const buffers = queueBuffers({ ...controllerState }.status, previous.seenBufferMax);
          return {
            type,
            controllerState,
            seenBufferMax: buffers
              ? { planner: buffers.plannerMax, rx: buffers.rxMax }
              : previous.seenBufferMax,
          };
        });
      },
    };

    componentDidMount() {
      Object.keys(this.controllerEvents).forEach((eventName) => {
        controller.addListener(eventName, this.controllerEvents[eventName]);
      });
    }

    componentWillUnmount() {
      Object.keys(this.controllerEvents).forEach((eventName) => {
        controller.removeListener(eventName, this.controllerEvents[eventName]);
      });
    }

    getInitialState() {
      return {
        ready: (controller.loadedControllers.length === 1) || (controller.type === GRBL),
        port: controller.port,
        type: controller.type,
        settings: controller.settings,
        controllerState: controller.state,
        // Grbl 1.1's receive buffer is 128 bytes and it says so nowhere, so
        // that one figure is known in advance. The planner's is not.
        seenBufferMax: { planner: 0, rx: 128 },
      };
    }

    /**
     * Whether a command sent from here would reach anything.
     *
     * A port has to be open and it has to be a Grbl on the other end — the
     * workspace mounts a panel for all four firmwares at once, and three of
     * them are looking at a machine that is not theirs.
     */
    canSend() {
      const { port, type } = this.state;
      return Boolean(port) && (type === GRBL);
    }

    render() {
      return this.props.children({
        ...this.state,
        canSend: this.canSend(),
        actions: this.actions,
      });
    }
}

export default GrblModule;
