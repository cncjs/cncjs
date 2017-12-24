/* eslint-disable import/no-unresolved */
import 'imports-loader?THREE=three!three/examples/js/cameras/CombinedCamera';
/* eslint-enable */
import each from 'lodash/each';
import isEqual from 'lodash/isEqual';
import tail from 'lodash/tail';
import throttle from 'lodash/throttle';
import colornames from 'colornames';
import pubsub from 'pubsub-js';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import * as THREE from 'three';
import Detector from 'three/examples/js/Detector';
import log from '../../lib/log';
import './TrackballControls';
import { getBoundingBox, loadTexture } from './helpers';
import Viewport from './Viewport';
import CoordinateAxes from './CoordinateAxes';
import ToolHead from './ToolHead';
import TargetPoint from './TargetPoint';
import GridLine from './GridLine';
import PivotPoint3 from './PivotPoint3';
import TextSprite from './TextSprite';
import GCodeVisualizer from './GCodeVisualizer';
import {
    IMPERIAL_UNITS,
    METRIC_UNITS
} from '../../constants';
import {
    CAMERA_MODE_PAN,
    CAMERA_MODE_ROTATE
} from './constants';

const IMPERIAL_GRID_COUNT = 32; // 32 in
const IMPERIAL_GRID_SPACING = 25.4; // 1 in
const IMPERIAL_AXIS_LENGTH = IMPERIAL_GRID_SPACING * 12; // 12 in
const METRIC_GRID_COUNT = 60; // 60 cm
const METRIC_GRID_SPACING = 10; // 10 mm
const METRIC_AXIS_LENGTH = METRIC_GRID_SPACING * 30; // 300 mm
const CAMERA_VIEWPORT_WIDTH = 300; // 300 mm
const CAMERA_VIEWPORT_HEIGHT = 300; // 300 mm
const PERSPECTIVE_FOV = 70;
const PERSPECTIVE_NEAR = 0.001;
const PERSPECTIVE_FAR = 2000;
const ORTHOGRAPHIC_FOV = 35;
const ORTHOGRAPHIC_NEAR = 0.001;
const ORTHOGRAPHIC_FAR = 2000;
const CAMERA_POSITION_X = 0;
const CAMERA_POSITION_Y = 0;
const CAMERA_POSITION_Z = 200; // Move the camera out a bit from the origin (0, 0, 0)
const TRACKBALL_CONTROLS_MIN_DISTANCE = 1;
const TRACKBALL_CONTROLS_MAX_DISTANCE = 2000;

class Visualizer extends Component {
    static propTypes = {
        show: PropTypes.bool,
        state: PropTypes.object
    };

    pubsubTokens = [];
    isAgitated = false;
    workPosition = {
        x: 0,
        y: 0,
        z: 0
    };
    group = new THREE.Group();
    pivotPoint = new PivotPoint3({ x: 0, y: 0, z: 0 }, (x, y, z) => { // relative position
        each(this.group.children, (o) => {
            o.translateX(x);
            o.translateY(y);
            o.translateZ(z);
        });

        // Update the scene
        this.updateScene();
    });

    throttledResize = throttle(() => {
        this.resizeRenderer();
    }, 32); // 60hz

    componentWillMount() {
        // Three.js
        this.renderer = null;
        this.scene = null;
        this.camera = null;
        this.controls = null;
        this.viewport = null;
        this.toolhead = null;
        this.targetPoint = null;
        this.visualizer = null;
    }
    componentDidMount() {
        this.subscribe();
        this.addResizeEventListener();

        if (this.node) {
            const el = ReactDOM.findDOMNode(this.node);
            this.createScene(el);
            this.resizeRenderer();
        }
    }
    componentWillUnmount() {
        this.unsubscribe();
        this.removeResizeEventListener();
        this.clearScene();
    }
    componentWillReceiveProps(nextProps) {
        let forceUpdate = false;
        let needUpdateScene = false;
        const state = this.props.state;
        const nextState = nextProps.state;

        // Enable or disable 3D view
        if ((this.props.show !== nextProps.show) && (!!nextProps.show === true)) {
            this.viewport.update();

            // Set forceUpdate to true when enabling or disabling 3D view
            forceUpdate = true;
            needUpdateScene = true;
        }

        // Update visualizer's frame index
        if (this.visualizer) {
            const frameIndex = nextState.gcode.sent;
            this.visualizer.setFrameIndex(frameIndex);
        }

        // Projection
        if (state.projection !== nextState.projection) {
            if (nextState.projection === 'orthographic') {
                this.camera.toOrthographic();
                this.camera.setZoom(1);
                this.camera.setFov(ORTHOGRAPHIC_FOV);
            } else {
                this.camera.toPerspective();
                this.camera.setZoom(1);
                this.camera.setFov(PERSPECTIVE_FOV);
            }
            if (this.viewport) {
                this.viewport.update();
            }
            needUpdateScene = true;
        }

        // Camera Mode
        if (state.cameraMode !== nextState.cameraMode) {
            this.setCameraMode(nextState.cameraMode);
            needUpdateScene = true;
        }

        // Whether to show the name of the G-code file
        if (state.gcode.displayName !== nextState.gcode.displayName) {
            const gcodeDisplayName = this.group.getObjectByName('GCodeDisplayName');
            if (gcodeDisplayName) {
                gcodeDisplayName.visible = nextState.gcode.displayName;

                needUpdateScene = true;
            }
        }

        // Whether to show coordinate system
        if ((nextState.units !== state.units) ||
            (nextState.objects.coordinateSystem.visible !== state.objects.coordinateSystem.visible)) {
            const visible = nextState.objects.coordinateSystem.visible;

            // Imperial
            const imperialCoordinateSystem = this.group.getObjectByName('ImperialCoordinateSystem');
            if (imperialCoordinateSystem) {
                imperialCoordinateSystem.visible = visible && (nextState.units === IMPERIAL_UNITS);
            }

            // Metric
            const metricCoordinateSystem = this.group.getObjectByName('MetricCoordinateSystem');
            if (metricCoordinateSystem) {
                metricCoordinateSystem.visible = visible && (nextState.units === METRIC_UNITS);
            }

            needUpdateScene = true;
        }

        // Whether to show grid line numbers
        if ((nextState.units !== state.units) ||
            (nextState.objects.gridLineNumbers.visible !== state.objects.gridLineNumbers.visible)) {
            const visible = nextState.objects.gridLineNumbers.visible;

            // Imperial
            const imperialGridLineNumbers = this.group.getObjectByName('ImperialGridLineNumbers');
            if (imperialGridLineNumbers) {
                imperialGridLineNumbers.visible = visible && (nextState.units === IMPERIAL_UNITS);
            }

            // Metric
            const metricGridLineNumbers = this.group.getObjectByName('MetricGridLineNumbers');
            if (metricGridLineNumbers) {
                metricGridLineNumbers.visible = visible && (nextState.units === METRIC_UNITS);
            }

            needUpdateScene = true;
        }

        // Whether to show tool head
        if (this.toolhead && (this.toolhead.visible !== nextState.objects.toolhead.visible)) {
            this.toolhead.visible = nextState.objects.toolhead.visible;

            needUpdateScene = true;
        }

        // Update work position
        if (!isEqual(this.workPosition, nextState.workPosition)) {
            this.workPosition = nextState.workPosition;
            this.setWorkPosition(this.workPosition);

            needUpdateScene = true;
        }

        if (needUpdateScene) {
            this.updateScene({ forceUpdate: forceUpdate });
        }

        if (this.isAgitated !== nextState.isAgitated) {
            this.isAgitated = nextState.isAgitated;

            if (this.isAgitated) {
                // Call renderAnimationLoop when the state changes and isAgitated is true
                requestAnimationFrame(::this.renderAnimationLoop);
            }
        }
    }
    shouldComponentUpdate(nextProps, nextState) {
        if (nextProps.show !== this.props.show) {
            return true;
        }
        return false;
    }
    subscribe() {
        const tokens = [
            pubsub.subscribe('resize', (msg) => {
                this.resizeRenderer();
            })
        ];
        this.pubsubTokens = this.pubsubTokens.concat(tokens);
    }
    unsubscribe() {
        this.pubsubTokens.forEach((token) => {
            pubsub.unsubscribe(token);
        });
        this.pubsubTokens = [];
    }
    // https://tylercipriani.com/blog/2014/07/12/crossbrowser-javascript-scrollbar-detection/
    hasVerticalScrollbar() {
        return window.innerWidth > document.documentElement.clientWidth;
    }
    hasHorizontalScrollbar() {
        return window.innerHeight > document.documentElement.clientHeight;
    }
    // http://www.alexandre-gomes.com/?p=115
    getScrollbarWidth() {
        const inner = document.createElement('p');
        inner.style.width = '100%';
        inner.style.height = '200px';

        const outer = document.createElement('div');
        outer.style.position = 'absolute';
        outer.style.top = '0px';
        outer.style.left = '0px';
        outer.style.visibility = 'hidden';
        outer.style.width = '200px';
        outer.style.height = '150px';
        outer.style.overflow = 'hidden';
        outer.appendChild(inner);

        document.body.appendChild(outer);
        const w1 = inner.offsetWidth;
        outer.style.overflow = 'scroll';
        const w2 = (w1 === inner.offsetWidth) ? outer.clientWidth : inner.offsetWidth;
        document.body.removeChild(outer);

        return (w1 - w2);
    }
    getVisibleWidth() {
        const el = ReactDOM.findDOMNode(this.node);
        const visibleWidth = Math.max(
            Number(el && el.parentNode && el.parentNode.clientWidth) || 0,
            360
        );

        return visibleWidth;
    }
    getVisibleHeight() {
        const clientHeight = document.documentElement.clientHeight;
        const navbarHeight = 50;
        const widgetHeaderHeight = 32;
        const widgetFooterHeight = 32;
        const visibleHeight = (
            clientHeight - navbarHeight - widgetHeaderHeight - widgetFooterHeight - 1
        );

        return visibleHeight;
    }
    addResizeEventListener() {
        window.addEventListener('resize', this.throttledResize);
    }
    removeResizeEventListener() {
        window.removeEventListener('resize', this.throttledResize);
    }
    resizeRenderer() {
        if (!(this.camera && this.renderer)) {
            return;
        }

        const width = this.getVisibleWidth();
        const height = this.getVisibleHeight();

        if (width === 0 || height === 0) {
            log.warn(`The width (${width}) and height (${height}) cannot be a zero value`);
        }

        // https://github.com/mrdoob/three.js/blob/dev/examples/js/cameras/CombinedCamera.js#L156
        // THREE.CombinedCamera.prototype.setSize = function(width, height) {
        //     this.cameraP.aspect = width / height;
        //     this.left = - width / 2;
        //     this.right = width / 2;
        //     this.top = height / 2;
        //     this.bottom = - height / 2;
        // }
        this.camera.setSize(width, height);
        this.camera.aspect = width / height; // Update camera aspect as well
        this.camera.updateProjectionMatrix();

        // Initialize viewport at the first time of resizing renderer
        if (!this.viewport) {
            // Defaults to 300x300mm
            this.viewport = new Viewport(this.camera, CAMERA_VIEWPORT_WIDTH, CAMERA_VIEWPORT_HEIGHT);
        }

        this.controls.handleResize();

        this.renderer.setSize(width, height);

        // Update the scene
        this.updateScene();
    }
    createCoordinateSystem(units) {
        const axisLength = (units === IMPERIAL_UNITS) ? IMPERIAL_AXIS_LENGTH : METRIC_AXIS_LENGTH;
        const gridCount = (units === IMPERIAL_UNITS) ? IMPERIAL_GRID_COUNT : METRIC_GRID_COUNT;
        const gridSpacing = (units === IMPERIAL_UNITS) ? IMPERIAL_GRID_SPACING : METRIC_GRID_SPACING;
        const group = new THREE.Group();

        { // Coordinate Grid
            const gridLine = new GridLine(
                gridCount * gridSpacing,
                gridSpacing,
                gridCount * gridSpacing,
                gridSpacing,
                colornames('blue'), // center line
                colornames('gray 44') // grid
            );
            each(gridLine.children, (o) => {
                o.material.opacity = 0.15;
                o.material.transparent = true;
                o.material.depthWrite = false;
            });
            gridLine.name = 'GridLine';
            group.add(gridLine);
        }

        { // Coordinate Axes
            const coordinateAxes = new CoordinateAxes(axisLength);
            coordinateAxes.name = 'CoordinateAxes';
            group.add(coordinateAxes);
        }

        { // Axis Labels
            const axisXLabel = new TextSprite({
                x: axisLength + 10,
                y: 0,
                z: 0,
                size: 20,
                text: 'X',
                color: colornames('red')
            });
            const axisYLabel = new TextSprite({
                x: 0,
                y: axisLength + 10,
                z: 0,
                size: 20,
                text: 'Y',
                color: colornames('green')
            });
            const axisZLabel = new TextSprite({
                x: 0,
                y: 0,
                z: axisLength + 10,
                size: 20,
                text: 'Z',
                color: colornames('blue')
            });

            group.add(axisXLabel);
            group.add(axisYLabel);
            group.add(axisZLabel);
        }

        return group;
    }
    createGridLineNumbers(units) {
        const gridCount = (units === IMPERIAL_UNITS) ? IMPERIAL_GRID_COUNT : METRIC_GRID_COUNT;
        const gridSpacing = (units === IMPERIAL_UNITS) ? IMPERIAL_GRID_SPACING : METRIC_GRID_SPACING;
        const textSize = (units === IMPERIAL_UNITS) ? (25.4 / 3) : (10 / 3);
        const textOffset = (units === IMPERIAL_UNITS) ? (25.4 / 5) : (10 / 5);
        const group = new THREE.Group();

        for (let i = -gridCount; i <= gridCount; ++i) {
            if (i !== 0) {
                const textLabel = new TextSprite({
                    x: i * gridSpacing,
                    y: textOffset,
                    z: 0,
                    size: textSize,
                    text: (units === IMPERIAL_UNITS) ? i : i * 10,
                    textAlign: 'center',
                    textBaseline: 'bottom',
                    color: colornames('red'),
                    opacity: 0.5
                });
                group.add(textLabel);
            }
        }
        for (let i = -gridCount; i <= gridCount; ++i) {
            if (i !== 0) {
                const textLabel = new TextSprite({
                    x: -textOffset,
                    y: i * gridSpacing,
                    z: 0,
                    size: textSize,
                    text: (units === IMPERIAL_UNITS) ? i : i * 10,
                    textAlign: 'right',
                    textBaseline: 'middle',
                    color: colornames('green'),
                    opacity: 0.5
                });
                group.add(textLabel);
            }
        }

        return group;
    }
    //
    // Creating a scene
    // http://threejs.org/docs/#Manual/Introduction/Creating_a_scene
    //
    createScene(el) {
        if (!el) {
            return;
        }

        const { state } = this.props;
        const { units, objects } = state;
        const width = this.getVisibleWidth();
        const height = this.getVisibleHeight();

        // WebGLRenderer
        this.renderer = new THREE.WebGLRenderer({
            autoClearColor: true,
            antialias: true,
            alpha: true
        });
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.setClearColor(new THREE.Color(colornames('white')), 1);
        this.renderer.setSize(width, height);
        this.renderer.clear();

        el.appendChild(this.renderer.domElement);

        // To actually be able to display anything with Three.js, we need three things:
        // A scene, a camera, and a renderer so we can render the scene with the camera.
        this.scene = new THREE.Scene();

        this.camera = this.createCombinedCamera(width, height);
        this.controls = this.createTrackballControls(this.camera, this.renderer.domElement);

        this.setCameraMode(state.cameraMode);

        // Projection
        if (state.projection === 'orthographic') {
            this.camera.toOrthographic();
            this.camera.setZoom(1);
            this.camera.setFov(ORTHOGRAPHIC_FOV);
        } else {
            this.camera.toPerspective();
            this.camera.setZoom(1);
            this.camera.setFov(PERSPECTIVE_FOV);
        }

        { // Lights
            let light;

            // Directional Light
            light = new THREE.DirectionalLight(0xffffff);
            light.position.set(1, 1, 1);
            this.scene.add(light);

            // Directional Light
            light = new THREE.DirectionalLight(0x002288);
            light.position.set(-1, -1, -1);
            this.scene.add(light);

            // Ambient Light
            light = new THREE.AmbientLight(colornames('gray 25')); // soft white light
            this.scene.add(light);
        }

        { // Imperial Coordinate System
            const visible = objects.coordinateSystem.visible;
            const imperialCoordinateSystem = this.createCoordinateSystem(IMPERIAL_UNITS);
            imperialCoordinateSystem.name = 'ImperialCoordinateSystem';
            imperialCoordinateSystem.visible = visible && (units === IMPERIAL_UNITS);
            this.group.add(imperialCoordinateSystem);
        }

        { // Metric Coordinate System
            const visible = objects.coordinateSystem.visible;
            const metricCoordinateSystem = this.createCoordinateSystem(METRIC_UNITS);
            metricCoordinateSystem.name = 'MetricCoordinateSystem';
            metricCoordinateSystem.visible = visible && (units === METRIC_UNITS);
            this.group.add(metricCoordinateSystem);
        }

        { // Imperial Grid Line Numbers
            const visible = objects.gridLineNumbers.visible;
            const imperialGridLineNumbers = this.createGridLineNumbers(IMPERIAL_UNITS);
            imperialGridLineNumbers.name = 'ImperialGridLineNumbers';
            imperialGridLineNumbers.visible = visible && (units === IMPERIAL_UNITS);
            this.group.add(imperialGridLineNumbers);
        }

        { // Metric Grid Line Numbers
            const visible = objects.gridLineNumbers.visible;
            const metricGridLineNumbers = this.createGridLineNumbers(METRIC_UNITS);
            metricGridLineNumbers.name = 'MetricGridLineNumbers';
            metricGridLineNumbers.visible = visible && (units === METRIC_UNITS);
            this.group.add(metricGridLineNumbers);
        }

        { // Tool Head
            const color = colornames('silver');
            const url = 'textures/brushed-steel-texture.jpg';
            loadTexture(url, (err, texture) => {
                this.toolhead = new ToolHead(color, texture);
                this.toolhead.name = 'ToolHead';
                this.toolhead.visible = objects.toolhead.visible;
                this.group.add(this.toolhead);

                // Update the scene
                this.updateScene();
            });
        }

        { // Target Point
            this.targetPoint = new TargetPoint({
                color: colornames('indianred'),
                radius: 0.5
            });
            this.targetPoint.name = 'TargetPoint';
            this.targetPoint.visible = true;
            this.group.add(this.targetPoint);
        }

        this.scene.add(this.group);
    }
    // @param [options] The options object.
    // @param [options.forceUpdate] Force rendering
    updateScene(options) {
        const { forceUpdate = false } = { ...options };
        const needUpdateScene = this.props.show || forceUpdate;

        if (this.renderer && needUpdateScene) {
            this.renderer.render(this.scene, this.camera);
        }
    }
    clearScene() {
        // to iterrate over all children (except the first) in a scene
        const objsToRemove = tail(this.scene.children);
        each(objsToRemove, (obj) => {
            this.scene.remove(obj);
        });

        if (this.controls) {
            this.controls.dispose();
        }

        // Update the scene
        this.updateScene();
    }
    renderAnimationLoop() {
        if (this.isAgitated) {
            // Call the render() function up to 60 times per second (i.e. 60fps)
            requestAnimationFrame(::this.renderAnimationLoop);

            // Set to 360 rounds per minute (rpm)
            this.rotateToolHead(360);
        } else {
            // Stop rotation
            this.rotateToolHead(0);
        }

        // Update the scene
        this.updateScene();
    }
    createCombinedCamera(width, height) {
        const frustumWidth = width / 2;
        const frustumHeight = (height || width) / 2; // same to width if height is 0
        const fov = PERSPECTIVE_FOV;
        const near = PERSPECTIVE_NEAR;
        const far = PERSPECTIVE_FAR;
        const orthoNear = ORTHOGRAPHIC_NEAR;
        const orthoFar = ORTHOGRAPHIC_FAR;

        const camera = new THREE.CombinedCamera(
            frustumWidth,
            frustumHeight,
            fov,
            near,
            far,
            orthoNear,
            orthoFar
        );

        camera.position.x = CAMERA_POSITION_X;
        camera.position.y = CAMERA_POSITION_Y;
        camera.position.z = CAMERA_POSITION_Z;

        return camera;
    }
    createPerspectiveCamera(width, height) {
        const fov = PERSPECTIVE_FOV;
        const aspect = (width > 0 && height > 0) ? Number(width) / Number(height) : 1;
        const near = PERSPECTIVE_NEAR;
        const far = PERSPECTIVE_FAR;
        const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);

        camera.position.x = CAMERA_POSITION_X;
        camera.position.y = CAMERA_POSITION_Y;
        camera.position.z = CAMERA_POSITION_Z;

        return camera;
    }
    createOrthographicCamera(width, height) {
        const left = -width / 2;
        const right = width / 2;
        const top = height / 2;
        const bottom = -height / 2;
        const near = ORTHOGRAPHIC_NEAR;
        const far = ORTHOGRAPHIC_FAR;
        const camera = new THREE.OrthographicCamera(left, right, top, bottom, near, far);

        return camera;
    }
    createTrackballControls(object, domElement) {
        const controls = new THREE.TrackballControls(object, domElement);

        controls.rotateSpeed = 1.0;
        controls.zoomSpeed = 1.2;
        controls.panSpeed = 0.8;
        controls.noZoom = false;
        controls.noPan = false;

        controls.staticMoving = true;
        controls.dynamicDampingFactor = 0.3;

        controls.keys = [65, 83, 68];

        controls.minDistance = TRACKBALL_CONTROLS_MIN_DISTANCE;
        controls.maxDistance = TRACKBALL_CONTROLS_MAX_DISTANCE;

        let shouldAnimate = false;
        const animate = () => {
            controls.update();

            // Update the scene
            this.updateScene();

            if (shouldAnimate) {
                requestAnimationFrame(animate);
            }
        };

        controls.addEventListener('start', () => {
            shouldAnimate = true;
            animate();
        });
        controls.addEventListener('end', () => {
            shouldAnimate = false;
            this.updateScene();
        });
        controls.addEventListener('change', () => {
            // Update the scene
            this.updateScene();
        });

        return controls;
    }
    // Rotates the tool head around the z axis with a given rpm and an optional fps
    // @param {number} rpm The rounds per minutes
    // @param {number} [fps] The frame rate (Defaults to 60 frames per second)
    rotateToolHead(rpm = 0, fps = 60) {
        if (!this.toolhead) {
            return;
        }

        const delta = 1 / fps;
        const degrees = 360 * (delta * Math.PI / 180); // Rotates 360 degrees per second
        this.toolhead.rotateZ(-(rpm / 60 * degrees)); // rotate in clockwise direction
    }
    // Set work position
    setWorkPosition(workPosition) {
        const pivotPoint = this.pivotPoint.get();

        let { x = 0, y = 0, z = 0 } = { ...workPosition };
        x = (Number(x) || 0) - pivotPoint.x;
        y = (Number(y) || 0) - pivotPoint.y;
        z = (Number(z) || 0) - pivotPoint.z;

        if (this.toolhead) { // Update toolhead position
            this.toolhead.position.set(x, y, z);
        }

        if (this.targetPoint) { // Update target point position
            this.targetPoint.position.set(x, y, z);
        }
    }
    // Make the controls look at the specified position
    lookAt(x, y, z) {
        this.controls.target.x = x;
        this.controls.target.y = y;
        this.controls.target.z = z;
        this.controls.update();
    }
    // Make the controls look at the center position
    lookAtCenter() {
        if (this.viewport) {
            this.viewport.update();
        }
        if (this.controls) {
            this.controls.reset();
        }
        this.updateScene();
    }
    load(name, gcode, callback) {
        // Remove previous G-code object
        this.unload();

        this.visualizer = new GCodeVisualizer();

        const obj = this.visualizer.render(gcode);
        obj.name = 'Visualizer';
        this.group.add(obj);

        const bbox = getBoundingBox(obj);
        const dX = bbox.max.x - bbox.min.x;
        const dY = bbox.max.y - bbox.min.y;
        const dZ = bbox.max.z - bbox.min.z;
        const center = new THREE.Vector3(
            bbox.min.x + (dX / 2),
            bbox.min.y + (dY / 2),
            bbox.min.z + (dZ / 2)
        );

        // Set the pivot point to the object's center position
        this.pivotPoint.set(center.x, center.y, center.z);

        // Update work position
        this.setWorkPosition(this.workPosition);

        { // Display the name of the G-code file
            const { units, gcode } = this.props.state;
            const gridLength = (units === METRIC_UNITS) ? 10 : 25.4;
            const textSize = 5;
            const posx = center.x;
            const posy = Math.floor(bbox.min.y / gridLength) * gridLength - (gridLength / 2);
            const posz = Math.ceil(bbox.max.z / gridLength) * gridLength + (gridLength / 2);
            const gcodeName = new TextSprite({
                x: posx,
                y: posy,
                z: posz,
                size: textSize,
                text: `G-code: ${name}`,
                color: colornames('gray 44'), // grid color
                opacity: 0.5
            });
            gcodeName.name = 'GCodeDisplayName';
            gcodeName.visible = gcode.displayName;
            obj.add(gcodeName);
        }

        if (this.viewport && dX > 0 && dY > 0) {
            // The minimum viewport is 50x50mm
            const width = Math.max(dX, 50);
            const height = Math.max(dY, 50);
            const target = new THREE.Vector3(0, 0, bbox.max.z);
            this.viewport.set(width, height, target);
        }

        // Update the scene
        this.updateScene();

        (typeof callback === 'function') && callback({ bbox: bbox });
    }
    unload() {
        const visualizerObject = this.group.getObjectByName('Visualizer');

        if (visualizerObject) {
            this.group.remove(visualizerObject);
        }

        if (this.pivotPoint) {
            // Sets the pivot point to the origin point (0, 0, 0)
            this.pivotPoint.set(0, 0, 0);
        }

        if (this.controls) {
            this.controls.reset();
        }

        if (this.viewport) {
            this.viewport.reset();
        }

        // Update the scene
        this.updateScene();
    }
    setCameraMode(mode) {
        // https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/button
        // A number representing a given button:
        // 0: main button pressed, usually the left button or the un-initialized state
        const MAIN_BUTTON = 0;
        const ROTATE = 0;
        const PAN = 2;

        if (mode === CAMERA_MODE_ROTATE) {
            this.controls && this.controls.setMouseButtonState(MAIN_BUTTON, ROTATE);
        }
        if (mode === CAMERA_MODE_PAN) {
            this.controls && this.controls.setMouseButtonState(MAIN_BUTTON, PAN);
        }
    }
    zoom(factor) {
        if (factor === 1.0 || factor <= 0) {
            return;
        }

        if (this.camera.inOrthographicMode) {
            const zoom = this.camera.zoom * factor;
            if (zoom > 0.1) {
                this.camera.setZoom(zoom);
            } else {
                this.camera.setZoom(0.1);
            }
        } else {
            this.camera.position.z *= (2 - factor);
        }

        this.controls.update();

        // Update the scene
        this.updateScene();
    }
    zoomIn(delta = 0.1) {
        const { noZoom, zoomSpeed } = this.controls;
        const factor = 1.0 + delta * zoomSpeed;
        !noZoom && this.zoom(factor);
    }
    zoomOut(delta = 0.1) {
        const { noZoom, zoomSpeed } = this.controls;
        const factor = 1.0 + -1 * delta * zoomSpeed;
        !noZoom && this.zoom(factor);
    }
    // deltaX and deltaY are in pixels; right and down are positive
    pan(deltaX, deltaY) {
        const eye = new THREE.Vector3();
        const pan = new THREE.Vector3();
        const objectUp = new THREE.Vector3();

        eye.subVectors(this.controls.object.position, this.controls.target);
        objectUp.copy(this.controls.object.up);

        pan.copy(eye).cross(objectUp.clone()).setLength(deltaX);
        pan.add(objectUp.clone().setLength(deltaY));

        this.controls.object.position.add(pan);
        this.controls.target.add(pan);
        this.controls.update();
    }
    // http://stackoverflow.com/questions/18581225/orbitcontrol-or-trackballcontrol
    panUp() {
        const { noPan, panSpeed } = this.controls;
        !noPan && this.pan(0, 1 * panSpeed);
    }
    panDown() {
        const { noPan, panSpeed } = this.controls;
        !noPan && this.pan(0, -1 * panSpeed);
    }
    panLeft() {
        const { noPan, panSpeed } = this.controls;
        !noPan && this.pan(1 * panSpeed, 0);
    }
    panRight() {
        const { noPan, panSpeed } = this.controls;
        !noPan && this.pan(-1 * panSpeed, 0);
    }
    render() {
        const { show } = this.props;
        const style = {
            visibility: show ? 'visible' : 'hidden'
        };

        if (!Detector.webgl) {
            return null;
        }

        return (
            <div
                style={style}
                ref={node => {
                    this.node = node;
                }}
            />
        );
    }
}

export default Visualizer;
