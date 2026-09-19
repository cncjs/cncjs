import pubsub from 'pubsub-js';
import { PureComponent } from 'react';
import controller from 'app/lib/controller';
import {
  GRBL,
  MARLIN,
  SMOOTHIE,
  TINYG,
  IMPERIAL_UNITS,
  METRIC_UNITS
} from 'app/constants';

// Where each controller keeps its modal state. The four firmwares report the
// same G20/G21 under four different shapes, which is the only difference
// between them that this module cares about.
const modalOf = {
  [GRBL]: (state) => ({ ...state.parserstate }).modal,
  [MARLIN]: (state) => state.modal,
  [SMOOTHIE]: (state) => ({ ...state.parserstate }).modal,
  [TINYG]: (state) => ({ ...state.sr }).modal,
};

const UNITS_BY_MODAL = {
  G20: IMPERIAL_UNITS,
  G21: METRIC_UNITS,
};

const emptyBoundingBox = () => ({
  min: { x: 0, y: 0, z: 0 },
  max: { x: 0, y: 0, z: 0 },
});

/**
 * Everything the application knows about the loaded job, and nothing about
 * where it is shown.
 *
 * It renders no markup of its own: it calls `children` with the readings and
 * lets whatever is above it decide what they look like. That is the whole
 * point of the split — the same job can be a tile in the workspace, a strip in
 * a header or a screen of its own, and this file does not change for any of
 * them.
 */
class GCodeModule extends PureComponent {
    state = this.getInitialState();

    pubsubTokens = [];

    controllerEvents = {
      'serialport:open': (options) => {
        const { port } = options;
        this.setState({ port });
      },
      'serialport:close': () => {
        // A closed port means the job is no longer this machine's job. Keeping
        // the last figures on screen would describe a machine that is gone.
        this.setState({ ...this.getInitialState() });
      },
      'gcode:unload': () => {
        this.setState({ bbox: emptyBoundingBox() });
      },
      'sender:status': (data) => {
        const { total, sent, received, startTime, finishTime, elapsedTime, remainingTime } = data;
        this.setState({ total, sent, received, startTime, finishTime, elapsedTime, remainingTime });
      },
      'controller:state': (type, state) => {
        const readModal = modalOf[type];
        if (!readModal) {
          return;
        }
        const modal = readModal({ ...state }) || {};
        const units = UNITS_BY_MODAL[modal.units] || this.state.units;
        if (this.state.units !== units) {
          this.setState({ units });
        }
      },
    };

    componentDidMount() {
      this.subscribe();
      Object.keys(this.controllerEvents).forEach((eventName) => {
        controller.addListener(eventName, this.controllerEvents[eventName]);
      });
    }

    componentWillUnmount() {
      Object.keys(this.controllerEvents).forEach((eventName) => {
        controller.removeListener(eventName, this.controllerEvents[eventName]);
      });
      this.unsubscribe();
    }

    getInitialState() {
      return {
        port: controller.port,
        units: METRIC_UNITS,

        // Reported by the server as it streams.
        total: 0,
        sent: 0,
        received: 0,
        startTime: 0,
        finishTime: 0,
        elapsedTime: 0,
        remainingTime: 0,

        // The extent of the toolpath. The span between min and max is derived
        // where it is displayed, so it cannot disagree with them.
        bbox: emptyBoundingBox(),
      };
    }

    subscribe() {
      // The bounding box comes from the visualizer, which is the only thing
      // that parses the file. It arrives once per load.
      this.pubsubTokens = [
        pubsub.subscribe('gcode:bbox', (msg, bbox) => {
          this.setState({
            bbox: {
              min: { x: bbox.min.x, y: bbox.min.y, z: bbox.min.z },
              max: { x: bbox.max.x, y: bbox.max.y, z: bbox.max.z },
            },
          });
        }),
      ];
    }

    unsubscribe() {
      this.pubsubTokens.forEach((token) => {
        pubsub.unsubscribe(token);
      });
      this.pubsubTokens = [];
    }

    render() {
      return this.props.children(this.state);
    }
}

export default GCodeModule;
