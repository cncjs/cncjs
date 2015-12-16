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
    COORDINATE_AXIS_LENGTH,
    WORKFLOW_STATE_RUNNING,
    WORKFLOW_STATE_PAUSED,
    WORKFLOW_STATE_IDLE,
    CAMERA_DEFAULT_FOV,
    CAMERA_DEFAULT_POSITION_X,
    CAMERA_DEFAULT_POSITION_Y,
    CAMERA_DEFAULT_POSITION_Z
} from './constants';

class Visualizer extends React.Component {
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
        this.engravingCutter.rotateZ(-(rpm / 60 * degrees)); // rotate in clockwise direction
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
        //this.camera.position.setY(this.camera.position.y - 2);
    }
    joystickDown() {
        let { x, y, z } = this.trackballControls.target;
        this.trackballControls.target.set(x, y + 2, z);
        //this.camera.position.setY(this.camera.position.y + 2);
    }
    joystickLeft() {
        let { x, y, z } = this.trackballControls.target;
        this.trackballControls.target.set(x + 2, y, z);
        //this.camera.position.setX(this.camera.position.x - 2);
    }
    joystickRight() {
        let { x, y, z } = this.trackballControls.target;
        this.trackballControls.target.set(x - 2, y, z);
        //this.camera.position.setX(this.camera.position.x + 2);
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
                <div ref="gcodeViewer" className="preview" />
            </div>
        );
    }
}

export default Visualizer;
