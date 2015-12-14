import _ from 'lodash';
import i18n from 'i18next';
import moment from 'moment';
import pubsub from 'pubsub-js';
import React from 'react';
import ReactDOM from 'react-dom';
import THREE from 'three';
import { Widget, WidgetHeader, WidgetContent } from '../widget';
import PressAndHold from '../common/PressAndHold';
import TrackballControls from '../../lib/three/TrackballControls';
import GCodeRenderer from '../../lib/GCodeRenderer';
import PivotPoint3 from '../../lib/PivotPoint3';
import log from '../../lib/log';
import siofu from '../../lib/siofu';
import socket from '../../lib/socket';
import colorNames from '../../lib/color-names';
import './visualizer.css';

const clock = new THREE.Clock();

const COORDINATE_AXIS_LENGTH = 99999;
const WORKFLOW_STATE_RUNNING = 'running';
const WORKFLOW_STATE_PAUSED = 'paused';
const WORKFLOW_STATE_IDLE = 'idle';

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
        workflowState: WORKFLOW_STATE_IDLE
    };

    componentDidMount() {
        this.subscribe();
        this.addSocketIOFileUploadEvents();
    }
    componentWillUnmount() {
        this.removeSocketIOFileUploadEvents();
        this.unsubscribe();
    }
    componentDidUpdate() {
        this.props.setWorkflowState(this.state.workflowState);
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
    startWaiting() {
        // Adds the 'wait' class to <html>
        let root = document.documentElement;
        root.classList.add('wait');
    }
    stopWaiting() {
        // Adds the 'wait' class to <html>
        let root = document.documentElement;
        root.classList.remove('wait');
    }
    // https://github.com/vote539/socketio-file-upload#start
    siofuStart(event) {
        this.startWaiting();

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
        this.stopWaiting();

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
        this.stopWaiting();

        log.error('Upload file failed:', event);
    }
    handleUpload() {
        let el = ReactDOM.findDOMNode(this.refs.file);
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
            workflowState: WORKFLOW_STATE_RUNNING
        });
    }
    handlePause() {
        socket.emit('gcode:pause', this.state.port);
        this.setState({
            workflowState: WORKFLOW_STATE_PAUSED
        });
    }
    handleStop() {
        socket.emit('gcode:stop', this.state.port);
        pubsub.publish('gcode:stop');
        this.setState({
            workflowState: WORKFLOW_STATE_IDLE
        });
    }
    handleClose() {
        socket.emit('gcode:close', this.state.port);

        pubsub.publish('gcode:data', '');

        this.setState({
            workflowState: WORKFLOW_STATE_IDLE,
            isLoaded: false
        });
    }
    reset() {
        pubsub.publish('gcode:stop');
        pubsub.publish('gcode:data', '');
        this.setState({
            workflowState: WORKFLOW_STATE_IDLE,
            isLoaded: false
        });
    }
    render() {
        let isLoaded = this.state.isLoaded;
        let notLoaded = !isLoaded;
        let canUpload = !!this.state.port && notLoaded;
        let canRun = isLoaded && _.includes([WORKFLOW_STATE_IDLE, WORKFLOW_STATE_PAUSED], this.state.workflowState);
        let canPause = isLoaded && _.includes([WORKFLOW_STATE_RUNNING], this.state.workflowState);
        let canStop = isLoaded && _.includes([WORKFLOW_STATE_RUNNING, WORKFLOW_STATE_PAUSED], this.state.workflowState);
        let canClose = isLoaded && _.includes([WORKFLOW_STATE_IDLE], this.state.workflowState);

        return (
            <div className="btn-toolbar" role="toolbar">
                <div className="btn-group btn-group-sm" role="group">
                    <button type="button" className="btn btn-default" title={i18n._('Upload G-code')} onClick={::this.handleUpload} disabled={!canUpload}>
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

export default class Visualizer extends React.Component {
    state = {
        width: window.innerWidth,
        height: window.innerHeight
    };

    componentWillMount() {
        this.workflowState = WORKFLOW_STATE_IDLE;
        this.renderer = null;
        this.scene = null;
        this.camera = null;
        this.trackballControls = null;
        this.directionalLight = null;
        this.coordinateAxes = null;
        this.engravingCutter = null;
        this.object = null;
        this.objectRenderer = null;
    }
    componentDidMount() {
        this.subscribe();
        this.addSocketEvents();
        this.addResizeEventListener();

        let el = ReactDOM.findDOMNode(this.refs.gcodeViewer);
        this.createScene(el);
        this.resizeRenderer();

        this.pivotPoint = new PivotPoint3({
            x: 0,
            y: 0,
            z: 0
        }, (x, y, z) => { // The relative xyz position
            console.assert(this.scene instanceof THREE.Scene, 'this.scene is not an instance of THREE.Scene', this.scene);

            _.each(this.scene.children, (o) => {
                o.translateX(x);
                o.translateY(y);
                o.translateZ(z);
            });
        });
    }
    componentWillUnmount() {
        this.removeResizeEventListener();
        this.removeSocketEvents();
        this.unsubscribe();
        this.clearScene();
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
        if (!(this.objectRenderer)) {
            return;
        }

        log.trace('socketOnGCodeQueueStatus:', data);

        let frameIndex = data.executed;
        this.objectRenderer.setFrameIndex(frameIndex);
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

        let el = ReactDOM.findDOMNode(this.refs.gcodeViewer);
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

        // Creating a directional light
        let directionalLight = this.directionalLight = this.createDirectionalLight();
        directionalLight.name = 'DirectionalLight';
        scene.add(directionalLight);

        // Creating XYZ coordinate axes
        let coordinateAxes = this.coordinateAxes = this.buildCoordinateAxes(COORDINATE_AXIS_LENGTH);
        coordinateAxes.name = 'CoordinateAxes';
        scene.add(coordinateAxes);

        // Creating an engraving cutter
        let engravingCutter = this.engravingCutter = this.buildEngravingCutter();
        engravingCutter.name = 'EngravingCutter';
        scene.add(engravingCutter);

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
            // Call the render() function up to 60 times per second (i.e. 60fps)
            requestAnimationFrame(render);

            // The 'delta' is meant to return the amount of time between each frame.
            // Ideally we will have approximately 1/60 = .016666 seconds between each frame.
            let delta = clock.getDelta();

            if (this.workflowState === WORKFLOW_STATE_RUNNING) {
                // Rotate the Engraving Cutter around the z axis
                let rpm = 360; // 360 rounds per minutes
                let degrees = 360 * (delta * Math.PI / 180); // Rotates 360 degrees per second
                this.engravingCutter.rotateZ(rpm / 60 * degrees);
            } else {
                // It is necessary to set the rotation angle to zero if not running
                this.engravingCutter.rotation.z = 0;
            }

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
        // White directional light at half intensity shining from the top.
        let directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight.position.set(0, 1, 0);
        
        return _.extend(directionalLight, { name: 'DirectionalLight' });
    }
    //
    // http://soledadpenades.com/articles/three-js-tutorials/drawing-the-coordinate-axes/
    //
    buildCoordinateAxes(length) {
        let coordinateAxes = new THREE.Object3D();

        coordinateAxes.add(this.buildCoordinateAxis(new THREE.Vector3(0, 0, 0), new THREE.Vector3(length, 0, 0), colorNames.red, false)); // +X
        coordinateAxes.add(this.buildCoordinateAxis(new THREE.Vector3(0, 0, 0), new THREE.Vector3(-length, 0, 0), colorNames.red, true)); // -X
        coordinateAxes.add(this.buildCoordinateAxis(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, length, 0), colorNames.green, false)); // +Y
        coordinateAxes.add(this.buildCoordinateAxis(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -length, 0), colorNames.green, true)); // -Y
        coordinateAxes.add(this.buildCoordinateAxis(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, length), colorNames.blue, false)); // +Z
        coordinateAxes.add(this.buildCoordinateAxis(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -length), colorNames.blue, true)); // -Z

        return coordinateAxes;
    }
    buildCoordinateAxis(src, dst, colorHex, dashed) {
        let geometry = new THREE.Geometry();
        let material;

        if (dashed) {
            material = new THREE.LineDashedMaterial({
                linewidth: 1,
                color: colorHex,
                dashSize: 1,
                gapSize: 1
            });
        } else {
            material = new THREE.LineBasicMaterial({
                linewidth: 1,
                color: colorHex
            });
        }

        geometry.vertices.push(src.clone());
        geometry.vertices.push(dst.clone());
        geometry.computeLineDistances(); // This one is SUPER important, otherwise dashed lines will appear as simple plain lines

        return new THREE.Line(geometry, material);
    }
    buildEngravingCutter() {
        let radiusTop = 3;
        let radiusBottom = 0.5;
        let cylinderHeight = 30;
        let radiusSegments = 32;
        let heightSegments = 1;
        let openEnded = false;
        let thetaStart = 0;
        let thetaLength = (7 / 8) * 2 * Math.PI;

        let geometry = new THREE.CylinderGeometry(
            radiusTop,
            radiusBottom,
            cylinderHeight,
            radiusSegments,
            heightSegments,
            openEnded,
            thetaStart,
            thetaLength
        );
        // Rotates the geometry 90 degrees around the X axis.
        geometry.rotateX(Math.PI / 2);
        // Set the desired position from the origin rather than its center.
        geometry.translate(0, 0, cylinderHeight / 2);

        let material = new THREE.MeshBasicMaterial({
            color: 0x337ab7
        });

        return new THREE.Mesh(geometry, material);
    }
    renderObject(gcode) {
        // Sets the pivot point to the origin point (0, 0, 0)
        this.pivotPoint.set(0, 0, 0);

        if (this.object) {
            this.scene.remove(this.object);
            this.object = null;
        }

        // Reset TrackballControls
        this.trackballControls.reset();

        let el = ReactDOM.findDOMNode(this.refs.gcodeViewer);
        this.objectRenderer = new GCodeRenderer();
        this.objectRenderer.render({
            gcode: gcode,
            width: el.clientWidth,
            height: el.clientHeight
        }, (object, dimension) => {
            pubsub.publish('gcode:dimension', dimension);

            this.object = object;
            this.object.name = 'G-code';
            this.scene.add(this.object);

            let center = new THREE.Vector3(
                dimension.min.x + (dimension.delta.x / 2),
                dimension.min.y + (dimension.delta.y / 2),
                dimension.min.z + (dimension.delta.z / 2)
            );

            // Set the pivot point to the object's center position
            this.pivotPoint.set(center.x, center.y, center.z);
        });
    }
    setWorkflowState(workflowState) {
        this.workflowState = workflowState;
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
                <Toolbar setWorkflowState={::this.setWorkflowState} />
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

class VisualizerWidget extends React.Component {
    render() {
        return (
            <div data-component="Widgets/VisualizerWidget">
                <Widget borderless={true}>
                    <WidgetContent>
                        <Visualizer />
                    </WidgetContent>
                </Widget>
            </div>
        );
    }
}

export default VisualizerWidget;
