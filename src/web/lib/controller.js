import pubsub from 'pubsub-js';
import i18n from './i18n';
import log from './log';
import socket from './socket';
import {
    GRBL,
    TINYG2,
    WORKFLOW_STATE_IDLE
} from '../constants';

class CNCController {
    callbacks = {
        'serialport:list': [],
        'serialport:open': [],
        'serialport:close': [],
        'serialport:error': [],
        'serialport:read': [],
        'serialport:write': [],
        'gcode:statuschange': [],
        'Grbl:state': [],
        'TinyG2:state': []
    };

    port = '';
    workflowState = WORKFLOW_STATE_IDLE;
    type = '';
    state = {};

    constructor() {
        pubsub.subscribe('port', (msg, port) => {
            this.port = port;
            if (!this.port) {
                this.workflowState = WORKFLOW_STATE_IDLE;
                this.type = '';
                this.state = {};
            }
        });

        pubsub.subscribe('workflowState', (msg, workflowState) => {
            this.workflowState = workflowState;
        });

        Object.keys(this.callbacks).forEach((eventName) => {
            socket.on(eventName, (...args) => {
                log.debug('socket.on("' + eventName + '"):', args);

                if (eventName === 'Grbl:state') {
                    this.type = GRBL;
                    this.state = { ...args[0] };
                }
                if (eventName === 'TinyG2:state') {
                    this.type = TINYG2;
                    this.state = { ...args[0] };
                }

                this.callbacks[eventName].forEach((callback) => {
                    callback.apply(callback, args);
                });
            });
        });
    }
    on(eventName, callback) {
        let callbacks = this.callbacks[eventName];
        if (!callbacks) {
            log.error('Undefined event name:', eventName);
            return;
        }
        if (typeof callback === 'function') {
            callbacks.push(callback);
        }
    }
    off(eventName, callback) {
        let callbacks = this.callbacks[eventName];
        if (!callbacks) {
            log.error('Undefined event name:', eventName);
            return;
        }
        if (typeof callback === 'function') {
            callbacks.splice(callbacks.indexOf(callback), 1);
        }
    }
    openPort(port, options) {
        socket.emit('open', port, options);
    }
    closePort(port) {
        socket.emit('close', port);
    }
    listAllPorts() {
        socket.emit('list');
    }
    // @param {string} cmd The command string
    // @example Example Usage
    // - Load G-code
    //   controller.command('load', name, gcode, callback)
    // - Unload G-code
    //   controller.command('unload')
    // - Start sending G-code
    //   controller.command('start')
    // - Stop sending G-code
    //   controller.command('stop')
    // - Pause
    //   controller.command('pause')
    // - Resume
    //   controller.command('resume')
    // - Feed Hold
    //   controller.command('feedhold')
    // - Cycle Start
    //   controller.command('cyclestart')
    // - Reset
    //   controller.command('reset')
    // - Homing
    //   controller.command('homing')
    // - Unlock
    //   controller.command('unlock')
    // - G-code
    //   controller.command('gcode', 'G0X0Y0')
    command(cmd, ...args) {
        const { port } = this;
        if (!port) {
            return;
        }
        socket.emit.apply(socket, ['command', port, cmd].concat(args));
    }
    // @param {string} data The data to write
    write(data) {
        const { port } = this;
        if (!port) {
            return;
        }
        socket.emit('write', port, data);
    }
    // @param {string} data The data to write
    writeln(data) {
        data = ('' + data).trim() + '\n';
        this.write(data);
    }
}

export const mapGCodeToText = (word) => {
    const wordText = {
        // Motion
        'G0': i18n._('Rapid Move'),
        'G1': i18n._('Linear Move'),
        'G2': i18n._('CW Arc'),
        'G3': i18n._('CCW Arc'),
        'G38.2': i18n._('Probing'),
        'G38.3': i18n._('Probing'),
        'G38.4': i18n._('Probing'),
        'G38.5': i18n._('Probing'),
        'G80': i18n._('Cancel Mode'),

        // Work Coordinate System
        'G54': 'G54 (P1)',
        'G55': 'G55 (P2)',
        'G56': 'G56 (P3)',
        'G57': 'G57 (P4)',
        'G58': 'G58 (P5)',
        'G59': 'G59 (P6)',

        // Plane
        'G17': i18n._('XY Plane'),
        'G18': i18n._('XZ Plane'),
        'G19': i18n._('YZ Plane'),

        // Units
        'G20': i18n._('Inches'),
        'G21': i18n._('Millimeters'),

        // Path
        'G61': i18n._('Exact Stop'),
        'G61.1': i18n._('Exact Path'),
        'G64': i18n._('Continuous'),

        // Distance
        'G90': i18n._('Absolute'),
        'G91': i18n._('Relative'),

        // Feed Rate
        'G93': i18n._('Inverse Time'),
        'G94': i18n._('Units/Min'),

        // Tool Length Offset
        'G43.1': i18n._('Active Tool Offset'),
        'G49': i18n._('No Tool Offset'),

        // Program
        'M0': i18n._('Stop'),
        'M1': i18n._('Stop'),
        'M2': i18n._('End'),
        'M30': i18n._('End'),

        // Spindle
        'M3': i18n._('On (CW)'),
        'M4': i18n._('On (CCW)'),
        'M5': i18n._('Off'),

        // Coolant
        'M7': i18n._('Mist'),
        'M8': i18n._('Flood'),
        'M9': i18n._('Off')
    };

    return (wordText[word] || word);
};

const controller = new CNCController();

export default controller;
