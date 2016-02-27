import _ from 'lodash';
import colornames from 'colornames';
import pubsub from 'pubsub-js';
import React from 'react';
import ReactDOM from 'react-dom';
import THREE from 'three';
import OrbitControls from '../../../lib/three/OrbitControls';
import log from '../../../lib/log';
import controller from '../../../lib/controller';
import Joystick from './Joystick';
import Toolbar from './Toolbar';
import FileUploader from './FileUploader';
import { fitCameraToObject, getBoundingBox, loadTexture } from './helpers';
import CoordinateAxes from './CoordinateAxes';
import ToolHead from './ToolHead';
import GridLine from './GridLine';
import PivotPoint3 from './PivotPoint3';
import TextSprite from './TextSprite';
import GCodeVisualizer from './GCodeVisualizer';
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

class Visualizer extends React.Component {
    state = {
        port: '',
        ready: false,
        activeState: ACTIVE_STATE_IDLE,
        workingPos: {
            x: 0,
            y: 0,
            z: 0
        },
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
    controllerEvents = {
        'grbl:parserstate': (parserstate) => {
            this.parserstate = parserstate;
        },
        'grbl:status': (data) => {
            let { activeState, workingPos } = data;

            if (this.state.activeState !== activeState) {
                this.setState({ activeState: activeState });
            }

            if (!(_.isEqual(this.state.workingPos, workingPos))) {
                this.setState({ workingPos: workingPos });

                this.setToolHeadPosition(workingPos.x, workingPos.y, workingPos.z);

                // Update the scene
                this.updateScene();
            }
        },
        'gcode:statuschange': (data) => {
            if (!(this.gcodeVisualizer)) {
                return;
            }

            let frameIndex = data.sent;
            this.gcodeVisualizer.setFrameIndex(frameIndex);
        }
    };
    pubsubTokens = [];

    componentWillMount() {
        // Grbl
        this.parserstate = {};
        this.gcodeVisualizer = null;
        // Three.js
        this.renderer = null;
        this.scene = null;
        this.camera = null;
        this.controls = null;
        this.group = new THREE.Group();
    }
    componentDidMount() {
        this.subscribe();
        this.addControllerEvents();
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
        this.removeControllerEvents();
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

                this.startWaiting();

                this.loadGCode(gcode, (options) => {
                    pubsub.publish('gcode:boundingBox', options.boundingBox);

                    this.setState({
                        ready: true,
                        boundingBox: options.boundingBox
                    });

                    this.stopWaiting();
                });
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
    addControllerEvents() {
        _.each(this.controllerEvents, (callback, eventName) => {
            controller.on(eventName, callback);
        });
    }
    removeControllerEvents() {
        _.each(this.controllerEvents, (callback, eventName) => {
            controller.off(eventName, callback);
        });
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

        // Perspective camera
        this.camera = this.createPerspectiveCamera(width, height);

        // Ambient light
        let light = new THREE.AmbientLight(colornames('gray 25')); // soft white light
        this.scene.add(light);

        { // Coordinate Grid
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

        { // Coordinate Axes
            let coordinateAxes = new CoordinateAxes(AXIS_LENGTH);
            coordinateAxes.name = 'CoordinateAxes';
            this.group.add(coordinateAxes);
        }

        { // Axis Labels
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

        { // Tool Head
            let color = colornames('silver');
            let url = 'textures/brushed-steel-texture.jpg';
            loadTexture(url, (err, texture) => {
                let toolhead = new ToolHead(color, texture);
                toolhead.name = 'ToolHead';
                this.group.add(toolhead);

                // Update the scene
                this.updateScene();
            });
        }

        this.scene.add(this.group);

        this.controls = this.createOrbitControls(this.camera, el);
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
        let objsToRemove = _.tail(this.scene.children);
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
            this.rotateToolHead(360);
        } else {

            // Stop rotation
            this.rotateToolHead(0);
        }

        this.updateScene();
    }
    createRenderer(width, height) {
        let renderer = new THREE.WebGLRenderer({
            autoClearColor: true,
            antialias: true,
            alpha: true
        });
        renderer.setClearColor(new THREE.Color(colornames('white')), 1);
        renderer.setSize(width, height);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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
            panSpeed: 1.0
        });

        return controls;
    }
    // Sets the tool head position
    // @param {number} x The position along the x axis
    // @param {number} y The position along the y axis
    // @param {number} z The position along the z axis
    setToolHeadPosition(x, y, z) {
        let toolhead = this.group.getObjectByName('ToolHead');
        if (!toolhead) {
            return;
        }

        let pivotPoint = this.pivotPoint.get();
        x = (Number(x) || 0) - pivotPoint.x;
        y = (Number(y) || 0) - pivotPoint.y;
        z = (Number(z) || 0) - pivotPoint.z;

        toolhead.position.set(x, y, z);
    }
    // Rotates the tool head around the z axis with a given rpm and an optional fps
    // @param {number} rpm The rounds per minutes
    // @param {number} [fps] The frame rate (Defaults to 60 frames per second)
    rotateToolHead(rpm = 0, fps = 60) {
        let toolhead = this.group.getObjectByName('ToolHead');
        if (!toolhead) {
            return;
        }

        let delta = 1 / fps;
        let degrees = 360 * (delta * Math.PI / 180); // Rotates 360 degrees per second
        toolhead.rotateZ(-(rpm / 60 * degrees)); // rotate in clockwise direction
    }
    // Make the controls look at the center of G-code object
    lookAtCenter() {
        this.controls.reset();
    }
    loadGCode(gcode, callback) {
        // Remove previous G-code object
        this.unloadGCode();

        let el = ReactDOM.findDOMNode(this.refs.visualizer);

        this.gcodeVisualizer = new GCodeVisualizer({
            modalState: this.parserstate.modal
        });

        this.gcodeVisualizer.render({
            gcode: gcode,
            width: el.clientWidth,
            height: el.clientHeight
        }, (obj) => {
            obj.name = 'GCodeVisualizer';
            this.group.add(obj);

            let bbox = getBoundingBox(obj);
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
        let gcodeVisualizerObject = this.group.getObjectByName('GCodeVisualizer');
        if (gcodeVisualizerObject) {
            this.group.remove(gcodeVisualizerObject);
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
    panUp() {
        if (!(this.state.ready)) {
            return;
        }

        if (this.controls.enablePan) {
            let { keyPanSpeed } = this.controls;
            this.pan(0, keyPanSpeed);
        }
    }
    panDown() {
        if (!(this.state.ready)) {
            return;
        }

        if (this.controls.enablePan) {
            let { keyPanSpeed } = this.controls;
            this.pan(0, -keyPanSpeed);
        }
    }
    panLeft() {
        if (!(this.state.ready)) {
            return;
        }

        if (this.controls.enablePan) {
            let { keyPanSpeed } = this.controls;
            this.pan(keyPanSpeed, 0);
        }
    }
    panRight() {
        if (!(this.state.ready)) {
            return;
        }

        if (this.controls.enablePan) {
            let { keyPanSpeed } = this.controls;
            this.pan(-keyPanSpeed, 0);
        }
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
                    up={::this.panUp}
                    down={::this.panDown}
                    left={::this.panLeft}
                    right={::this.panRight}
                    center={::this.lookAtCenter}
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
