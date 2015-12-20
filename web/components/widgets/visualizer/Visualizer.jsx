import _ from 'lodash';
import pubsub from 'pubsub-js';
import React from 'react';
import ReactDOM from 'react-dom';
import THREE from 'three';
import TrackballControls from '../../../lib/three/TrackballControls';
import OrbitControls from '../../../lib/three/OrbitControls';
import GCodePath from '../../../lib/GCodePath';
import log from '../../../lib/log';
import socket from '../../../lib/socket';
import colorNames from '../../../lib/color-names';
import Joystick from './Joystick';
import Toolbar from './Toolbar';
import {
    fitCameraToObject, getBoundingBox, loadTexture,
    CoordinateAxes, EngravingCutter, GridLine, PivotPoint3
} from './helpers';
import {
    COORDINATE_PLANE_XY,
    COORDINATE_PLANE_XZ,
    COORDINATE_PLANE_YZ,
    AXIS_LINE_LENGTH,
    GRID_LINE_LENGTH,
    GRID_SPACING,
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
        this.addSocketEvents();
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
        this.removeSocketEvents();
        this.unsubscribe();
        this.clearScene();
    }
    shouldComponentUpdate(nextProps, nextState) {
        let shouldUpdate =
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

        { // gcode:data
            let token = pubsub.subscribe('gcode:data', (msg, gcode) => {
                gcode = gcode || '';
                this.loadGCode(gcode);
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
    addSocketEvents() {
        socket.on('grbl:gcode-modes', ::this.socketOnGrblGCodeModes);
        socket.on('grbl:current-status', ::this.socketOnGrblCurrentStatus);
        socket.on('gcode:queue-status', ::this.socketOnGCodeQueueStatus);
    }
    removeSocketEvents() {
        socket.off('grbl:gcode-modes', ::this.socketOnGrblGCodeModes);
        socket.off('grbl:current-status', ::this.socketOnGrblCurrentStatus);
        socket.off('gcode:queue-status', ::this.socketOnGCodeQueueStatus);
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

        this.setState({ activeState: activeState });
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
            let colorCenterLine = null; // Set to null to keep it transparent
            let colorGrid = colorNames.grey89;
            let gridLine = new GridLine(GRID_LINE_LENGTH, GRID_SPACING, colorCenterLine, colorNames.grey89);
            gridLine.name = 'GridLine';
            this.group.add(gridLine);
        }

        { // Creating the coordinate axes
            let coordinateAxes = new CoordinateAxes(AXIS_LINE_LENGTH);
            coordinateAxes.name = 'CoordinateAxes';
            this.group.add(coordinateAxes);
        }

        { // Creating an engraving cutter
            let color = colorNames.silver;
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

        //this.controls = this.createTrackballControls(this.camera, this.renderer.domElement);
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

        //this.controls.update();

        this.updateScene();
    }
    createRenderer(width, height) {
        let renderer = new THREE.WebGLRenderer({
            autoClearColor: true
        });
        renderer.setClearColor(new THREE.Color(colorNames.grey94, 1.0));
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
    // TrackballControls was written to require an animation loop in which controls.update() is called.
    createTrackballControls(object, domElement) {
        let controls = new THREE.TrackballControls(object, domElement);

        _.extend(controls, {
            rotateSpeed: 2.0,
            zoomSpeed: 1.0,
            panSpeed: 1.0
            //staticMoving: false,
            //dynamicDampingFactor: 0.3
        });

        return controls;
    }
    // OrbitControls, on the other hand, can be used in static scenes in which the scene is rendered only when the mouse is moved, like so:
    // controls.addEventListener( 'change', render );
    createOrbitControls(object, domElement) {
        let controls = new THREE.OrbitControls(object, domElement);

        _.extend(controls, {
            rotateSpeed: 2.0,
            zoomSpeed: 1.0,
            panSpeed: 1.0
            // Set to true to enable damping (inertia)
            // If damping is enabled, you must call controls.update() in your animation loop
            //enableDamping: true,
            //dampingFactor: 0.3
        });

        return controls;
    }
    createDirectionalLight() {
        let directionalLight = new THREE.DirectionalLight(colorNames.whitesmoke, 0.5);

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
    loadGCode(gcode) {
        { // Remove previous G-code object
            let pathObject = this.group.getObjectByName('GCodePath');
            if (pathObject) {
                this.group.remove(pathObject);
            }
        }

        // Sets the pivot point to the origin point (0, 0, 0)
        this.pivotPoint.set(0, 0, 0);

        // Reset TrackballControls
        this.controls.reset();

        let el = ReactDOM.findDOMNode(this.refs.visualizer);

        this.gcodePath = new GCodePath({ modalState: this.modalState });
        this.gcodePath.render({
            gcode: gcode,
            width: el.clientWidth,
            height: el.clientHeight
        }, (pathObject) => {
            pathObject.name = 'GCodePath';
            this.group.add(pathObject);

            let box = getBoundingBox(pathObject);
            let dX = box.max.x - box.min.x;
            let dY = box.max.y - box.min.y;
            let dZ = box.max.z - box.min.z;
            let center = new THREE.Vector3(
                box.min.x + (dX / 2),
                box.min.y + (dY / 2),
                box.min.z + (dZ / 2)
            );

            // Set the pivot point to the object's center position
            this.pivotPoint.set(center.x, center.y, center.z);

            { // Fit the camera to object
                let objectWidth = dX;
                let objectHeight = dY;
                let lookTarget = new THREE.Vector3(0, 0, box.max.z);

                fitCameraToObject(this.camera, objectWidth, objectHeight, lookTarget);
            }

            // Update the scene
            this.updateScene();

            pubsub.publish('gcode:boundingBox', box);

            this.setState({ boundingBox: box });
        });
    }
    setWorkflowState(workflowState) {
        this.setState({ workflowState: workflowState });
    }
    // http://stackoverflow.com/questions/18581225/orbitcontrol-or-trackballcontrol
    joystickUp() {
        let { x, y, z } = this.controls.target;
        this.controls.target.set(x, y - 2, z);
    }
    joystickDown() {
        let { x, y, z } = this.controls.target;
        this.controls.target.set(x, y + 2, z);
    }
    joystickLeft() {
        let { x, y, z } = this.controls.target;
        this.controls.target.set(x + 2, y, z);
    }
    joystickRight() {
        let { x, y, z } = this.controls.target;
        this.controls.target.set(x - 2, y, z);
    }
    joystickCenter() {
        this.controls.reset();
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
                    center={::this.joystickCenter}
                />
                <div ref="visualizer" className="visualizer" />
            </div>
        );
    }
}

export default Visualizer;
