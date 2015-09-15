import _ from 'lodash';
import pubsub from 'pubsub-js';
import React from 'react';
import THREE from 'three';
import TrackballControls from '../../lib/three/TrackballControls';
import { GCodeRenderer } from '../../lib/gcode';
import Widget from '../widget';
import log from '../../lib/log';
import store from '../../store';
import socket from '../../socket';

export default class GCodeViewer extends React.Component {
    state = {
        width: window.innerWidth,
        height: window.innerHeight
    };

    componentWillMount() {
        this.scene = null;
        this.renderer = null;
        this.camera = null;
        this.object = null;
        this.gcodeRenderer = null;
    }
    componentDidMount() {
        this.subscribeToEvents();
        this.addSocketEvents();
        this.addResizeEventListener();

        let el = React.findDOMNode(this.refs.gcodeViewer);
        this.scene = this.createScene(el);
    }
    componentWillUnmount() {
        this.removeResizeEventListener();
        this.removeSocketEvents();
        this.unsubscribeFromEvents();
    }
    componentDidUnmount() {
        if (this.object) {
            this.scene.remove(this.object);
            this.object = null;
        }
        this.scene = null;
        this.renderer = null;
        this.camera = null;
        this.gcodeRenderer = null;
    }
    subscribeToEvents() {
        let that = this;

        this._unsubscribeFromReduxStore = store.subscribe(() => {
            let gcode = _.get(store.getState(), 'gcode.data');
            that.renderObject(gcode);
        });

        this._unsubscribeFromPubSub = (() => {
            let token = pubsub.subscribe('resize', () => {
                that.resizeRenderer();
            });

            return () => {
                pubsub.unsubscribe(token);
            };
        })();
    }
    unsubscribeFromEvents() {
        // Unsubscribe from PubSub
        this._unsubscribeFromPubSub();

        // Unsubscribe from Redux store
        this._unsubscribeFromReduxStore();
    }
    addSocketEvents() {
        socket.on('gcode:queue-status', ::this.onSocketGCodeQueueStatus);
    }
    removeSocketEvents() {
        socket.off('gcode:queue-status', ::this.onSocketGCodeQueueStatus);
    }
    onSocketGCodeQueueStatus(data) {
        if (! this.gcodeRenderer) {
            return;
        }

        log.trace('onSocketGCodeQueueStatus:', data);

        let frameIndex = data.executed;
        this.gcodeRenderer.setFrameIndex(frameIndex);
    }
    addResizeEventListener() {
        // handle resize event
        if (! this.onResize) {
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
        if (! (this.camera && this.renderer)) {
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
        let scene = new THREE.Scene();
        let camera = this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
        let renderer = this.renderer = new THREE.WebGLRenderer({
            autoClearColor: true
        });
        renderer.setClearColor(0xffffff, 1);
        renderer.setSize(width, height);
        el.appendChild(renderer.domElement);
        renderer.clear();

        // Creating a Directional Light
        let directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight.position.set(0, 1, 0);
        scene.add(directionalLight);

        // By default, when we call scene.add(), the thing we add will be added to the coordinates (0,0,0).
        // This would cause both the camera and the cube to be inside each other.
        // To avoid this, we simply move the camera out a bit.
        camera.position.z = 300;

        // To zoom in/out using TrackballControls
        let trackballControls = new TrackballControls(camera, renderer.domElement);
        trackballControls.noPan = false;
        trackballControls.noZoom = false;
        trackballControls.zoomSpeed = 1.2;
        trackballControls.panSpeed = 1.0;
        trackballControls.rotateSpeed = 2.0;

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
    renderObject(gcode) {
        if (this.object) {
            this.scene.remove(this.object);
        }

        let el = React.findDOMNode(this.refs.gcodeViewer);
        this.gcodeRenderer = new GCodeRenderer();
        this.object = this.gcodeRenderer.render({
            gcode: gcode,
            width: el.clientWidth,
            height: el.clientHeight
        }, function(dimension) {
            //log.debug(dimension);
        });
        this.scene.add(this.object);
    }
    render() {
        let style = {
            backgroundColor: '#fff',
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0
        };

        return (
            <div ref="gcodeViewer" style={style} />
        );
    }
}

export default class GCodeViewerWidget extends React.Component {
    render() {
        var options = {
            content: (
                <div data-component="Widgets/GCodeViewerWidget">
                    <GCodeViewer />
                </div>
            )
        };
        return (
            <Widget options={options} />
        );
    }
}
