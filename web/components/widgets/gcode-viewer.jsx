import _ from 'lodash';
import i18n from 'i18next';
import moment from 'moment';
import pubsub from 'pubsub-js';
import React from 'react';
import THREE from 'three';
import PressAndHold from '../common/PressAndHold';
import TrackballControls from '../../lib/three/TrackballControls';
import { GCodeRenderer } from '../../lib/gcode';
import Widget, { WidgetHeader, WidgetContent } from '../widget';
import log from '../../lib/log';
import siofu from '../../lib/siofu';
import socket from '../../lib/socket';
import './gcode-viewer.css';

const AXIS_LENGTH = 99999;

class Joystick extends React.Component {
    static propTypes = {
        up: React.PropTypes.func,
        down: React.PropTypes.func,
        left: React.PropTypes.func,
        right: React.PropTypes.func,
        center: React.PropTypes.func
    };

    render() {
        let { up, down, left, right, center } = this.props;

        return (
            <div className="joystick">
                <table>
                    <tbody>
                        <tr>
                            <td></td>
                            <td className="noselect">
                                <PressAndHold
                                    className="joystick-button"
                                    onClick={up}
                                    title={i18n._('Move Up')}
                                >
                                    <i className="glyphicon glyphicon-chevron-up"></i>
                                </PressAndHold>
                            </td>
                            <td></td>
                        </tr>
                        <tr>
                            <td className="noselect">
                                <PressAndHold
                                    className="joystick-button"
                                    onClick={left}
                                    title={i18n._('Move Left')}
                                >
                                    <i className="glyphicon glyphicon-chevron-left"></i>
                                </PressAndHold>
                            </td>
                            <td className="noselect">
                                <PressAndHold
                                    className="joystick-button"
                                    onClick={center}
                                    title={i18n._('Reset Position')}
                                >
                                    <i className="glyphicon glyphicon-unchecked"></i>
                                </PressAndHold>
                            </td>
                            <td className="noselect">
                                <PressAndHold
                                    className="joystick-button"
                                    onClick={right}
                                    title={i18n._('Move Right')}
                                >
                                    <i className="glyphicon glyphicon-chevron-right"></i>
                                </PressAndHold>
                            </td>
                        </tr>
                        <tr>
                            <td></td>
                            <td className="noselect">
                                <PressAndHold
                                    className="joystick-button"
                                    onClick={down}
                                    title={i18n._('Move Down')}
                                >
                                    <i className="glyphicon glyphicon-chevron-down"></i>
                                </PressAndHold>
                            </td>
                            <td></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        );
    }
}

class Toolbar extends React.Component {
    state = {
        port: '',
        isLoaded: false,
        startTime: 0, // unix timestamp
        currentStatus: 'idle' // idle|run
    };

    componentDidMount() {
        this.subscribe();
        this.addSocketIOFileUploadEvents();
    }
    componentWillUnmount() {
        this.removeSocketIOFileUploadEvents();
        this.unsubscribe();
    }
    subscribe() {
        let that = this;

        this.pubsubTokens = [];

        { // port
            let token = pubsub.subscribe('port', (msg, port) => {
                port = port || '';
                that.setState({ port: port });

                if (!port) {
                    that.reset();
                }

            });
            this.pubsubTokens.push(token);
        }
    }
    unsubscribe() {
        _.each(this.pubsubTokens, (token) => {
            pubsub.unsubscribe(token);
        });
        this.pubsubTokens = [];
    }
    addSocketIOFileUploadEvents() {
        siofu.addEventListener('start', ::this.siofuStart);
        siofu.addEventListener('progress', ::this.siofuProgress);
        siofu.addEventListener('complete', ::this.siofuComplete);
        siofu.addEventListener('error', ::this.siofuError);
    }
    removeSocketIOFileUploadEvents() {
        siofu.removeEventListener('start', ::this.siofuOnStart);
        siofu.removeEventListener('progress', ::this.siofuOnProgress);
        siofu.removeEventListener('complete', ::this.siofuOnComplete);
        siofu.removeEventListener('error', ::this.siofuOnError);
    }
    // https://github.com/vote539/socketio-file-upload#start
    siofuStart(event) {
        log.debug('Upload start:', event);

        event.file.meta.port = this.state.port;
    }
    // Part of the file has been loaded from the file system and
    // ready to be transmitted via Socket.IO.
    // This event can be used to make an upload progress bar.
    // https://github.com/vote539/socketio-file-upload#progress
    siofuProgress(event) {
        let percent = event.bytesLoaded / event.file.size * 100;

        log.trace('File is', percent.toFixed(2), 'percent loaded');
    }
    // The server has received our file.
    // https://github.com/vote539/socketio-file-upload#complete
    siofuComplete(event) {
        log.debug('Upload complete:', event);

        if (!(event.success)) {
            log.error('File upload to the server failed.');
            return;
        }

        // event.detail
        // @param connected
        // @param queueStatus.executed
        // @param queueStatus.total

        if (!(event.detail.connected)) {
            log.error('Upload failed. The port is not open.');
            return;
        }

        this.setState({ isLoaded: true });
    }
    // The server encountered an error.
    // https://github.com/vote539/socketio-file-upload#complete
    siofuError(event) {
        log.error('Upload file failed:', event);
    }
    handleUpload() {
        let el = React.findDOMNode(this.refs.file);
        if (el) {
            el.value = ''; // Clear file input value
            el.click(); // trigger file input click
        }
    }
    handleFile(e) {
        let that = this;
        let file = e.target.files[0];
        let reader = new FileReader();

        reader.onloadend = (e) => {
            if (e.target.readyState !== FileReader.DONE) {
                return;
            }

            log.debug('FileReader:', _.pick(file, [
                'lastModified',
                'lastModifiedDate',
                'meta',
                'name',
                'size',
                'type'
            ]));

            let gcode = e.target.result;
            pubsub.publish('gcode:data', gcode);

            let files = [file];
            siofu.submitFiles(files);
        };

        reader.readAsText(file);
    }
    handleRun() {
        socket.emit('gcode:run', this.state.port);
        pubsub.publish('gcode:run');
        this.setState({
            currentStatus: 'run'
        });
    }
    handlePause() {
        socket.emit('gcode:pause', this.state.port);
        this.setState({
            currentStatus: 'pause'
        });
    }
    handleStop() {
        socket.emit('gcode:stop', this.state.port);
        pubsub.publish('gcode:stop');
        this.setState({
            currentStatus: 'idle'
        });
    }
    handleClose() {
        socket.emit('gcode:close', this.state.port);

        pubsub.publish('gcode:data', '');

        this.setState({
            currentStatus: 'idle',
            isLoaded: false
        });
    }
    reset() {
        pubsub.publish('gcode:stop');
        pubsub.publish('gcode:data', '');
        this.setState({
            currentStatus: 'idle',
            isLoaded: false
        });
    }
    render() {
        let isLoaded = this.state.isLoaded;
        let notLoaded = !isLoaded;
        let canUpload = !!this.state.port && notLoaded;
        let canRun = isLoaded && _.includes(['idle', 'pause'], this.state.currentStatus);
        let canPause = isLoaded && _.includes(['run'], this.state.currentStatus);
        let canStop = isLoaded && _.includes(['run', 'pause'], this.state.currentStatus);
        let canClose = isLoaded && _.includes(['idle'], this.state.currentStatus);

        return (
            <div className="btn-toolbar" role="toolbar">
                <div className="btn-group btn-group-sm" role="group">
                    <button type="button" className="btn btn-default" title={i18n._('Upload G-Code')} onClick={::this.handleUpload} disabled={!canUpload}>
                        <i className="glyphicon glyphicon-cloud-upload"></i>
                        <input type="file" className="hidden" ref="file" onChange={::this.handleFile} />
                    </button>
                    <button type="button" className="btn btn-default" title={i18n._('Run')} onClick={::this.handleRun} disabled={!canRun}>
                        <i className="glyphicon glyphicon-play"></i>
                    </button>
                    <button type="button" className="btn btn-default" title={i18n._('Pause')} onClick={::this.handlePause} disabled={!canPause}>
                        <i className="glyphicon glyphicon-pause"></i>
                    </button>
                    <button type="button" className="btn btn-default" title={i18n._('Stop')} onClick={::this.handleStop} disabled={!canStop}>
                        <i className="glyphicon glyphicon-stop"></i>
                    </button>
                    <button type="button" className="btn btn-default" title={i18n._('Close')} onClick={::this.handleClose} disabled={!canClose}>
                        <i className="glyphicon glyphicon-trash"></i>
                    </button>
                </div>
            </div>
        );
    }
}

export default class GCodeViewer extends React.Component {
    state = {
        width: window.innerWidth,
        height: window.innerHeight
    };

    componentWillMount() {
        this.renderer = null;
        this.scene = null;
        this.camera = null;
        this.trackballControls = null;
        this.directionalLight = null;
        this.axes = null;
        this.object = null;
        this.gcodeRenderer = null;
    }
    componentDidMount() {
        this.subscribe();
        this.addSocketEvents();
        this.addResizeEventListener();

        let el = React.findDOMNode(this.refs.gcodeViewer);
        this.createScene(el);
    }
    componentWillUnmount() {
        this.removeResizeEventListener();
        this.removeSocketEvents();
        this.unsubscribe();
        this.clearScene();
    }
    componentDidUnmount() {
        this.scene = null;
        this.renderer = null;
        this.camera = null;
        this.trackballControls = null;
        this.gcodeRenderer = null;
    }
    subscribe() {
        let that = this;

        this.pubsubTokens = [];

        { // gcode:data
            let token = pubsub.subscribe('gcode:data', (msg, gcode) => {
                gcode = gcode || '';
                that.renderObject(gcode);
            });
            this.pubsubTokens.push(token);
        }

        { // resize
            let token = pubsub.subscribe('resize', (msg) => {
                that.resizeRenderer();
            });
            this.pubsubTokens.push(token);
        }
    }
    unsubscribe() {
        _.each(this.pubsubTokens, (token) => {
            pubsub.unsubscribe(token);
        });
        this.pubsubTokens = [];
    }
    addSocketEvents() {
        socket.on('gcode:queue-status', ::this.socketOnGCodeQueueStatus);
    }
    removeSocketEvents() {
        socket.off('gcode:queue-status', ::this.socketOnGCodeQueueStatus);
    }
    socketOnGCodeQueueStatus(data) {
        if (!(this.gcodeRenderer)) {
            return;
        }

        log.trace('socketOnGCodeQueueStatus:', data);

        let frameIndex = data.executed;
        this.gcodeRenderer.setFrameIndex(frameIndex);
    }
    addResizeEventListener() {
        // handle resize event
        if (!(this.onResize)) {
            this.onResize = () => {
                this.resizeRenderer();
            };
        }
        this.onResize();
        this.onResizeThrottled = _.throttle(this.onResize, 10);
        window.addEventListener('resize', this.onResizeThrottled);
    }
    removeResizeEventListener() {
        // handle resize event
        window.removeEventListener('resize', this.onResizeThrottled);
    }
    resizeRenderer() {
        if (!(this.camera && this.renderer)) {
            return;
        }

        let el = React.findDOMNode(this.refs.gcodeViewer);
        let width = el.offsetWidth;
        let height = window.innerHeight - 50 - 1; // take off the navbar (50px) and an extra 1px space to disable scrollbar

        // Update the camera aspect ratio (width / height), and set a new size to the renderer.
        // Also see "Window on resize, and aspect ratio #69" at https://github.com/mrdoob/three.js/issues/69
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);
    }
    //
    // Creating a scene
    // http://threejs.org/docs/#Manual/Introduction/Creating_a_scene
    //
    createScene(el) {
        let width = el.clientWidth;
        let height = el.clientHeight;
        let fov = 45;
        let aspect = width / height;
        let near = 1;
        let far = 12000;

        // To actually be able to display anything with Three.js, we need three things:
        // A scene, a camera, and a renderer so we can render the scene with the camera.
        let scene = this.scene = new THREE.Scene();
        let camera = this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
        let renderer = this.renderer = new THREE.WebGLRenderer({
            autoClearColor: true
        });
        renderer.setClearColor(0xffffff, 1);
        renderer.setSize(width, height);
        el.appendChild(renderer.domElement);
        renderer.clear();

        // Creating a Directional Light
        let directionalLight = this.directionalLight = this.createDirectionalLight();
        scene.add(directionalLight);

        // Add axes
        let axes = this.axes = this.buildAxes(AXIS_LENGTH);
        scene.add(axes);

        // By default, when we call scene.add(), the thing we add will be added to the coordinates (0,0,0).
        // This would cause both the camera and the cube to be inside each other.
        // To avoid this, we simply move the camera out a bit.
        camera.position.z = 300;

        // To zoom in/out using TrackballControls
        let trackballControls = this.trackballControls = new TrackballControls(camera, renderer.domElement);
        trackballControls.rotateSpeed = 1.0;
        trackballControls.zoomSpeed = 1.2;
        trackballControls.panSpeed = 0.8;
        trackballControls.noPan = false;
        trackballControls.noZoom = false;
        trackballControls.staticMoving = true;
        trackballControls.dynamicDampingFactor = 0.3;

        // Rendering the scene
        // This will create a loop that causes the renderer to draw the scene 60 times per second.
        let render = () => {
            requestAnimationFrame(render);
            trackballControls.update();
            renderer.render(scene, camera);
        };
        render();

        return scene;
    }
    clearScene() {
        let scene = this.scene;

        // to iterrate over all children (except the first) in a scene 
        let objsToRemove = _.rest(scene.children);
        _.each(objsToRemove, (obj) => {
            scene.remove(obj);
        });
    }
    createDirectionalLight() {
        let directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight.position.set(0, 1, 0);
        
        return directionalLight;
    }
    //
    // http://soledadpenades.com/articles/three-js-tutorials/drawing-the-coordinate-axes/
    //
    buildAxes(length) {
        let axes = new THREE.Object3D();

        axes.add(this.buildAxis(new THREE.Vector3(0, 0, 0), new THREE.Vector3(length, 0, 0), 0xFF0000, false)); // +X
        axes.add(this.buildAxis(new THREE.Vector3(0, 0, 0), new THREE.Vector3(-length, 0, 0), 0xFF0000, true)); // -X
        axes.add(this.buildAxis(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, length, 0), 0x00FF00, false)); // +Y
        axes.add(this.buildAxis(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -length, 0), 0x00FF00, true)); // -Y
        axes.add(this.buildAxis(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, length), 0x0000FF, false)); // +Z
        axes.add(this.buildAxis(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -length), 0x0000FF, true)); // -Z

        return axes;
    }
    buildAxis(src, dst, colorHex, dashed) {
        let geometry = new THREE.Geometry();
        let material;

        if (dashed) {
            material = new THREE.LineDashedMaterial({
                linewidth: 3,
                color: colorHex,
                dashSize: 3,
                gapSize: 3
            });
        } else {
            material = new THREE.LineBasicMaterial({
                linewidth: 3,
                color: colorHex
            });
        }

        geometry.vertices.push(src.clone());
        geometry.vertices.push(dst.clone());
        geometry.computeLineDistances(); // This one is SUPER important, otherwise dashed lines will appear as simple plain lines

        let axis = new THREE.Line(geometry, material);

        return axis;
    }
    renderObject(gcode) {
        if (this.object) {
            this.scene.remove(this.object);
        }

        // Reset TrackballControls
        this.trackballControls.reset();

        let el = React.findDOMNode(this.refs.gcodeViewer);
        this.gcodeRenderer = new GCodeRenderer();
        this.object = this.gcodeRenderer.render({
            gcode: gcode,
            width: el.clientWidth,
            height: el.clientHeight
        }, function(dimension) {
            pubsub.publish('gcode:dimension', dimension);
        }.bind(this));

        this.scene.add(this.object);
    }
    joystickUp() {
        let { x, y, z } = this.trackballControls.target;
        this.trackballControls.target.set(x, y - 2, z);
    }
    joystickDown() {
        let { x, y, z } = this.trackballControls.target;
        this.trackballControls.target.set(x, y + 2, z);
    }
    joystickLeft() {
        let { x, y, z } = this.trackballControls.target;
        this.trackballControls.target.set(x + 2, y, z);
    }
    joystickRight() {
        let { x, y, z } = this.trackballControls.target;
        this.trackballControls.target.set(x - 2, y, z);
    }
    resetCamera() {
        this.trackballControls.reset();
    }
    render() {
        return (
            <div>
                <Toolbar />
                <Joystick
                    up={::this.joystickUp}
                    down={::this.joystickDown}
                    left={::this.joystickLeft}
                    right={::this.joystickRight}
                    center={::this.resetCamera}
                />
                <div ref="gcodeViewer" className="preview" />
            </div>
        );
    }
}

export default class GCodeViewerWidget extends React.Component {
    render() {
        return (
            <div data-component="Widgets/GCodeViewerWidget">
                <Widget borderless={true}>
                    <WidgetContent>
                        <GCodeViewer />
                    </WidgetContent>
                </Widget>
            </div>
        );
    }
}
