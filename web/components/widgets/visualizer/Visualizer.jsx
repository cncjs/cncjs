import _ from 'lodash';
import colornames from 'colornames';
import pubsub from 'pubsub-js';
import React from 'react';
import ReactDOM from 'react-dom';
import THREE from 'three';
import OrbitControls from '../../../lib/three/OrbitControls';
import log from '../../../lib/log';
import socket from '../../../lib/socket';
import Joystick from './Joystick';
import Toolbar from './Toolbar';
import FileUploader from './FileUploader';
import { fitCameraToObject, getBoundingBox, loadTexture } from './helpers';
import CoordinateAxes from './CoordinateAxes';
import EngravingCutter from './EngravingCutter';
import GridLine from './GridLine';
import PivotPoint3 from './PivotPoint3';
import TextSprite from './TextSprite';
import GCodePath from './GCodePath';
import {
    COORDINATE_PLANE_XY,
    COORDINATE_PLANE_XZ,
    COORDINATE_PLANE_YZ,
    AXIS_LENGTH,
    GRID_X_LENGTH,
    GRID_Y_LENGTH,
    GRID_X_SPACING,
    GRID_Y_SPACING,
    ACTIVE_STATE_IDLE,
    ACTIVE_STATE_RUN,
    WORKFLOW_STATE_RUNNING,
    WORKFLOW_STATE_PAUSED,
    WORKFLOW_STATE_IDLE,
    CAMERA_FOV,
    CAMERA_NEAR,
    CAMERA_FAR,
    CAMERA_POSITION_X,
    CAMERA_POSITION_Y,
    CAMERA_POSITION_Z
} from './constants';
import { MODAL_GROUPS } from '../../../constants/modal-groups';

class Visualizer extends React.Component {
    state = {
        port: '',
        ready: false,
        activeState: ACTIVE_STATE_IDLE,
        workflowState: WORKFLOW_STATE_IDLE,
        boundingBox: {
            min: {
                x: 0,
                y: 0,
                z: 0
            },
            max: {
                x: 0,
                y: 0,
                z: 0
            }
        }
    };
    socketEventListener = {
        'grbl:gcode-modes': ::this.socketOnGrblGCodeModes,
        'grbl:current-status': ::this.socketOnGrblCurrentStatus,
        'gcode:queue-status': ::this.socketOnGCodeQueueStatus
    };

    componentWillMount() {
        // Grbl
        this.modalState = {};
        this.gcodePath = null;
        // Three.js
        this.renderer = null;
        this.scene = null;
        this.camera = null;
        this.controls = null;
        this.group = new THREE.Group();
    }
    componentDidMount() {
        this.subscribe();
        this.addSocketEventListener();
        this.addResizeEventListener();

        let el = ReactDOM.findDOMNode(this.refs.visualizer);
        this.createScene(el);
        this.resizeRenderer();

        this.pivotPoint = new PivotPoint3({
            x: 0,
            y: 0,
            z: 0
        }, (x, y, z) => { // The relative xyz position
            _.each(this.group.children, (o) => {
                o.translateX(x);
                o.translateY(y);
                o.translateZ(z);
            });

            // Update the scene
            this.updateScene();
        });
    }
    componentWillUnmount() {
        this.removeResizeEventListener();
        this.removeSocketEventListener();
        this.unsubscribe();
        this.clearScene();
    }
    shouldComponentUpdate(nextProps, nextState) {
        let shouldUpdate =
            (nextState.port !== this.state.port) ||
            (nextState.ready !== this.state.ready) ||
            (nextState.activeState !== this.state.activeState) ||
            (nextState.workflowState !== this.state.workflowState) ||
            !(_.isEqual(nextState.boundingBox, this.state.boundingBox));

        return shouldUpdate;
    }
    componentDidUpdate(prevProps, prevState) {
        // The renderAnimationLoop will check the state of activeState and workflowState
        requestAnimationFrame(::this.renderAnimationLoop);
    }
    subscribe() {
        this.pubsubTokens = [];

        { // port
            let token = pubsub.subscribe('port', (msg, port) => {
                port = port || '';

                if (!port) {
                    pubsub.publish('gcode:unload');
                    this.setState({ port: '' });
                } else {
                    this.setState({ port: port });
                }

            });
            this.pubsubTokens.push(token);
        }

        { // gcode:load
            let token = pubsub.subscribe('gcode:load', (msg, gcode) => {
                gcode = gcode || '';

                this.setState({ ready: true });

                // It may take some time to render the G-code
                setTimeout(() => {
                    this.startWaiting();

                    this.loadGCode(gcode, (options) => {
                        pubsub.publish('gcode:boundingBox', options.boundingBox);

                        this.setState({
                            boundingBox: options.boundingBox
                        });

                        this.stopWaiting();
                    });
                }, 0);
            });
            this.pubsubTokens.push(token);
        }

        { // gcode:unload
            let token = pubsub.subscribe('gcode:unload', (msg) => {
                this.unloadGCode();
                this.setState({ ready: false });
            });
            this.pubsubTokens.push(token);
        }

        { // resize
            let token = pubsub.subscribe('resize', (msg) => {
                this.resizeRenderer();
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
    addSocketEventListener() {
        _.each(this.socketEventListener, (callback, eventName) => {
            socket.on(eventName, callback);
        });
    }
    removeSocketEventListener() {
        _.each(this.socketEventListener, (callback, eventName) => {
            socket.off(eventName, callback);
        });
    }
    socketOnGrblGCodeModes(modes) {
        let modalState = {};

        _.each(modes, (mode) => {
            // Gx, Mx
            if (mode.indexOf('G') === 0 || mode.indexOf('M') === 0) {
                let r = _.find(MODAL_GROUPS, (group) => {
                    return _.includes(group.modes, mode);
                });
                if (r) {
                    _.set(modalState, r.group, mode);
                }
            }
        });

        this.modalState = modalState;
    }
    socketOnGrblCurrentStatus(data) {
        let { activeState, workingPos } = data;

        if (this.state.activeState !== activeState) {
            this.setState({ activeState: activeState });
        }
        this.setEngravingCutterPosition(workingPos.x, workingPos.y, workingPos.z);

        // Update the scene
        this.updateScene();
    }
    socketOnGCodeQueueStatus(data) {
        if (!(this.gcodePath)) {
            return;
        }

        log.trace('socketOnGCodeQueueStatus:', data);

        let frameIndex = data.executed;
        this.gcodePath.setFrameIndex(frameIndex);
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

        let el = ReactDOM.findDOMNode(this.refs.visualizer);
        let width = el.offsetWidth;
        let height = window.innerHeight - 50 - 1; // take off the navbar (50px) and an extra 1px space to disable scrollbar

        // Update the camera aspect ratio (width / height), and set a new size to the renderer.
        // Also see "Window on resize, and aspect ratio #69" at https://github.com/mrdoob/three.js/issues/69
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);

        // Update the scene
        this.updateScene();
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

        { // Creating a directional light
            let directionalLight = this.createDirectionalLight();
            directionalLight.name = 'DirectionalLight';
            this.group.add(directionalLight);
        }

        { // Creating the coordinate grid
            let gridLine = new GridLine(
                GRID_X_LENGTH,
                GRID_X_SPACING,
                GRID_Y_LENGTH,
                GRID_Y_SPACING,
                colornames('blue'), // center line
                colornames('gray 44') // grid
            );
            _.each(gridLine.children, (o) => {
                o.material.opacity = 0.15;
                o.material.transparent = true;
                o.material.depthWrite = false;
            });
            gridLine.name = 'GridLine';
            this.group.add(gridLine);
        }

        { // Creating coordinate axes
            let coordinateAxes = new CoordinateAxes(AXIS_LENGTH);
            coordinateAxes.name = 'CoordinateAxes';
            this.group.add(coordinateAxes);
        }

        { // Creating axis labels
            let axisXLabel = new TextSprite({
                x: AXIS_LENGTH + 10,
                y: 0,
                z: 0,
                size: 20,
                text: 'X',
                color: colornames('red')
            });
            let axisYLabel = new TextSprite({
                x: 0,
                y: AXIS_LENGTH + 10,
                z: 0,
                size: 20,
                text: 'Y',
                color: colornames('green')
            });
            let axisZLabel = new TextSprite({
                x: 0,
                y: 0,
                z: AXIS_LENGTH + 10,
                size: 20,
                text: 'Z',
                color: colornames('blue')
            });

            this.group.add(axisXLabel);
            this.group.add(axisYLabel);
            this.group.add(axisZLabel);

            for (let i = -GRID_X_LENGTH; i <= GRID_X_LENGTH; i += 50) {
                if (i === 0) {
                    continue;
                }
                let textLabel = new TextSprite({
                    x: i,
                    y: 10,
                    z: 0,
                    size: 8,
                    text: i,
                    color: colornames('red'),
                    opacity: 0.5
                });
                this.group.add(textLabel);
            }
            for (let i = -GRID_Y_LENGTH; i <= GRID_Y_LENGTH; i += 50) {
                if (i === 0) {
                    continue;
                }
                let textLabel = new TextSprite({
                    x: -10,
                    y: i,
                    z: 0,
                    size: 8,
                    text: i,
                    color: colornames('green'),
                    opacity: 0.5
                });
                this.group.add(textLabel);
            }
        }

        { // Creating an engraving cutter
            let color = colornames('silver');
            let url = 'textures/brushed-steel-texture.jpg';
            loadTexture(url, (err, texture) => {
                let engravingCutter = new EngravingCutter(color, texture);
                engravingCutter.name = 'EngravingCutter';
                this.group.add(engravingCutter);

                // Update the scene
                this.updateScene();
            });
        }

        this.scene.add(this.group);

        this.controls = this.createOrbitControls(this.camera, this.renderer.domElement);
        this.controls.addEventListener('change', () => {
            // Update the scene
            this.updateScene();
        });

        return this.scene;
    }
    updateScene() {
        this.renderer.render(this.scene, this.camera);
    }
    clearScene() {
        // to iterrate over all children (except the first) in a scene 
        let objsToRemove = _.rest(this.scene.children);
        _.each(objsToRemove, (obj) => {
            this.scene.remove(obj);
        });

        // Update the scene
        this.updateScene();
    }
    renderAnimationLoop() {
        let isAgitated = (this.state.activeState === ACTIVE_STATE_RUN) &&
                         (this.state.workflowState === WORKFLOW_STATE_RUNNING);

        if (isAgitated) {
            // Call the render() function up to 60 times per second (i.e. 60fps)
            requestAnimationFrame(::this.renderAnimationLoop);

            // Set to 360 rounds per minute (rpm)
            this.rotateEngravingCutter(360);
        } else {

            // Stop rotation
            this.rotateEngravingCutter(0);
        }

        this.updateScene();
    }
    createRenderer(width, height) {
        let renderer = new THREE.WebGLRenderer({
            autoClearColor: true
        });
        renderer.setClearColor(new THREE.Color(colornames('white'), 1.0));
        renderer.setSize(width, height);
        renderer.clear();

        return renderer;
    }
    createPerspectiveCamera(width, height) {
        let fov = CAMERA_FOV;
        let aspect = Number(width) / Number(height);
        let near = CAMERA_NEAR;
        let far = CAMERA_FAR;
        let camera = new THREE.PerspectiveCamera(fov, aspect, near, far);

        camera.position.x = CAMERA_POSITION_X;
        camera.position.y = CAMERA_POSITION_Y;
        camera.position.z = CAMERA_POSITION_Z;

        return camera;
    }
    // OrbitControls, on the other hand, can be used in static scenes in which the scene is rendered only when the mouse is moved, like so:
    // controls.addEventListener('change', render);
    createOrbitControls(object, domElement) {
        let controls = new THREE.OrbitControls(object, domElement);

        _.extend(controls, {
            enableKeys: false, // Disable use of the keys
            rotateSpeed: 0.3,
            zoomSpeed: 0.5,
            panSpeed: 1.0,
            // Set to true to enable damping (inertia)
            // If damping is enabled, you must call controls.update() in your animation loop
            enableDamping: true,
            dampingFactor: 0.25
        });

        return controls;
    }
    createDirectionalLight() {
        let directionalLight = new THREE.DirectionalLight(colornames('whitesmoke'), 0.5);

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
    // Sets the position of the engraving cutter
    // @param {number} x The position along the x axis
    // @param {number} y The position along the y axis
    // @param {number} z The position along the z axis
    setEngravingCutterPosition(x, y, z) {
        let engravingCutter = this.group.getObjectByName('EngravingCutter');
        if (!engravingCutter) {
            return;
        }

        let pivotPoint = this.pivotPoint.get();
        x = (Number(x) || 0) - pivotPoint.x;
        y = (Number(y) || 0) - pivotPoint.y;
        z = (Number(z) || 0) - pivotPoint.z;

        engravingCutter.position.set(x, y, z);
    }
    // Rotates the engraving cutter around the z axis with a given rpm and an optional fps
    // @param {number} rpm The rounds per minutes
    // @param {number} [fps] The frame rate (Defaults to 60 frames per second)
    rotateEngravingCutter(rpm = 0, fps = 60) {
        let engravingCutter = this.group.getObjectByName('EngravingCutter');
        if (!engravingCutter) {
            return;
        }

        let delta = 1 / fps;
        let degrees = 360 * (delta * Math.PI / 180); // Rotates 360 degrees per second
        engravingCutter.rotateZ(-(rpm / 60 * degrees)); // rotate in clockwise direction
    }
    loadGCode(gcode, callback) {
        // Remove previous G-code object
        this.unloadGCode();

        let el = ReactDOM.findDOMNode(this.refs.visualizer);

        this.gcodePath = new GCodePath({ modalState: this.modalState });
        this.gcodePath.render({
            gcode: gcode,
            width: el.clientWidth,
            height: el.clientHeight
        }, (pathObject) => {
            pathObject.name = 'GCodePath';
            this.group.add(pathObject);

            let bbox = getBoundingBox(pathObject);
            let dX = bbox.max.x - bbox.min.x;
            let dY = bbox.max.y - bbox.min.y;
            let dZ = bbox.max.z - bbox.min.z;
            let center = new THREE.Vector3(
                bbox.min.x + (dX / 2),
                bbox.min.y + (dY / 2),
                bbox.min.z + (dZ / 2)
            );

            // Set the pivot point to the object's center position
            this.pivotPoint.set(center.x, center.y, center.z);

            { // Fit the camera to object
                let objectWidth = dX;
                let objectHeight = dY;
                let lookTarget = new THREE.Vector3(0, 0, bbox.max.z);

                fitCameraToObject(this.camera, objectWidth, objectHeight, lookTarget);
            }

            // Update the scene
            this.updateScene();

            (typeof callback === 'function') && callback({ boundingBox: bbox });
        });
    }
    unloadGCode() {
        let pathObject = this.group.getObjectByName('GCodePath');
        if (pathObject) {
            this.group.remove(pathObject);
        }

        // Sets the pivot point to the origin point (0, 0, 0)
        this.pivotPoint.set(0, 0, 0);

        // Reset controls
        this.controls.reset();

        // Update the scene
        this.updateScene();
    }
    setWorkflowState(workflowState) {
        this.setState({ workflowState: workflowState });
    }
    pan(deltaX, deltaY) {
        let domElement = this.renderer.domElement;
        let element = (domElement === document) ? domElement.body : domElement;
        this.controls.constraint.pan(deltaX, deltaY, element.clientWidth, element.clientHeight);
        this.controls.update();
    }
    // http://stackoverflow.com/questions/18581225/orbitcontrol-or-trackballcontrol
    joystickUp() {
        if (!(this.state.ready)) {
            return;
        }

        if (this.controls.enablePan) {
            let { keyPanSpeed } = this.controls;
            this.pan(0, keyPanSpeed);
        }
    }
    joystickDown() {
        if (!(this.state.ready)) {
            return;
        }

        if (this.controls.enablePan) {
            let { keyPanSpeed } = this.controls;
            this.pan(0, -keyPanSpeed);
        }
    }
    joystickLeft() {
        if (!(this.state.ready)) {
            return;
        }

        if (this.controls.enablePan) {
            let { keyPanSpeed } = this.controls;
            this.pan(keyPanSpeed, 0);
        }
    }
    joystickRight() {
        if (!(this.state.ready)) {
            return;
        }

        if (this.controls.enablePan) {
            let { keyPanSpeed } = this.controls;
            this.pan(-keyPanSpeed, 0);
        }
    }
    joystickCenter() {
        if (!(this.state.ready)) {
            return;
        }

        this.controls.reset();
    }
    render() {
        let { port, ready, activeState } = this.state;
        let hasLoaded = !!port && ready;
        let notLoaded = !hasLoaded;

        return (
            <div>
                <Toolbar
                    port={port}
                    ready={ready}
                    setWorkflowState={::this.setWorkflowState}
                    activeState={activeState}
                />
                <Joystick
                    ready={ready}
                    up={::this.joystickUp}
                    down={::this.joystickDown}
                    left={::this.joystickLeft}
                    right={::this.joystickRight}
                    center={::this.joystickCenter}
                />
                {notLoaded && 
                    <FileUploader port={port} />
                }
                <div ref="visualizer" className="visualizer" />
            </div>
        );
    }
}

export default Visualizer;
