import get from 'lodash/get';
import includes from 'lodash/includes';
import mapValues from 'lodash/mapValues';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import pubsub from 'pubsub-js';
import api from 'app/api';
// import { TRACE, DEBUG, INFO, WARN, ERROR } from 'universal-logger';
import { INFO } from 'universal-logger';
import log from '../../lib/log';
import Space from '../../components/Space';
import Widget from '../../components/Widget';
import controller from '../../lib/controller';
import i18n from '../../lib/i18n';
import { in2mm, mm2in } from '../../lib/units';
import WidgetConfig from '../WidgetConfig';
import AutoLevel from './AutoLevel';
import MakeProbeFile from './MakeProbeFile';
import ApplyAutoLevel from './ApplyAutoLevel';
// import VisualizerWidget from '../Visualizer';
import {
  // Units
  IMPERIAL_UNITS,
  METRIC_UNITS,
  // Grbl
  GRBL,
  // Marlin
  MARLIN,
  // Smoothie
  SMOOTHIE,
  // TinyG
  TINYG,
} from '../../constants';
import {
  MODAL_NONE,
  MODAL_PREVIEW,
  MODAL_PREVIEW2
} from './constants';
import styles from './index.styl';

class AutoLevelWidget extends PureComponent {
  static propTypes = {
    widgetId: PropTypes.string.isRequired,
    onFork: PropTypes.func.isRequired,
    onRemove: PropTypes.func.isRequired,
    sortable: PropTypes.object
  };

  // Public methods
  collapse = () => {
    this.setState({ minimized: true });
  };

  expand = () => {
    this.setState({ minimized: false });
  };

  config = new WidgetConfig(this.props.widgetId);

  state = this.getInitialState();

  probingGcode = [];

  downloadableCSV = (rows) => {
    let content = '';
    rows.forEach((row, index) => {
      content += row.join(',') + '\n';
    });
    return content;
  }

  download = (content, fileName, contentType) => {
    let a = document.createElement('a');
    let file = new Blob([content], { type: contentType });
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
  }

  actions = {
    toggleFullscreen: () => {
      const { minimized, isFullscreen } = this.state;
      this.setState({
        minimized: isFullscreen ? minimized : false,
        isFullscreen: !isFullscreen
      });
    },
    toggleMinimized: () => {
      const { minimized } = this.state;
      this.setState({ minimized: !minimized });
    },
    openModalProbingSetup: (name = MODAL_NONE, params = {}) => {
      //log.info('AutoLevel/index.jsx before dialog startX=' + this.state.startX);
      this.probingGcode = [];
      this.setState({
        modal: {
          name: name,
          params: params
        }
      });
    },
    openModalApplyAutoLevel: (name = MODAL_NONE, params = {}) => {
      //log.info( 'AutoLevel/index.jsx openModalApplyAutoLevel');
      this.setState({
        modal: {
          name: name,
          params: params
        }
      });
    },
    closeModal: () => {
      this.setState({
        modal: {
          name: MODAL_NONE,
          params: {}
        }
      });
    },
    // updateModalParams: (params = {}) => {
    //     this.setState({
    //         modal: {
    //             ...this.state.modal,
    //             params: {
    //                 ...this.state.modal.params,
    //                 ...params
    //             }
    //         }
    //     });
    // },
    handleStartXChange: (event) => {
      const startX = event.target.value;
      this.setState({ startX: parseInt(startX, 10) });
    },
    handleEndXChange: (event) => {
      const endX = event.target.value;
      this.setState({ endX: parseInt(endX, 10) });
    },
    handleStartYChange: (event) => {
      const startY = event.target.value;
      this.setState({ startY: parseInt(startY, 10) });
    },
    handleEndYChange: (event) => {
      const endY = event.target.value;
      this.setState({ endY: parseInt(endY, 10) });
    },
    handleStepXChange: (event) => {
      const stepX = event.target.value;
      this.setState({ stepX: parseInt(stepX, 10) });
    },
    handleStepYChange: (event) => {
      const stepY = event.target.value;
      this.setState({ stepY: parseInt(stepY, 10) });
    },
    handleFeedXYChange: (event) => {
      const feedXY = event.target.value;
      this.setState({ feedXY: parseInt(feedXY, 10) });
    },
    handleFeedZChange: (event) => {
      const feedZ = event.target.value;
      this.setState({ feedZ: parseInt(feedZ, 10) });
    },
    handleDepthChange: (event) => {
      const depth = event.target.value;
      this.setState({ depth: parseInt(depth, 10) });
    },
    handleHeightChange: (event) => {
      const height = event.target.value;
      this.setState({ height: parseInt(height, 10) });
    },
    loadProbingGcode: (commands) => {
      this.makeProbeFileCommands();
      const gcode = this.probingGcode.join('');
      //log.info('AutoLevel/index.jsx gcode' + gcode);
      const name = 'something';
      const { port } = this.state;
      api.loadGCode({ port, name, gcode })
        .then((res) => {
          const { name = '', gcode = '' } = { ...res.body };
          pubsub.publish('gcode:load', { name, gcode });
        })
        .catch((res) => {
          log.error('Failed to upload G-code file');
        })
        .then(() => {
          //stopWaiting();
          this.setState({ isUploading: false });
        });
    },
    loadAutoLevelledGcode: (result) => {
      //log.info('AutoLevel/index.jsx loadAutoLevelledGcode result' + result);
      const gcode = result.join('\n');
      const name = 'something';
      const { port } = this.state;
      api.loadGCode({ port, name, gcode })
        .then((res) => {
          const { name = '', gcode = '' } = { ...res.body };
          pubsub.publish('gcode:load', { name, gcode });
        })
        .catch((res) => {
          log.error('Failed to upload G-code file');
        })
        .then(() => {
          //stopWaiting();
          this.setState({ isUploading: false });
        });
    },
    saveProbingGcode: (commands) => {
      log.info('AutoLevel/index.jsx saveProbingGcode');
      this.makeProbeFileCommands();
      let element = document.createElement('a');
      let file = new Blob(this.probingGcode, { type: 'text/plain' });
      element.href = URL.createObjectURL(file);
      element.download = 'Probing.ngc';
      element.click();
    },
    simulateProbing: () => {
      //const { state, actions } = this.props;
      const { startX, endX, startY, endY, stepX, stepY } = this.state;
      //log.info('AutoLevel/index.jsx simulateProbing state : ' + JSON.stringify(this.state));
      //log.info('AutoLevel/index.jsx simulateProbing startX, endX, startY, endY, stepX, stepY : ' + startX + ' ' + endX + ' ' + startY + ' ' + endY + ' ' + stepX + ' ' + stepY);
      this.state.probingMatrix = [];
      let row = [];
      let simProbingObj = [];
      let x0 = (endX + startX) / 2;
      let y0 = (endY + startY) / 2;
      let sizeX = Math.abs(endX - startX);
      let r = 0.7 * sizeX;
      let z0 = -0.56 * sizeX;
      let cz = 0;
      for (let y = startY; y <= endY; y += stepY) {
        for (let x = startX; x <= endX; x += stepX) {
          let sx = x;
          let sy = y;
          let sq1 = r * r - (x - x0) * (x - x0) - (y - y0) * (y - y0);
          if (sq1 > 0) {
            cz = Math.sqrt(sq1) + z0;
          } else {
            cz = 0;
          }
          if (cz < 0) {
            cz = 0;
          }
          let sz = 3;
          //log.info('AutoLevel x y z: ' + sx + ' ' + sy + ' ' + cz);
          simProbingObj.push({
            x: sx,
            y: sy,
            z: cz,
            pz: sz
          });
          row.push(cz);
        }
        this.state.probingMatrix.push(row);
        row = [];
      }
      log.info('AutoLevel/index.jsx simProbingObj : ' + JSON.stringify(simProbingObj));
      //log.info('AutoLevel/index.jsx matrix : ' + JSON.stringify(this.state.probingMatrix));
      this.setState({
        probingObj: simProbingObj,
        referenceZ: 0.0
      });
    },
    clearGrid: () => {
      log.info('AutoLevel/index.jsx clearGrid');
      this.setState({
        probingObj: [],
        referenceZ: 0.0,
        probingMatrix: []
      });
    },
    handleClickSave: () => {
      let prefix = Date.now();
      let fileName = prefix + 'probedata.rpf';
      let fileContent = JSON.stringify(this.state.probingObj);
      log.info('AutoLevel/index.jsx fileContent=' + fileContent);
      this.download(fileContent, fileName, 'text/plain');

      if (!(this.state.probingMatrix === undefined || this.state.probingMatrix.length === 0)) {
        fileContent = this.downloadableCSV(this.state.probingMatrix);
        //log.info('AutoLevel/index.jsx csv=' + fileContent);
        fileName = prefix + 'probedata.csv';
        this.download(fileContent, fileName, 'text/plain');
      }
    }
  };

  makeProbeFileCommands = (commands) => {
    //log.info( 'AutoLevel/index.jsx modal dialog closed, makeProbeFileCommands called');
    //log.info( 'AutoLevel/index.jsx startX=' + this.state.startX);
    //log.info('AutoLevel/index.jsx makeProbeFileCommands:' + JSON.stringify(this.state));
    //let code = [];
    let dx = (this.state.endX - this.state.startX) / parseInt((this.state.endX - this.state.startX) / this.state.stepX, 10);
    let dy = (this.state.endY - this.state.startY) / parseInt((this.state.endY - this.state.startY) / this.state.stepY, 10);
    this.probingGcode.push('(AL: probing initial point)\n');
    this.probingGcode.push(`G0 Z${this.state.height}\n`);
    this.probingGcode.push(`G90 G0 X${this.state.startX.toFixed(3)} Y${this.state.startY.toFixed(3)} Z${this.state.height}\n`);
    this.probingGcode.push(`G38.2 Z-${this.state.depth} F${this.state.feedZ / 2}\n`);
    //this.probingGcode.push('G10 L20 P1 Z0\n'); // set the z zero
    this.probingGcode.push(`G0 Z${this.state.height}\n`);
    let y = this.state.startY - dy;
    while (y < this.state.endY - 0.01) {
      y += dy;
      if (y > this.state.endY) {
        y = this.state.endY;
      }
      let x = this.state.startX - dx;
      if (y <= this.state.startY + 0.01) {
        x = this.state.startX;
      } // don't probe first point twice
      while (x < this.state.endX - 0.01) {
        x += dx;
        if (x > this.state.endX) {
          x = this.state.endX;
        }
        //this.probingGcode.push(`(AL: probing point ${this.state.planedPointCount + 1})`);
        this.probingGcode.push(`G90 G0 X${x.toFixed(3)} Y${y.toFixed(3)} F${this.state.feedXY}\n`);
        this.probingGcode.push(`G38.2 Z-${this.state.depth} F${this.state.feedZ}\n`);
        this.probingGcode.push(`G0 Z${this.state.height}\n`);
      }
    }
    //log.info('AutoLevel/index.jsx makeProbeFileCommands:' + JSON.stringify(this.probingGcode));
    //log.info('AutoLevel/index.jsx makeProbeFileCommands:' + this.probingGcode.join(''));
  }

  controllerEvents = {
    // atmelino
    'prbevent': (payload) => {
      //const { mypayload } = payload;
      //this.setState({ payload: payload });
      log.info('AutoLevel/index.jsx Probing prbevent');
    },
    'gcode:load': (name, gcode, context) => {
      log.info('AutoLevel/index.jsx gcode:load event');
    },
    'serialport:read': (received) => {
      if (received.type === 'probing') {
        // atmelino
        // log.info('AutoLevel/index.jsx probing received through serialport:read');
        // log.info('AutoLevel/index.jsx  received=' + JSON.stringify(received));
        const modified = {
          type: received.type,
          printed: false,
          result:
          {
            result: received.result.result,
            x: Number(received.result.x),
            y: Number(received.result.y),
            z: Number(received.result.z)
          }

        };
        // log.info('AutoLevel/index.jsx  modified=' + JSON.stringify(modified));

        this.setState({ probingData: modified });
      }
      //const { opt } = received;
    },
    'serialport:open': (options) => {
      const { port } = options;
      this.setState({ port: port });
    },
    'serialport:close': (options) => {
      const initialState = this.getInitialState();
      this.setState({ ...initialState });
    },
    'controller:settings': (type, controllerSettings) => {
      this.setState(state => ({
        controller: {
          ...state.controller,
          type: type,
          settings: controllerSettings
        }
      }));
    },
    'controller:state': (type, controllerState) => {
      // Grbl
      if (type === GRBL) {
        const { status, parserstate } = { ...controllerState };
        const { mpos, wpos } = status;
        const { modal = {} } = { ...parserstate };
        const units = {
          'G20': IMPERIAL_UNITS,
          'G21': METRIC_UNITS
        }[modal.units] || this.state.units;
        const $13 = Number(get(controller.settings, 'settings.$13', 0)) || 0;

        let customDistance = this.config.get('jog.customDistance');
        if (units === IMPERIAL_UNITS) {
          customDistance = mm2in(customDistance).toFixed(4) * 1;
        }
        if (units === METRIC_UNITS) {
          customDistance = Number(customDistance).toFixed(3) * 1;
        }
        // atmelino
        //log.error('axes controller:state');
        this.setState(state => ({
          units: units,
          controller: {
            ...state.controller,
            type: type,
            state: controllerState
          },
          // Machine position are reported in mm ($13=0) or inches ($13=1)
          machinePosition: mapValues({
            ...state.machinePosition,
            ...mpos
          }, (val) => {
            return ($13 > 0) ? in2mm(val) : val;
          }),
          // Work position are reported in mm ($13=0) or inches ($13=1)
          workPosition: mapValues({
            ...state.workPosition,
            ...wpos
          }, val => {
            return ($13 > 0) ? in2mm(val) : val;
          }),
          customDistance: customDistance
        }));
      }
      // atmelino
      //log.error('AutoLevel Probing controller:state');
    }
  };

  componentDidMount() {
    this.addControllerEvents();
  }

  componentWillUnmount() {
    this.removeControllerEvents();
  }

  componentDidUpdate(prevProps, prevState) {
    //log.info( 'AutoLevel/index.jsx componentDidUpdate');
    const {
      minimized
    } = this.state;
    this.config.set('minimized', minimized);

    let {
      startX,
      endX,
      startY,
      endY,
      stepX,
      stepY,
      feedXY,
      feedZ,
      depth,
      height
    } = this.state;
    this.config.set('startX', Number(startX));
    this.config.set('endX', Number(endX));
    this.config.set('startY', Number(startY));
    this.config.set('endY', Number(endY));
    this.config.set('stepX', Number(stepX));
    this.config.set('stepY', Number(stepY));
    this.config.set('feedXY', Number(feedXY));
    this.config.set('feedZ', Number(feedZ));
    this.config.set('depth', Number(depth));
    this.config.set('height', Number(height));
  }

  getInitialState() {
    return {
      minimized: this.config.get('minimized', false),
      isFullscreen: false,
      canClick: true, // Defaults to true
      port: controller.port,
      controller: {
        type: controller.type,
        settings: controller.settings,
        state: controller.state
      },
      modal: {
        name: MODAL_NONE,
        params: {}
      },
      startX: Number(this.config.get('startX') || 0).toFixed(3) * 1,
      endX: Number(this.config.get('endX') || 100).toFixed(3) * 1,
      startY: Number(this.config.get('startY') || 0).toFixed(3) * 1,
      endY: Number(this.config.get('endY') || 100).toFixed(3) * 1,
      stepX: Number(this.config.get('stepX') || 10).toFixed(3) * 1,
      stepY: Number(this.config.get('stepY') || 10).toFixed(3) * 1,
      feedXY: Number(this.config.get('feedXY') || 600).toFixed(3) * 1,
      feedZ: Number(this.config.get('feedZ') || 50).toFixed(3) * 1,
      depth: Number(this.config.get('depth') || 5).toFixed(3) * 1,
      height: Number(this.config.get('height') || 3).toFixed(3) * 1,
      probingObj: [],
      probingMatrix: [],
      ALgcode: []
    };
  }

  addControllerEvents() {
    Object.keys(this.controllerEvents).forEach(eventName => {
      const callback = this.controllerEvents[eventName];
      controller.addListener(eventName, callback);
      //log.error('AutoLevel Probing addControllerEvents');
    });
  }

  removeControllerEvents() {
    Object.keys(this.controllerEvents).forEach(eventName => {
      const callback = this.controllerEvents[eventName];
      controller.removeListener(eventName, callback);
    });
  }

  canClick() {
    const { port, controller } = this.state;
    const controllerType = controller.type;

    if (!port) {
      return false;
    }
    if (!includes([GRBL, MARLIN, SMOOTHIE, TINYG], controllerType)) {
      return false;
    }
    return true;
  }

  render() {
    const { widgetId } = this.props;
    const { minimized, isFullscreen } = this.state;
    const isForkedWidget = widgetId.match(/\w+:[\w\-]+/);
    const state = {
      ...this.state,
      canClick: this.canClick()
    };
    const actions = {
      ...this.actions
    };
    log.setLevel(INFO);
    //log.info('AutoLevelWidget render:' + JSON.stringify(state));

    return (
      <Widget fullscreen={isFullscreen}>
        <Widget.Header>
          <Widget.Title>
            <Widget.Sortable className={this.props.sortable.handleClassName}>
              <i className="fa fa-bars" />
              <Space width="8" />
            </Widget.Sortable>
            {isForkedWidget &&
              <i className="fa fa-code-fork" style={{ marginRight: 5 }} />
            }
            {i18n._('AutoLevel')}
          </Widget.Title>
          <Widget.Controls className={this.props.sortable.filterClassName}>
            <Widget.Button
              disabled={isFullscreen}
              title={minimized ? i18n._('Expand') : i18n._('Collapse')}
              onClick={actions.toggleMinimized}
            >
              <i
                className={classNames(
                  'fa',
                  { 'fa-chevron-up': !minimized },
                  { 'fa-chevron-down': minimized }
                )}
              />
            </Widget.Button>
            <Widget.DropdownButton
              title={i18n._('More')}
              toggle={<i className="fa fa-ellipsis-v" />}
              onSelect={(eventKey) => {
                if (eventKey === 'fullscreen') {
                  actions.toggleFullscreen();
                } else if (eventKey === 'fork') {
                  this.props.onFork();
                } else if (eventKey === 'remove') {
                  this.props.onRemove();
                }
              }}
            >
              <Widget.DropdownMenuItem eventKey="fullscreen">
                <i
                  className={classNames(
                    'fa',
                    'fa-fw',
                    { 'fa-expand': !isFullscreen },
                    { 'fa-compress': isFullscreen }
                  )}
                />
                <Space width="4" />
                {!isFullscreen ? i18n._('Enter Full Screen') : i18n._('Exit Full Screen')}
              </Widget.DropdownMenuItem>
              <Widget.DropdownMenuItem eventKey="fork">
                <i className="fa fa-fw fa-code-fork" />
                <Space width="4" />
                {i18n._('Fork Widget')}
              </Widget.DropdownMenuItem>
              <Widget.DropdownMenuItem eventKey="remove">
                <i className="fa fa-fw fa-times" />
                <Space width="4" />
                {i18n._('Remove Widget')}
              </Widget.DropdownMenuItem>
            </Widget.DropdownButton>
          </Widget.Controls>
        </Widget.Header>
        <Widget.Content
          className={classNames(
            styles.widgetContent,
            { [styles.hidden]: minimized }
          )}
        >
          {state.modal.name === MODAL_PREVIEW &&
            <MakeProbeFile state={state} actions={actions} />
          }
          {state.modal.name === MODAL_PREVIEW2 &&
            <ApplyAutoLevel state={state} actions={actions} />
          }
          <AutoLevel
            state={state}
            actions={actions}
          />
        </Widget.Content>
      </Widget>
    );
  }
}

export default AutoLevelWidget;
