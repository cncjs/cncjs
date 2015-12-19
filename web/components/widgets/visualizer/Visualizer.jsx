import _ from 'lodash';
import pubsub from 'pubsub-js';
import React from 'react';
import ReactDOM from 'react-dom';
import THREE from 'three';
import TrackballControls from '../../../lib/three/TrackballControls';
import GCodeRenderer from '../../../lib/GCodeRenderer';
import PivotPoint3 from '../../../lib/PivotPoint3';
import log from '../../../lib/log';
import socket from '../../../lib/socket';
import colorNames from '../../../lib/color-names';
import Joystick from './Joystick';
import Toolbar from './Toolbar';
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

const getBoundingBox = (object) => {
    let box = new THREE.Box3().setFromObject(object);
    let boundingBox = {
        min: {
            x: box.min.x === Infinity ? 0 : box.min.x,
            y: box.min.y === Infinity ? 0 : box.min.y,
            z: box.min.z === Infinity ? 0 : box.min.z
        },
        max: {
            x: box.max.x === -Infinity ? 0 : box.max.x,
            y: box.max.y === -Infinity ? 0 : box.max.y,
            z: box.max.z === -Infinity ? 0 : box.max.z
        }
    };

    return boundingBox;
};

const loadTexture = (url, callback) => {
    callback = callback || ((err, texture) => {});

    const onLoad = (texture) => {
        callback(null, texture);
    };
    const onProgress = (xhr) => {
        log.trace((xhr.loaded / xhr.total * 100) + '% loaded');
    };
    const onError = (xhr) => {
        callback(new Error('Failed to load texture with the url ' + JSON.stringify(url)));
    };

    let loader = new THREE.TextureLoader();
    loader.load(url, onLoad, onProgress, onError);
};

// AxisHelper
// An axis object to visualize the the 3 axes in a simple way. 
// The X axis is red. The Y axis is green. The Z axis is blue.
class AxisHelper {
    group = new THREE.Group();

    // Creates an axisHelper with lines of length size.
    // @param {number} size Define the size of the line representing the axes.
    // @see [Drawing the Coordinate Axes]{@http://soledadpenades.com/articles/three-js-tutorials/drawing-the-coordinate-axes/}
    constructor(size) {
        let group = this.group;

        group.add(this.buildAxis(new THREE.Vector3(0, 0, 0), new THREE.Vector3(size, 0, 0), colorNames.red, false)); // +X
        group.add(this.buildAxis(new THREE.Vector3(0, 0, 0), new THREE.Vector3(-size, 0, 0), colorNames.red, true)); // -X
        group.add(this.buildAxis(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, size, 0), colorNames.green, false)); // +Y
        group.add(this.buildAxis(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -size, 0), colorNames.green, true)); // -Y
        group.add(this.buildAxis(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, size), colorNames.blue, false)); // +Z
        group.add(this.buildAxis(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -size), colorNames.blue, true)); // -Z

        return group;
    }
    buildAxis(src, dst, color, dashed) {
        let geometry = new THREE.Geometry();
        let material;

        if (dashed) {
            material = new THREE.LineDashedMaterial({
                linewidth: 1,
                color: color,
                dashSize: 1,
                gapSize: 1
            });
        } else {
            material = new THREE.LineBasicMaterial({
                linewidth: 1,
                color: color
            });
        }

        geometry.vertices.push(src.clone());
        geometry.vertices.push(dst.clone());
        geometry.computeLineDistances();

        return new THREE.Line(geometry, material);
    }
}

class GridHelper {
    group = new THREE.Group();

    constructor(size, step, colorCenterLine, colorGrid) {
        let group = this.group;
        let list = _.range(-size, size, step);

        if (typeof colorCenterLine === 'undefined') {
            colorCenterLine = 0x444444;
        }
        if (typeof colorGrid === 'undefined') {
            colorGrid = 0x888888;
        }

        _.each(list, (i) => {
            let color = (i === 0) ? colorCenterLine : colorGrid;

            if (color === null) { // transparent
                return;
            }

            let gridLineX = this.buildGridLine(
                new THREE.Vector3(-size, i, 0),
                new THREE.Vector3(size, i, 0),
                color
            );

            let gridLineY = this.buildGridLine(
                new THREE.Vector3(i, -size, 0),
                new THREE.Vector3(i, size, 0),
                color
            );

            group.add(gridLineX);
            group.add(gridLineY);
        });

        return group;
    }
    buildGridLine(src, dst, color) {
        let geometry = new THREE.Geometry();
        let material = new THREE.LineBasicMaterial({ color: color });

        geometry.vertices.push(src.clone());
        geometry.vertices.push(dst.clone());

        return new THREE.Line(geometry, material);
    }
}

class EngravingCutterHelper {
    group = new THREE.Group();

    constructor(texture) {
        let group = this.group;

        const radiusTop = 2.0;
        const radiusBottom = 0.1;
        const cylinderHeight = 20;
        const radiusSegments = 32;
        const heightSegments = 1;
        const openEnded = false;
        const thetaStart = 0;
        const thetaLength = 2 * Math.PI;

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

        const color = colorNames.silver;
        const opacity = 0.5;

        let materialFront = new THREE.MeshBasicMaterial({
            color: color,
            map: texture,
            opacity: opacity,
            shading: THREE.SmoothShading,
            side: THREE.FrontSide,
            transparent: true
        });

        let materialBack = new THREE.MeshBasicMaterial({
            color: color,
            map: texture,
            opacity: opacity,
            shading: THREE.SmoothShading,
            side: THREE.BackSide,
            transparent: true
        });

        // http://stackoverflow.com/questions/15514274/three-js-how-to-control-rendering-order
        let meshFront = new THREE.Mesh(geometry, materialFront);
        meshFront.renderOrder = 2;
        group.add(meshFront);

        let meshBack = new THREE.Mesh(geometry, materialBack);
        group.add(meshBack);

        return group;
    }
}

class Visualizer extends React.Component {
    state = {
        workflowState: WORKFLOW_STATE_IDLE,
        activeState: ACTIVE_STATE_IDLE,
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
        // G-code
        this.runner = null;
        // Three.js
        this.renderer = null;
        this.scene = null;
        this.camera = null;
        this.trackballControls = null;
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
        });
    }
    componentWillUnmount() {
        this.removeResizeEventListener();
        this.removeSocketEvents();
        this.unsubscribe();
        this.clearScene();
    }
    shouldComponentUpdate(nextProps, nextState) {
        return JSON.stringify(nextState) !== JSON.stringify(this.state);
    }
    subscribe() {
        let that = this;

        this.pubsubTokens = [];

        { // gcode:data
            let token = pubsub.subscribe('gcode:data', (msg, gcode) => {
                gcode = gcode || '';
                that.renderGCode(gcode);
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
    }
    socketOnGCodeQueueStatus(data) {
        if (!(this.runner)) {
            return;
        }

        log.trace('socketOnGCodeQueueStatus:', data);

        let frameIndex = data.executed;
        this.runner.setFrameIndex(frameIndex);
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
            let colorCenterLine = null;
            let colorGrid = colorNames.grey89;
            let gridHelper = new GridHelper(GRID_LINE_LENGTH, GRID_SPACING, colorCenterLine, colorNames.grey89);
            gridHelper.name = 'CoordinateGrid';
            this.group.add(gridHelper);
        }

        { // Creating the coordinate axes
            let axisHelper = new AxisHelper(AXIS_LINE_LENGTH);
            axisHelper.name = 'CoordinateAxes';
            this.group.add(axisHelper);
        }

        { // Creating an engraving cutter
            let url = 'textures/brushed-steel-texture.jpg';
            loadTexture(url, (err, texture) => {
                let engravingCutterHelper = new EngravingCutterHelper(texture);
                engravingCutterHelper.name = 'EngravingCutter';
                this.group.add(engravingCutterHelper);
            });
        }

        this.scene.add(this.group);

        // To zoom in/out using TrackballControls
        this.trackballControls = this.createTrackballControls(this.camera, this.renderer.domElement);

        // Rendering the scene
        // This will create a loop that causes the renderer to draw the scene 60 times per second.
        let render = () => {

            // Call the render() function up to 60 times per second (i.e. 60fps)
            requestAnimationFrame(render);

            { // Rotate engraving cutter
                let rotate = (this.state.workflowState === WORKFLOW_STATE_RUNNING) &&
                             (this.state.activeState === ACTIVE_STATE_RUN);

                if (rotate) {
                    this.rotateEngravingCutter(360); // Set to 360 rounds per minute (rpm)
                } else {
                    this.rotateEngravingCutter(0); // Stop rotation
                }
            }

            this.trackballControls.update();

            this.renderer.render(this.scene, this.camera);
        };
        render();

        return this.scene;
    }
    clearScene() {
        // to iterrate over all children (except the first) in a scene 
        let objsToRemove = _.rest(this.scene.children);
        _.each(objsToRemove, (obj) => {
            this.scene.remove(obj);
        });
    }
    createRenderer(width, height) {
        let renderer = new THREE.WebGLRenderer({
            autoClearColor: true
        });
        renderer.setClearColor(new THREE.Color(colorNames.grey94, 1.0));
        renderer.setSize(width, height);
        renderer.shadowMap.enabled = true;
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

        // Find the largest value of fov
        let fov = _.max([
            // to fit the object height
            2 * Math.atan(height / (2 * dist)) * (180 / Math.PI),
            // to fit the object width
            2 * Math.atan((width / aspect) / (2 * dist)) * (180 / Math.PI)
        ]);
        fov = fov || CAMERA_FOV;

        this.camera.fov = fov;
        this.camera.updateProjectionMatrix();

        log.debug('fitCameraToObject:', {
            width: width,
            height: height,
            dist: dist,
            fov: fov
        });
    }
    resetCamera() {
    }
    renderGCode(gcode) {
        { // Remove previous G-code object
            let object = this.group.getObjectByName('G-code');
            if (object) {
                this.group.remove(object);
            }
        }

        // Sets the pivot point to the origin point (0, 0, 0)
        this.pivotPoint.set(0, 0, 0);

        // Reset TrackballControls
        this.trackballControls.reset();

        let el = ReactDOM.findDOMNode(this.refs.visualizer);

        this.runner = new GCodeRenderer({
            modalState: this.modalState
        });

        this.runner.render({
            gcode: gcode,
            width: el.clientWidth,
            height: el.clientHeight
        }, (object) => {
            object.name = 'G-code';
            this.group.add(object);

            let box = getBoundingBox(object);
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

                this.fitCameraToObject(objectWidth, objectHeight, lookTarget);
            }

            pubsub.publish('gcode:boundingBox', box);

            this.setState({ boundingBox: box });
        });
    }
    setWorkflowState(workflowState) {
        this.setState({ workflowState: workflowState });
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
    joystickCenter() {
        this.trackballControls.reset();
        this.camera.position.setX(0);
        this.camera.position.setY(0);
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
