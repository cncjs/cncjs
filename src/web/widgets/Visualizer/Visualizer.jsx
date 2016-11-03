/* eslint-disable import/no-unresolved */
import 'imports?THREE=three!three/examples/js/controls/TrackballControls';
/* eslint-enable */
import _ from 'lodash';
import colornames from 'colornames';
import pubsub from 'pubsub-js';
import React, { Component, PropTypes } from 'react';
import * as THREE from 'three';
import Detector from 'three/examples/js/Detector';
import { fitCameraToObject, getBoundingBox, loadTexture } from './helpers';
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

const IMPERIAL_GRID_COUNT = 32; // 32 inches
const IMPERIAL_GRID_SPACING = 25.4; // 1 inch
const IMPERIAL_AXIS_LENGTH = IMPERIAL_GRID_SPACING * 12; // 12 inches
const METRIC_GRID_COUNT = 60; // 60 cm
const METRIC_GRID_SPACING = 10; // 1 cm
const METRIC_AXIS_LENGTH = METRIC_GRID_SPACING * 30; // 30 cm
const CAMERA_FOV = 70;
const CAMERA_NEAR = 0.001;
const CAMERA_FAR = 10000;
const CAMERA_POSITION_X = 0;
const CAMERA_POSITION_Y = 0;
const CAMERA_POSITION_Z = 200; // Move the camera out a bit from the origin (0, 0, 0)

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
        _.each(this.group.children, (o) => {
            o.translateX(x);
            o.translateY(y);
            o.translateZ(z);
        });

        // Update the scene
        this.updateScene();
    });

    componentWillMount() {
        // Three.js
        this.renderer = null;
        this.scene = null;
        this.camera = null;
        this.controls = null;
        this.toolhead = null;
        this.targetPoint = null;
        this.visualizer = null;
    }
    componentDidMount() {
        this.subscribe();
        this.addResizeEventListener();

        if (this.node) {
            this.createScene(this.node);
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
            // Set forceUpdate to true when enabling or disabling 3D view
            forceUpdate = true;
            needUpdateScene = true;
        }

        // Update visualizer's frame index
        if (this.visualizer) {
            const frameIndex = nextState.gcode.sent;
            this.visualizer.setFrameIndex(frameIndex);
        }

        // Display or hide coordinate system
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

        // Display or hide toolhead
        if (this.toolhead && (this.toolhead.visible !== nextState.objects.toolhead.visible)) {
            this.toolhead.visible = nextState.objects.toolhead.visible;

            needUpdateScene = true;
        }

        // Update work position
        if (!_.isEqual(this.workPosition, nextState.workPosition)) {
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
        _.each(this.pubsubTokens, (token) => {
            pubsub.unsubscribe(token);
        });
        this.pubsubTokens = [];
    }
    addResizeEventListener() {
        // handle resize event
        if (!(this.onResize)) {
            this.onResize = () => {
                this.resizeRenderer();
            };
        }
        this.onResize();
        this.onResizeThrottled = _.throttle(::this.onResize, 10);
        window.addEventListener('resize', this.onResizeThrottled);
    }
    removeResizeEventListener() {
        // handle resize event
        window.removeEventListener('resize', this.onResizeThrottled);
        this.onResizeThrottled = null;
    }
    resizeRenderer() {
        if (!(this.camera && this.renderer)) {
            return;
        }

        const el = this.node;
        const navbarHeight = 50;
        const widgetHeaderHeight = 32;
        const borderWidth = 1;
        const width = el.offsetWidth;
        const height = window.innerHeight - navbarHeight - widgetHeaderHeight - borderWidth;

        // Update the camera aspect ratio (width / height), and set a new size to the renderer.
        // Also see "Window on resize, and aspect ratio #69" at https://github.com/mrdoob/three.js/issues/69
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);

        // Update the scene
        this.updateScene();
    }
    createCoordinateSystem(options) {
        const {
            axisLength = METRIC_AXIS_LENGTH,
            gridCount = METRIC_GRID_COUNT,
            gridSpacing = METRIC_GRID_SPACING
        } = { ...options };

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
            _.each(gridLine.children, (o) => {
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

            for (let i = -gridCount; i <= gridCount; ++i) {
                if (i !== 0) {
                    const textLabel = new TextSprite({
                        x: i * gridSpacing,
                        y: 5,
                        z: 0,
                        size: 6,
                        text: i,
                        color: colornames('red'),
                        opacity: 0.5
                    });
                    group.add(textLabel);
                }
            }
            for (let i = -gridCount; i <= gridCount; ++i) {
                if (i !== 0) {
                    const textLabel = new TextSprite({
                        x: -5,
                        y: i * gridSpacing,
                        z: 0,
                        size: 6,
                        text: i,
                        color: colornames('green'),
                        opacity: 0.5
                    });
                    group.add(textLabel);
                }
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
        const width = el.clientWidth;
        const height = el.clientHeight;

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

        // Perspective camera
        this.camera = this.createPerspectiveCamera(width, height);

        // Trackball Controls
        this.controls = this.createTrackballControls(this.camera, this.renderer.domElement);

        // Ambient light
        const light = new THREE.AmbientLight(colornames('gray 25')); // soft white light
        this.scene.add(light);

        { // Imperial
            const visible = objects.coordinateSystem.visible;
            const imperialCoordinateSystem = this.createCoordinateSystem({
                axisLength: IMPERIAL_AXIS_LENGTH,
                gridCount: IMPERIAL_GRID_COUNT,
                gridSpacing: IMPERIAL_GRID_SPACING
            });
            imperialCoordinateSystem.name = 'ImperialCoordinateSystem';
            imperialCoordinateSystem.visible = visible && (units === IMPERIAL_UNITS);
            this.group.add(imperialCoordinateSystem);
        }

        { // Metric
            const visible = objects.coordinateSystem.visible;
            const metricCoordinateSystem = this.createCoordinateSystem({
                axisLength: METRIC_AXIS_LENGTH,
                gridCount: METRIC_GRID_COUNT,
                gridSpacing: METRIC_GRID_SPACING
            });
            metricCoordinateSystem.name = 'MetricCoordinateSystem';
            metricCoordinateSystem.visible = visible && (units === METRIC_UNITS);
            this.group.add(metricCoordinateSystem);
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
        const objsToRemove = _.tail(this.scene.children);
        _.each(objsToRemove, (obj) => {
            this.scene.remove(obj);
        });

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
    createPerspectiveCamera(width, height) {
        const fov = CAMERA_FOV;
        const aspect = Number(width) / Number(height);
        const near = CAMERA_NEAR;
        const far = CAMERA_FAR;
        const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);

        camera.position.x = CAMERA_POSITION_X;
        camera.position.y = CAMERA_POSITION_Y;
        camera.position.z = CAMERA_POSITION_Z;

        return camera;
    }
    createTrackballControls(object, domElement) {
        const controls = new THREE.TrackballControls(object, domElement);

        controls.rotateSpeed = 1.0;
        controls.zoomSpeed = 0.1;
        controls.panSpeed = 0.3;
        controls.dynamicDampingFactor = 0.15;
        controls.minDistance = 1;
        controls.maxDistance = 5000;

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
        this.controls.reset();
    }
    load(data, callback) {
        // Remove previous G-code object
        this.unload();

        this.visualizer = new GCodeVisualizer();
        this.visualizer.render({ gcode: data })
            .then((obj) => {
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

                { // Fit the camera to object
                    const objectWidth = dX;
                    const objectHeight = dY;
                    const lookTarget = new THREE.Vector3(0, 0, bbox.max.z);

                    fitCameraToObject(this.camera, objectWidth, objectHeight, lookTarget);
                }

                // Update the scene
                this.updateScene();

                (typeof callback === 'function') && callback({ bbox: bbox });
            });
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
            // Reset controls
            this.controls.reset();
        }

        // Update the scene
        this.updateScene();
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
