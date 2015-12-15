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
const CAMERA_DEFAULT_FOV = 50;
const CAMERA_DEFAULT_POSITION_X = 0;
const CAMERA_DEFAULT_POSITION_Y = 0;
const CAMERA_DEFAULT_POSITION_Z = 200; // Move the camera out a bit from the origin (0, 0, 0)

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
        socket.on('grbl:current-status', ::this.socketOnGrblCurrentStatus);
        socket.on('gcode:queue-status', ::this.socketOnGCodeQueueStatus);
    }
    removeSocketEvents() {
        socket.off('grbl:current-status', ::this.socketOnGrblCurrentStatus);
        socket.off('gcode:queue-status', ::this.socketOnGCodeQueueStatus);
    }
    socketOnGrblCurrentStatus(data) {
        let { workingPos } = data;
        this.setEngravingCutterPosition(workingPos.x, workingPos.y, workingPos.z);
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

        // To actually be able to display anything with Three.js, we need three things:
        // A scene, a camera, and a renderer so we can render the scene with the camera.
        this.scene = new THREE.Scene();

        // Creating a renderer
        this.renderer = this.createRenderer(width, height);
        el.appendChild(this.renderer.domElement);

        // Creating a perspective camera
        this.camera = this.createPerspectiveCamera(width, height);

        // Creating a directional light
        this.directionalLight = this.createDirectionalLight();
        this.directionalLight.name = 'DirectionalLight';
        this.scene.add(this.directionalLight);

        // Creating XYZ coordinate axes
        this.coordinateAxes = this.createCoordinateAxes(COORDINATE_AXIS_LENGTH);
        this.coordinateAxes.name = 'CoordinateAxes';
        this.scene.add(this.coordinateAxes);

        // Creating an engraving cutter
        this.engravingCutter = this.createEngravingCutter();
        this.engravingCutter.name = 'EngravingCutter';
        this.scene.add(this.engravingCutter);

        // To zoom in/out using TrackballControls
        this.trackballControls = this.createTrackballControls(this.camera, this.renderer.domElement);

        // Rendering the scene
        // This will create a loop that causes the renderer to draw the scene 60 times per second.
        let render = () => {
            // Call the render() function up to 60 times per second (i.e. 60fps)
            requestAnimationFrame(render);

            if (this.workflowState === WORKFLOW_STATE_RUNNING) {
                this.rotateEngravingCutter(120); // 120 rounds per minute (rpm)
            } else {
                this.rotateEngravingCutter(0); // Stop rotation
            }

            this.trackballControls.update();

            this.renderer.render(this.scene, this.camera);
        };
        render();

        return this.scene;
    }
    clearScene() {
        let scene = this.scene;

        // to iterrate over all children (except the first) in a scene 
        let objsToRemove = _.rest(scene.children);
        _.each(objsToRemove, (obj) => {
            scene.remove(obj);
        });
    }
    createRenderer(width, height) {
        let renderer = new THREE.WebGLRenderer({
            autoClearColor: true
        });
        renderer.setClearColor(new THREE.Color(colorNames.white, 1.0));
        renderer.setSize(width, height);
        renderer.shadowMap.enabled = true;
        renderer.clear();

        return renderer;
    }
    createPerspectiveCamera(width, height) {
        let fov = CAMERA_DEFAULT_FOV;
        let aspect = Number(width) / Number(height);
        let near = 0.1;
        let far = 2000;
        let camera = new THREE.PerspectiveCamera(fov, aspect, near, far);

        camera.position.x = CAMERA_DEFAULT_POSITION_X;
        camera.position.y = CAMERA_DEFAULT_POSITION_Y;
        camera.position.z = CAMERA_DEFAULT_POSITION_Z;

        return camera;
    }
    createTrackballControls(object, domElement) {
        let trackballControls = new TrackballControls(object, domElement);

        _.extend(trackballControls, {
            rotateSpeed: 1.0,
            zoomSpeed: 1.2,
            panSpeed: 0.8,
            noPan: false,
            noZoom: false,
            staticMoving: true,
            dynamicDampingFactor: 0.3
        });

        return trackballControls;
    }
    createDirectionalLight() {
        let directionalLight = new THREE.DirectionalLight(colorNames.gold, 0.5);

        directionalLight.position.set(-40, 60, -10);
        directionalLight.castShadow = true;
        directionalLight.shadowCameraNear = 2;
        directionalLight.shadowCameraFar = 200;
        directionalLight.shadowCameraLeft = -50;
        directionalLight.shadowCameraRight = 50;
        directionalLight.shadowCameraTop = 50;
        directionalLight.shadowCameraBottom = -50;
        directionalLight.distance = 0;
        directionalLight.intensity = 0.5;
        directionalLight.shadowMapHeight = 1024;
        directionalLight.shadowMapWidth = 1024;
        
        return directionalLight;
    }
    // Creates the coordinate axes
    // @see [Drawing the Coordinate Axes]{@http://soledadpenades.com/articles/three-js-tutorials/drawing-the-coordinate-axes/}
    createCoordinateAxes(length) {
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
    // Creates an engraving cutter
    createEngravingCutter() {
        let radiusTop = 3;
        let radiusBottom = 0.5;
        let cylinderHeight = 30;
        let radiusSegments = 6;
        let heightSegments = 1;
        let openEnded = false;
        let thetaStart = 0;
        let thetaLength = 2 * Math.PI;

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
            color: colorNames.steelblue
        });

        return new THREE.Mesh(geometry, material);
    }
    // Sets the position of the engraving cutter
    // @param {number} x The position along the x axis
    // @param {number} y The position along the y axis
    // @param {number} z The position along the z axis
    setEngravingCutterPosition(x, y, z) {
        if (!(this.engravingCutter)) {
            return;
        }

        let pivotPoint = this.pivotPoint.get();
        x = (Number(x) || 0) - pivotPoint.x;
        y = (Number(y) || 0) - pivotPoint.y;
        z = (Number(z) || 0) - pivotPoint.z;

        this.engravingCutter.position.set(x, y, z);
    }
    // Rotates the engraving cutter around the z axis with a given rpm and an optional fps
    // @param {number} rpm The rounds per minutes
    // @param {number} [fps] The frame rate (Defaults to 60 frames per second)
    rotateEngravingCutter(rpm = 0, fps = 60) {
        if (!(this.engravingCutter)) {
            return;
        }

        let delta = 1 / fps;
        let degrees = 360 * (delta * Math.PI / 180); // Rotates 360 degrees per second
        this.engravingCutter.rotateZ(rpm / 60 * degrees);
    }
    resetCameraSettings() {
    }
    // Fits camera to object
    // @param {number} width The object width
    // @param {number} height The object height
    // @param {THREE.Vector3} [lookTarget] The object's top position which is nearest to the camera
    //
    // http://stackoverflow.com/questions/14614252/how-to-fit-camera-to-object
    //
    // To match the object height with the visible height
    //   fov = 2 * Math.atan(height / (2 * dist)) * ( 180 / Math.PI); // in degrees
    //
    // To match the object width with the visible width
    //   fov = 2 * Math.atan((width / aspect) / (2 * dist)) * (180 / Math.PI); // in degrees
    //
    fitCameraToObject(width, height, lookTarget) {
        console.assert(_.isNumber(width));
        console.assert(_.isNumber(height));
        console.assert(lookTarget instanceof THREE.Vector3);

        let v1 = (lookTarget instanceof THREE.Vector3) ? lookTarget : new THREE.Vector3(0, 0, 0);
        let v2 = new THREE.Vector3(
            this.camera.position.x,
            this.camera.position.y,
            this.camera.position.z
        );
        let dist = v1.distanceTo(v2); // the distance from the camera to the closest face of the object
        let aspect = this.camera.aspect; // the aspect ratio of the canvas (width / height)

        width = Number(width) || 0;
        height = Number(height) || 0;

        // Pick the largest camera field-of-view
        let fov = Math.max(
            2 * Math.atan(height / (2 * dist)) * (180 / Math.PI),
            2 * Math.atan((width / aspect) / (2 * dist)) * (180 / Math.PI)
        );
        fov = fov || CAMERA_DEFAULT_FOV;

        this.camera.fov = fov;
        this.camera.updateProjectionMatrix();

        log.debug('fitCameraToObject:', {
            width: width,
            height: height,
            dist: dist,
            fov: fov
        });
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

            { // Fit the camera to object
                let objectWidth = dimension.delta.x;
                let objectHeight = dimension.delta.y;
                let lookTarget = new THREE.Vector3(0, 0, dimension.max.z);

                this.fitCameraToObject(objectWidth, objectHeight, lookTarget);
            }

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
