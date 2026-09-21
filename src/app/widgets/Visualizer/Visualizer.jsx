import _get from 'lodash/get';
import _each from 'lodash/each';
import _isEqual from 'lodash/isEqual';
import _tail from 'lodash/tail';
import _throttle from 'lodash/throttle';
import pubsub from 'pubsub-js';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import * as THREE from 'three';
import {
  IMPERIAL_UNITS,
  METRIC_UNITS
} from 'app/constants';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as WebGL from 'app/lib/three/WebGL';
import log from 'app/lib/log';
import { getRenderPixelRatio } from 'app/lib/pixel-ratio';
import { mapValueToUnits } from 'app/lib/units';
import store from 'app/store';
import { getBoundingBox, loadSTL } from './helpers';
import * as palette from '../../../lib/toolpath/palette';
import fitCameraToBounds from '../../../lib/toolpath/camera-fit';
import CoordinateAxes from './CoordinateAxes';
import Cuboid from './Cuboid';
import CuttingPointer from './CuttingPointer';
import GridLine from './GridLine';
import PivotPoint3 from './PivotPoint3';
import TextSprite from './TextSprite';
import GCodeVisualizer from './GCodeVisualizer';
import ProbeVisualization from './ProbeVisualization';
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
const PERSPECTIVE_FOV = 70;
const CAMERA_NEAR = 0.001;
const CAMERA_FAR = 5000;

// How much of the scene an orthographic camera sees vertically at zoom 1, in
// millimetres. An orthographic view has no notion of distance, so framing it
// means changing zoom against a fixed frustum rather than moving closer.
const ORTHOGRAPHIC_FRUSTUM_HEIGHT = 300;

// Dolly and zoom limits. The lower bounds stop a scroll wheel from turning
// the view inside out; the upper ones keep the whole machine envelope
// reachable.
const MIN_CAMERA_DISTANCE = 1;
const MAX_CAMERA_DISTANCE = 4000;
const MIN_CAMERA_ZOOM = 0.02;
const MAX_CAMERA_ZOOM = 500;

// The scene when there is neither a loaded file nor a machine profile to
// frame: a 300 mm cube of workspace around the origin.
const DEFAULT_SCENE_EXTENT = 150;

/**
 * Where each named view looks from, as a direction from the point being
 * looked at towards the camera. Z is up throughout, which is the machine's
 * own convention and, just as importantly, fixed: OrbitControls reads
 * `camera.up` once when it is constructed, so a preset that changed it would
 * leave the controls orbiting about an axis the camera no longer uses.
 *
 * The plan view is not exactly (0, 0, 1). Looking straight along the up axis
 * leaves the screen orientation undefined, and fitCameraToBounds resolves
 * that by nudging — the nudge is written out here so the direction the
 * controls are given and the direction the view was framed for are the same
 * one.
 */
/**
 * Which drag action the left mouse button performs, per the widget's camera
 * mode. OrbitControls names the actions rather than numbering the buttons,
 * which is how the two bare numeric constants this used to carry went away.
 */
const MOUSE_BUTTON_ACTION = {
  [CAMERA_MODE_PAN]: THREE.MOUSE.PAN,
  [CAMERA_MODE_ROTATE]: THREE.MOUSE.ROTATE,
};

const VIEW_DIRECTIONS = {
  'top': new THREE.Vector3(0, -0.001, 1).normalize(),
  '3d': new THREE.Vector3(1, -1, 1).normalize(),
  'front': new THREE.Vector3(0, -1, 0),
  'left': new THREE.Vector3(1, 0, 0),
  'right': new THREE.Vector3(-1, 0, 0),
};

class Visualizer extends Component {
    static propTypes = {
      show: PropTypes.bool,
      cameraPosition: PropTypes.oneOf(['top', '3d', 'front', 'left', 'right']),
      state: PropTypes.object
    };

    pubsubTokens = [];

    isAgitated = false;

    machinePosition = {
      x: 0,
      y: 0,
      z: 0
    };

    workPosition = {
      x: 0,
      y: 0,
      z: 0
    };

    // Initialized to null so the first changeMachineProfile() call in
    // componentDidMount detects a difference against the store value and runs
    // the full pivot/rebuild pipeline. Pre-hydrating from the store here would
    // make _isEqual short-circuit and leave pivotPoint at (0, 0, 0).
    machineProfile = null;

    group = new THREE.Group();

    probeVisualization = null;

    pivotPoint = new PivotPoint3({ x: 0, y: 0, z: 0 }, (x, y, z) => { // relative position
      _each(this.group.children, (o) => {
        o.translateX(x);
        o.translateY(y);
        o.translateZ(z);
      });
    });

    node = null;

    resizeObserver = null;

    /**
     * Whether the view is still the one the widget chose rather than one the
     * operator has dragged or zoomed to.
     *
     * While it is, a change of canvas size re-frames instead of merely
     * re-projecting — so the opening view is framed for the canvas it ends up
     * with, and a widget that grows because its neighbour was minimised shows
     * more of the work rather than the same picture stretched. The moment
     * anyone touches the controls it stops, because re-framing someone's view
     * out from under them is worse than a slightly loose fit.
     */
    autoFrame = true;

    setRef = (node) => {
      this.node = node;
    };

    throttledResize = _throttle(() => {
      this.resizeRenderer();
    }, 32); // 60hz

    // Pivot policy. The pivot determines the "machine - pivot" frame the
    // whole scene is rendered in: limits, cutting tool, probe viz, gcode
    // toolpath, and (via rebuildCoordinateSystems) grid + axes all sit at
    // "machine_coords - pivot" so the visible workspace center is at world
    // origin and the orbit controls' default target = (0, 0, 0) orbits that
    // visible center.
    //
    // Pivot is set by this method, load(), and unload(). Combined behavior:
    //
    //   Scenario                                | Pivot after        | Gcode position
    //   ----------------------------------------|--------------------|----------------------
    //   Reload, profile saved, no gcode         | profile center     | -
    //   Manual profile selection, no gcode      | profile center     | -
    //   Manual profile selection, gcode loaded  | gcode bbox center  | at world origin
    //   Profile removed, no gcode               | (0, 0, 0)          | -
    //   Profile removed, gcode loaded           | gcode bbox center  | at world origin
    //   Load gcode                              | gcode bbox center  | at world origin
    //   Unload gcode, profile selected          | profile center     | -
    //   Unload gcode, no profile                | (0, 0, 0)          | -
    //
    // For the two "gcode loaded" rows above the pivot was already at the
    // gcode bbox center (set by load()) and is intentionally left alone, so
    // the toolpath stays visually centered in the viewport across profile
    // changes; only the limits/grid rebuild for the new profile dimensions.
    //
    // The `!this.gcodeVisualizer` check distinguishes the two states.
    // `this.gcodeVisualizer` is the GCodeVisualizer instance — null until
    // load() runs, nulled again by unload() — so it is a direct local source
    // of truth and works the same way regardless of who triggered
    // changeMachineProfile (mount, store change, etc.).
    changeMachineProfile = () => {
      const machineProfile = store.get('workspace.machineProfile');

      if (_isEqual(machineProfile, this.machineProfile)) {
        return;
      }

      this.machineProfile = machineProfile ? { ...machineProfile } : null;

      // Profile removed — reset to defaults and return
      if (!machineProfile) {
        if (!this.gcodeVisualizer) {
          this.pivotPoint.set(0, 0, 0);
        }
        this.updateCuttingToolPosition();
        this.updateCuttingPointerPosition();
        this.updateLimitsPosition();
        this.updateProbeVisualizationPosition();
        if (this.group) {
          this.rebuildCoordinateSystems();
        }
        this.updateScene();
        return;
      }

      if (this.limits) {
        this.group.remove(this.limits);
        this.limits = null;
      }

      const state = this.props.state;
      const limits = _get(this.machineProfile, 'limits');
      const { xmin = 0, xmax = 0, ymin = 0, ymax = 0, zmin = 0, zmax = 0 } = { ...limits };
      this.limits = this.createLimits(xmin, xmax, ymin, ymax, zmin, zmax);
      this.limits.name = 'Limits';
      this.limits.visible = state.objects.limits.visible;
      this.group.add(this.limits);

      // Set pivot to the center of the machine profile work area (XY only).
      // Skipped when gcode is loaded so the toolpath stays centered.
      if (!this.gcodeVisualizer) {
        const centerX = (xmin + xmax) / 2;
        const centerY = (ymin + ymax) / 2;
        this.pivotPoint.set(centerX, centerY, 0);
      }

      this.updateCuttingToolPosition();
      this.updateCuttingPointerPosition();
      this.updateLimitsPosition();
      this.updateProbeVisualizationPosition();

      // Rebuild grid and axes to match the new machine profile dimensions
      if (this.group) {
        this.rebuildCoordinateSystems();
      }

      this.updateScene();
    };

    renderAnimationLoop = () => {
      if (this.isAgitated) {
        // Call the render() function up to 60 times per second (i.e. 60fps)
        requestAnimationFrame(this.renderAnimationLoop);

        const rpm = 600;
        this.rotateCuttingTool(rpm);
      } else {
        const rpm = 0;
        this.rotateCuttingTool(rpm);
      }

      // Update the scene
      this.updateScene();
    };

    constructor(props) {
      super(props);

      // Three.js
      this.renderer = null;
      this.scene = null;
      // Both cameras exist for the lifetime of the widget and `camera` points
      // at whichever projection is active. Keeping both means switching
      // projection does not have to rebuild one, and — more to the point —
      // each is a real PerspectiveCamera or OrthographicCamera, which is what
      // the raycaster and the orbit controls both need to recognise.
      this.perspectiveCamera = null;
      this.orthographicCamera = null;
      this.camera = null;
      this.controls = null;
      this.cuttingTool = null;
      this.cuttingPointer = null;
      this.limits = null;
      this.gcodeVisualizer = null;
    }

    componentDidMount() {
      this.subscribe();
      this.addResizeEventListener();
      store.on('change', this.changeMachineProfile);
      if (this.node) {
        const el = this.node;
        this.createScene(el);
        this.resizeRenderer();
      }

      // Apply any machine profile already in the store (e.g., hydrated from
      // localStorage on page reload). The store 'change' listener above only
      // fires on subsequent updates, so without this call the saved profile
      // never reaches the scene until the user re-selects it.
      this.changeMachineProfile();

      // Last, because framing the opening view means measuring what is in the
      // scene: before the profile is applied the machine envelope is still the
      // zero-sized placeholder createScene builds, and there is nothing worth
      // pointing a camera at.
      this.setCameraPosition(this.props.cameraPosition);
    }

    componentDidUpdate(prevProps) {
      let forceUpdate = false;
      let needUpdateScene = false;
      const prevState = prevProps.state;
      const state = this.props.state;

      // Enable or disable 3D view
      if ((prevProps.show !== this.props.show) && (this.props.show === true)) {
        // Set forceUpdate to true when enabling or disabling 3D view
        forceUpdate = true;
        needUpdateScene = true;
      }

      // Update gcode visualizer's frame index
      if (this.gcodeVisualizer) {
        const frameIndex = state.gcode.sent;
        this.gcodeVisualizer.setFrameIndex(frameIndex);
      }

      // Projection
      if (prevState.projection !== state.projection) {
        this.setProjection(state.projection);
        needUpdateScene = true;
      }

      // Camera Mode
      if (prevState.cameraMode !== state.cameraMode) {
        this.setCameraMode(state.cameraMode);
        needUpdateScene = true;
      }

      // Whether to show coordinate system
      if ((prevState.units !== state.units) ||
            (prevState.objects.coordinateSystem.visible !== state.objects.coordinateSystem.visible)) {
        const visible = state.objects.coordinateSystem.visible;

        // Imperial
        const imperialCoordinateSystem = this.group.getObjectByName('ImperialCoordinateSystem');
        if (imperialCoordinateSystem) {
          imperialCoordinateSystem.visible = visible && (state.units === IMPERIAL_UNITS);
        }

        // Metric
        const metricCoordinateSystem = this.group.getObjectByName('MetricCoordinateSystem');
        if (metricCoordinateSystem) {
          metricCoordinateSystem.visible = visible && (state.units === METRIC_UNITS);
        }

        needUpdateScene = true;
      }

      // Whether to show grid line numbers
      if ((prevState.units !== state.units) ||
            (prevState.objects.gridLineNumbers.visible !== state.objects.gridLineNumbers.visible)) {
        const visible = state.objects.gridLineNumbers.visible;

        // Imperial
        const imperialGridLineNumbers = this.group.getObjectByName('ImperialGridLineNumbers');
        if (imperialGridLineNumbers) {
          imperialGridLineNumbers.visible = visible && (state.units === IMPERIAL_UNITS);
        }

        // Metric
        const metricGridLineNumbers = this.group.getObjectByName('MetricGridLineNumbers');
        if (metricGridLineNumbers) {
          metricGridLineNumbers.visible = visible && (state.units === METRIC_UNITS);
        }

        needUpdateScene = true;
      }

      // Whether to show limits
      if (this.limits && (this.limits.visible !== state.objects.limits.visible)) {
        this.limits.visible = state.objects.limits.visible;
        needUpdateScene = true;
      }

      // Whether to show cutting tool or cutting pointer
      if (this.cuttingTool && this.cuttingPointer && (this.cuttingTool.visible !== state.objects.cuttingTool.visible)) {
        this.cuttingTool.visible = state.objects.cuttingTool.visible;
        this.cuttingPointer.visible = !state.objects.cuttingTool.visible;
        needUpdateScene = true;
      }

      { // Update position
        let needUpdatePosition = false;

        // Machine position
        const { x: mpox0, y: mpoy0, z: mpoz0 } = this.machinePosition;
        const { x: mpox1, y: mpoy1, z: mpoz1 } = state.machinePosition;
        if (mpox0 !== mpox1 || mpoy0 !== mpoy1 || mpoz0 !== mpoz1) {
          this.machinePosition = state.machinePosition;
          needUpdatePosition = true;
          needUpdateScene = true;
        }

        // Work position
        const { x: wpox0, y: wpoy0, z: wpoz0 } = this.workPosition;
        const { x: wpox1, y: wpoy1, z: wpoz1 } = state.workPosition;
        if (wpox0 !== wpox1 || wpoy0 !== wpoy1 || wpoz0 !== wpoz1) {
          this.workPosition = state.workPosition;
          needUpdatePosition = true;
          needUpdateScene = true;
        }

        if (needUpdatePosition) {
          this.updateCuttingToolPosition();
          this.updateCuttingPointerPosition();
          this.updateLimitsPosition();
          this.updateProbeVisualizationPosition();
        }
      }

      if (needUpdateScene) {
        this.updateScene({ forceUpdate: forceUpdate });
      }

      if (this.isAgitated !== state.isAgitated) {
        this.isAgitated = state.isAgitated;

        if (this.isAgitated) {
          // Call renderAnimationLoop when the state changes and isAgitated is true
          requestAnimationFrame(this.renderAnimationLoop);
        }
      }

    }

    componentWillUnmount() {
      this.unsubscribe();
      this.removeResizeEventListener();
      store.removeListener('change', this.changeMachineProfile);
      this.clearScene();
    }

    subscribe() {
      const tokens = [
        pubsub.subscribe('resize', (msg) => {
          this.resizeRenderer();
        }),
        pubsub.subscribe('autolevel:showProbeVisualization', (msg, data) => {
          this.showProbeVisualization(data);
        }),
        pubsub.subscribe('autolevel:hideProbeVisualization', (msg) => {
          this.hideProbeVisualization();
        }),
        pubsub.subscribe('autolevel:updateProbeVisualization', (msg, data) => {
          log.info('[Visualizer] Received updateProbeVisualization event:', data);

          if (this.probeVisualization && typeof this.probeVisualization.updateBounds === 'function') {
            const { startX, startY, endX, endY, snapX, snapY, interactable } = data.config;
            log.info('[Visualizer] Updating bounds to:', { startX, startY, endX, endY, snapX, snapY, interactable });

            // Update snap config if provided
            if (this.probeVisualization.config) {
              if (snapX !== undefined) {
                this.probeVisualization.config.snapX = snapX;
              }
              if (snapY !== undefined) {
                this.probeVisualization.config.snapY = snapY;
              }
            }

            this.probeVisualization.updateBounds(startX, startY, endX, endY);

            // Enable or disable interactions based on interactable flag
            if (typeof this.probeVisualization.setInteractable === 'function' && interactable !== undefined) {
              this.probeVisualization.setInteractable(interactable);
            }

            this.updateScene({ forceUpdate: true });
            log.debug('[Visualizer] Updated probe visualization bounds from AutoLevel');
          } else {
            log.warn('[Visualizer] Cannot update bounds - probeVisualization or updateBounds not available');
          }
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

    showProbeVisualization(data) {
      const { probeData = [], config = {} } = data;

      log.debug('[Visualizer] showProbeVisualization', { probeData: probeData.length, config });

      // If probe visualization doesn't exist, create it once
      if (!this.probeVisualization) {
        this.probeVisualization = new ProbeVisualization(
          probeData,
          config,
          this.camera,
          this.renderer.domElement,
          this.controls,
          () => this.updateScene({ forceUpdate: true }) // Scene update callback for smooth drag
        );
        this.probeVisualization.group.visible = false; // Start hidden
        this.group.add(this.probeVisualization.group);
        log.info('[Visualizer] Created and added probe visualization to group');
      } else {
        // Update existing visualization with new config
        const { startX, startY, endX, endY, snapX, snapY, interactable, units } = config;

        // Update all config values
        if (this.probeVisualization.config) {
          if (snapX !== undefined) {
            this.probeVisualization.config.snapX = snapX;
          }
          if (snapY !== undefined) {
            this.probeVisualization.config.snapY = snapY;
          }
          if (units !== undefined) {
            this.probeVisualization.config.units = units;
          }
          if (interactable !== undefined) {
            this.probeVisualization.config.interactable = interactable;
          }
        }

        // Update probe data (surface and points) - call with empty array to clear old data
        if (typeof this.probeVisualization.updateProbeData === 'function') {
          this.probeVisualization.updateProbeData(probeData);
        }

        if (typeof this.probeVisualization.updateBounds === 'function') {
          this.probeVisualization.updateBounds(startX, startY, endX, endY);
        }
        // Recreate interactive elements with new bounds
        if (typeof this.probeVisualization.recreateInteractiveElements === 'function') {
          this.probeVisualization.recreateInteractiveElements();
        }
        // Enable or disable interactions based on interactable flag
        if (typeof this.probeVisualization.setInteractable === 'function') {
          this.probeVisualization.setInteractable(interactable !== undefined ? interactable : false);
        }
      }

      // Position the group to account for pivot point (like cutting tool)
      this.updateProbeVisualizationPosition();

      // Make visible
      this.probeVisualization.group.visible = true;
      this.updateScene({ forceUpdate: true });
    }

    hideProbeVisualization() {
      if (this.probeVisualization) {
        log.debug('[Visualizer] hideProbeVisualization');

        // Just hide, don't dispose (keeps events bound for next show)
        this.probeVisualization.group.visible = false;
        this.updateScene({ forceUpdate: true });
      }
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
      const el = this.node;
      const visibleWidth = Math.max(
        Number(el && el.parentNode && el.parentNode.clientWidth) || 0,
        360
      );

      return visibleWidth;
    }

    getVisibleHeight() {
      const clientHeight = document.documentElement.clientHeight;
      const navbarHeight = 50;
      const widgetHeaderHeight = 38;
      const widgetFooterHeight = 38;
      const visibleHeight = (
        clientHeight - navbarHeight - widgetHeaderHeight - widgetFooterHeight - 1
      );

      return visibleHeight;
    }

    addResizeEventListener() {
      window.addEventListener('resize', this.throttledResize);

      // The canvas takes its width from its container, not from the window,
      // so watching the window alone misses two things: a layout change that
      // resizes the widget without resizing the browser, and the container
      // still settling for a frame or two after mount. The second is why the
      // opening view used to be framed for a canvas width it never actually
      // had — 880 px when measured at mount, against the 820 px it renders at
      // from the second frame onwards.
      const el = this.node;
      const container = el && el.parentNode;
      if (container && typeof ResizeObserver !== 'undefined') {
        this.resizeObserver = new ResizeObserver(this.throttledResize);
        this.resizeObserver.observe(container);
      }
    }

    removeResizeEventListener() {
      window.removeEventListener('resize', this.throttledResize);

      if (this.resizeObserver) {
        this.resizeObserver.disconnect();
        this.resizeObserver = null;
      }
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

      this.resizeCameras(width, height);

      if (this.autoFrame) {
        this.fitTo(this.sceneBounds());
      }

      this.renderer.setPixelRatio(getRenderPixelRatio());
      this.renderer.setSize(width, height);

      // The toolpath's fat lines are built in screen space, so their material
      // has to be told the canvas size or the width it draws is meaningless.
      if (this.gcodeVisualizer) {
        this.gcodeVisualizer.setResolution(width, height);
      }

      // Update the scene
      this.updateScene();
    }

    createLimits(xmin, xmax, ymin, ymax, zmin, zmax) {
      const dx = Math.abs(xmax - xmin) || Number.MIN_VALUE;
      const dy = Math.abs(ymax - ymin) || Number.MIN_VALUE;
      const dz = Math.abs(zmax - zmin) || Number.MIN_VALUE;
      const color = palette.MACHINE_LIMITS;
      const opacity = palette.MACHINE_LIMITS_OPACITY;
      const transparent = true;
      const dashed = true;
      const dashSize = 3; // The size of the dash.
      const gapSize = 1; // The size of the gap.
      const linewidth = 1; // Controls line thickness.
      const scale = 1; // The scale of the dashed part of a line.
      const limits = new Cuboid({
        dx,
        dy,
        dz,
        color,
        opacity,
        transparent,
        linewidth,
        dashed,
        dashSize,
        gapSize,
        scale,
      });

      return limits;
    }

    // Derive grid and axis bounds from machine profile limits (if set) or
    // fall back to the fixed defaults for the given unit system.
    getCoordinateBounds(units) {
      const gridSpacing = (units === IMPERIAL_UNITS) ? IMPERIAL_GRID_SPACING : METRIC_GRID_SPACING;
      const limits = _get(this.machineProfile, 'limits');
      const { xmin = 0, xmax = 0, ymin = 0, ymax = 0, zmin = 0, zmax = 0 } = { ...limits };
      const hasMachineProfile = (xmax - xmin) > 0 || (ymax - ymin) > 0;

      if (hasMachineProfile) {
        return {
          minX: xmin,
          maxX: xmax,
          minY: ymin,
          maxY: ymax,
          minZ: zmin,
          maxZ: zmax,
          gridSpacing,
        };
      }

      // Default symmetric grid
      const gridCount = (units === IMPERIAL_UNITS) ? IMPERIAL_GRID_COUNT : METRIC_GRID_COUNT;
      const axisLength = (units === IMPERIAL_UNITS) ? IMPERIAL_AXIS_LENGTH : METRIC_AXIS_LENGTH;
      const size = gridCount * gridSpacing;
      return {
        minX: -size,
        maxX: size,
        minY: -size,
        maxY: size,
        minZ: -axisLength,
        maxZ: axisLength,
        gridSpacing,
      };
    }

    createCoordinateSystem(units) {
      const { minX, maxX, minY, maxY, minZ, maxZ, gridSpacing } = this.getCoordinateBounds(units);
      // Both scale with the grid, so the labelling stays in proportion on a
      // 300 mm machine and a 3 m one alike. The letters used to be a fixed
      // 20 mm, which on a small envelope was a quarter of its width — they
      // are now half a grid square, which is about the size of the numbers
      // along the axes rather than several times it.
      const labelSize = gridSpacing * 0.5;
      const labelOffset = gridSpacing * 1.2;
      const group = new THREE.Group();

      { // Coordinate Grid
        const gridLine = new GridLine(
          minX, maxX, gridSpacing,
          minY, maxY, gridSpacing,
          palette.GRID_CENTER, palette.GRID
        );
        _each(gridLine.children, (o) => {
          // A grid is reference, not content. UGS runs its at about a tenth
          // of full opacity and that is most of why a workspace covered in
          // grid lines still reads as background.
          o.material.opacity = palette.GRID_OPACITY;
          o.material.transparent = true;
          o.material.depthWrite = false;
        });
        gridLine.name = 'GridLine';
        group.add(gridLine);
      }

      { // Coordinate Axes — extend to the full grid extent
        const coordinateAxes = new CoordinateAxes({ minX, maxX, minY, maxY, minZ, maxZ });
        coordinateAxes.name = 'CoordinateAxes';
        group.add(coordinateAxes);
      }

      { // Axis Labels — placed just beyond the positive end of each axis
        const axisXLabel = new TextSprite({
          x: maxX + labelOffset,
          y: 0,
          z: 0,
          size: labelSize,
          text: 'X',
          color: palette.AXIS_X
        });
        const axisYLabel = new TextSprite({
          x: 0,
          y: maxY + labelOffset,
          z: 0,
          size: labelSize,
          text: 'Y',
          color: palette.AXIS_Y
        });
        const axisZLabel = new TextSprite({
          x: 0,
          y: 0,
          z: maxZ + labelOffset,
          size: labelSize,
          text: 'Z',
          color: palette.AXIS_Z
        });

        group.add(axisXLabel);
        group.add(axisYLabel);
        group.add(axisZLabel);
      }

      return group;
    }

    createGridLineNumbers(units) {
      const { minX, maxX, minY, maxY, gridSpacing } = this.getCoordinateBounds(units);
      const textSize = (units === IMPERIAL_UNITS) ? (25.4 / 3) : (10 / 3);
      const textOffset = (units === IMPERIAL_UNITS) ? (25.4 / 5) : (10 / 5);
      const group = new THREE.Group();

      // X-axis labels
      for (let x = minX; x <= maxX; x += gridSpacing) {
        if (x !== 0) {
          group.add(new TextSprite({
            x,
            y: textOffset,
            z: 0,
            size: textSize,
            // Scene coords are mm; mapValueToUnits converts and trims
            // trailing zeros (e.g. 25.4 mm → 1 in, 10 mm → 10 mm).
            text: mapValueToUnits(x, units),
            textAlign: 'center',
            textBaseline: 'bottom',
            color: palette.LABEL,
            opacity: palette.LABEL_OPACITY
          }));
        }
      }

      // Y-axis labels
      for (let y = minY; y <= maxY; y += gridSpacing) {
        if (y !== 0) {
          group.add(new TextSprite({
            x: -textOffset,
            y,
            z: 0,
            size: textSize,
            text: mapValueToUnits(y, units),
            textAlign: 'right',
            textBaseline: 'middle',
            color: palette.LABEL,
            opacity: palette.LABEL_OPACITY
          }));
        }
      }

      return group;
    }

    rebuildCoordinateSystems() {
      const { state } = this.props;
      const { units, objects } = state;

      ['ImperialCoordinateSystem', 'MetricCoordinateSystem',
        'ImperialGridLineNumbers', 'MetricGridLineNumbers'].forEach(name => {
        const obj = this.group.getObjectByName(name);
        if (obj) {
          this.group.remove(obj);
        }
      });

      // Grid/axes geometry is built at raw machine coords; shift each group by
      // -pivotPoint so it shares the same frame as the limits, cutting tool,
      // probe visualization, and gcode toolpath (all of which render at
      // "machine coords - pivotPoint").
      const pp = this.pivotPoint.get();
      const positionAtPivot = (group) => {
        group.position.set(-pp.x, -pp.y, -pp.z);
      };

      const imperialCoordinateSystem = this.createCoordinateSystem(IMPERIAL_UNITS);
      imperialCoordinateSystem.name = 'ImperialCoordinateSystem';
      imperialCoordinateSystem.visible = objects.coordinateSystem.visible && (units === IMPERIAL_UNITS);
      positionAtPivot(imperialCoordinateSystem);
      this.group.add(imperialCoordinateSystem);

      const metricCoordinateSystem = this.createCoordinateSystem(METRIC_UNITS);
      metricCoordinateSystem.name = 'MetricCoordinateSystem';
      metricCoordinateSystem.visible = objects.coordinateSystem.visible && (units === METRIC_UNITS);
      positionAtPivot(metricCoordinateSystem);
      this.group.add(metricCoordinateSystem);

      const imperialGridLineNumbers = this.createGridLineNumbers(IMPERIAL_UNITS);
      imperialGridLineNumbers.name = 'ImperialGridLineNumbers';
      imperialGridLineNumbers.visible = objects.gridLineNumbers.visible && (units === IMPERIAL_UNITS);
      positionAtPivot(imperialGridLineNumbers);
      this.group.add(imperialGridLineNumbers);

      const metricGridLineNumbers = this.createGridLineNumbers(METRIC_UNITS);
      metricGridLineNumbers.name = 'MetricGridLineNumbers';
      metricGridLineNumbers.visible = objects.gridLineNumbers.visible && (units === METRIC_UNITS);
      positionAtPivot(metricGridLineNumbers);
      this.group.add(metricGridLineNumbers);
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
      this.renderer.setClearColor(new THREE.Color(palette.BACKGROUND), 1);
      this.renderer.setPixelRatio(getRenderPixelRatio());
      this.renderer.setSize(width, height);
      this.renderer.clear();

      el.appendChild(this.renderer.domElement);

      // To actually be able to display anything with Three.js, we need three things:
      // A scene, a camera, and a renderer so we can render the scene with the camera.
      this.scene = new THREE.Scene();

      this.createCameras(width, height);
      this.camera = (state.projection === 'orthographic')
        ? this.orthographicCamera
        : this.perspectiveCamera;
      this.controls = this.createOrbitControls(this.camera, this.renderer.domElement);

      this.setCameraMode(state.cameraMode);

      { // Directional Light
        const color = 0xffffff;
        const intensity = 1;
        let light;

        light = new THREE.DirectionalLight(color, intensity);
        light.position.set(-1, -1, 1);
        this.scene.add(light);

        light = new THREE.DirectionalLight(color, intensity);
        light.position.set(1, -1, 1);
        this.scene.add(light);
      }

      { // Ambient Light
        // The cutting tool is the only lit object in the scene — the grid,
        // axes, envelope and toolpath are all unlit line materials — so this
        // is really the tool's exposure. At 25% grey the bit came out a muddy
        // olive instead of the yellow it is actually painted.
        const light = new THREE.AmbientLight(0x999999);
        this.scene.add(light);
      }

      // Coordinate systems and grid line numbers (Imperial + Metric) are
      // created via rebuildCoordinateSystems so the initial render uses the
      // same pivot-shifted frame as later rebuilds.
      this.rebuildCoordinateSystems();

      { // Cutting Tool
        loadSTL('assets/models/stl/bit.stl').then((geometry) => {
          // Rotate the geometry 90 degrees about the X axis.
          geometry.rotateX(-Math.PI / 2);

          // Scale the geometry data.
          geometry.scale(0.5, 0.5, 0.5);

          // Compute the bounding box.
          geometry.computeBoundingBox();

          // Set the desired position from the origin rather than its center.
          const height = geometry.boundingBox.max.z - geometry.boundingBox.min.z;
          geometry.translate(0, 0, (height / 2));

          // Solid colour, not the brushed-steel texture this used to fetch.
          // An STL carries no texture coordinates — three's loader produces
          // position, normal and sometimes colour, never uv — so the map
          // sampled one texel for the whole mesh and drew the bit as a flat
          // dark shape. The old `if (geometry.hasColors)` guard hid that by
          // leaving the material undefined instead.
          const material = new THREE.MeshLambertMaterial({
            color: palette.TOOL
          });

          const object = new THREE.Object3D();
          object.add(new THREE.Mesh(geometry, material));

          this.cuttingTool = object;
          this.cuttingTool.name = 'CuttingTool';
          this.cuttingTool.visible = objects.cuttingTool.visible;

          this.group.add(this.cuttingTool);

          // The STL/texture load is async, so the tool may be added to the
          // group after changeMachineProfile() has already run during mount.
          // Sync its position to the current pivot/WPos so it lands at the
          // correct spot instead of the default (0, 0, 0) (which would be the
          // visible workspace center under any non-trivial machine profile).
          this.updateCuttingToolPosition();

          // Update the scene
          this.updateScene();
        });
      }

      { // Cutting Pointer
        this.cuttingPointer = new CuttingPointer({
          color: palette.AXIS_X,
          diameter: 2
        });
        this.cuttingPointer.name = 'CuttingPointer';
        this.cuttingPointer.visible = !objects.cuttingTool.visible;
        this.group.add(this.cuttingPointer);
      }

      { // Limits
        const limits = _get(this.machineProfile, 'limits');
        const { xmin = 0, xmax = 0, ymin = 0, ymax = 0, zmin = 0, zmax = 0 } = { ...limits };
        this.limits = this.createLimits(xmin, xmax, ymin, ymax, zmin, zmax);
        this.limits.name = 'Limits';
        this.limits.visible = objects.limits.visible;
        this.group.add(this.limits);

        this.updateLimitsPosition();
      }

      { // Probe Visualization
        // Create with default bounds, will be updated when shown
        const defaultConfig = {
          startX: 0,
          startY: 0,
          endX: 10,
          endY: 10,
          units: units
        };
        this.probeVisualization = new ProbeVisualization(
          [], // No probe data initially
          defaultConfig,
          this.camera,
          this.renderer.domElement,
          this.controls,
          () => this.updateScene({ forceUpdate: true })
        );
        this.probeVisualization.group.name = 'ProbeVisualization';
        this.probeVisualization.group.visible = false; // Hidden by default
        this.group.add(this.probeVisualization.group);
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
      // Dispose probe visualization events before clearing
      if (this.probeVisualization && typeof this.probeVisualization.dispose === 'function') {
        this.probeVisualization.dispose();
      }

      // to iterrate over all children (except the first) in a scene
      const objsToRemove = _tail(this.scene.children);
      _each(objsToRemove, (obj) => {
        this.scene.remove(obj);
      });

      if (this.controls) {
        this.controls.dispose();
      }

      // Update the scene
      this.updateScene();
    }

    /**
     * Both cameras, sized to the canvas, sharing one `up`.
     *
     * The orthographic frustum is expressed in millimetres rather than in
     * canvas pixels. The camera this replaces mixed the two — it took its
     * frustum from the pixel dimensions and then divided by a zoom derived
     * from a field of view — which worked by coincidence at one canvas size
     * and is impossible to reason about at any other.
     */
    createCameras(width, height) {
      const aspect = (width > 0 && height > 0) ? (width / height) : 1;
      const halfHeight = ORTHOGRAPHIC_FRUSTUM_HEIGHT / 2;
      const halfWidth = halfHeight * aspect;

      this.perspectiveCamera = new THREE.PerspectiveCamera(
        PERSPECTIVE_FOV,
        aspect,
        CAMERA_NEAR,
        CAMERA_FAR
      );

      this.orthographicCamera = new THREE.OrthographicCamera(
        -halfWidth,
        halfWidth,
        halfHeight,
        -halfHeight,
        CAMERA_NEAR,
        CAMERA_FAR
      );

      // Z up, on both, before the controls are built. OrbitControls captures
      // this once in its constructor.
      [this.perspectiveCamera, this.orthographicCamera].forEach((camera) => {
        camera.up.set(0, 0, 1);
        camera.position.set(0, 0, DEFAULT_SCENE_EXTENT);
      });
    }

    /**
     * Match both cameras to the canvas.
     *
     * The inactive one is kept in step too, so switching projection does not
     * produce a frame at the wrong aspect ratio before the next resize.
     */
    resizeCameras(width, height) {
      const aspect = (width > 0 && height > 0) ? (width / height) : 1;
      const halfHeight = ORTHOGRAPHIC_FRUSTUM_HEIGHT / 2;
      const halfWidth = halfHeight * aspect;

      this.perspectiveCamera.aspect = aspect;
      this.perspectiveCamera.updateProjectionMatrix();

      this.orthographicCamera.left = -halfWidth;
      this.orthographicCamera.right = halfWidth;
      this.orthographicCamera.top = halfHeight;
      this.orthographicCamera.bottom = -halfHeight;
      this.orthographicCamera.updateProjectionMatrix();
    }

    createOrbitControls(object, domElement) {
      const controls = new OrbitControls(object, domElement);

      // The whole reason for the change. TrackballControls has no up axis, so
      // dragging tumbled the model until it was hard to tell which way the
      // table faced; OrbitControls keeps Z up no matter how far the view is
      // dragged round, which is what anything CAD-shaped needs.
      controls.enableDamping = false;
      controls.screenSpacePanning = true;

      controls.minDistance = MIN_CAMERA_DISTANCE;
      controls.maxDistance = MAX_CAMERA_DISTANCE;
      controls.minZoom = MIN_CAMERA_ZOOM;
      controls.maxZoom = MAX_CAMERA_ZOOM;

      let shouldAnimate = false;
      const animate = () => {
        controls.update();
        this.updateScene();

        if (shouldAnimate) {
          requestAnimationFrame(animate);
        }
      };

      controls.addEventListener('start', () => {
        // From here the view belongs to whoever is dragging it.
        this.autoFrame = false;
        shouldAnimate = true;
        animate();
      });
      controls.addEventListener('end', () => {
        shouldAnimate = false;
        this.updateScene();
      });
      controls.addEventListener('change', () => {
        this.updateScene();
      });

      return controls;
    }

    /**
     * Point the active camera at the other projection, keeping the view.
     *
     * OrbitControls reads its camera once, so the controls are rebuilt rather
     * than repointed; the target and the viewing direction are carried across
     * so the switch looks like a change of projection rather than a jump to
     * somewhere else.
     */
    setProjection(projection) {
      const next = (projection === 'orthographic')
        ? this.orthographicCamera
        : this.perspectiveCamera;

      if (!next || next === this.camera) {
        return;
      }

      const target = this.controls ? this.controls.target.clone() : new THREE.Vector3();
      const direction = this.camera
        ? this.camera.position.clone().sub(target)
        : VIEW_DIRECTIONS['3d'].clone();

      if (this.controls) {
        this.controls.dispose();
      }

      this.camera = next;
      this.controls = this.createOrbitControls(this.camera, this.renderer.domElement);
      this.controls.target.copy(target);
      this.setCameraMode(this.props.state.cameraMode);

      if (this.probeVisualization) {
        this.probeVisualization.camera = this.camera;
        this.probeVisualization.controls = this.controls;
      }

      this.fitTo(this.sceneBounds(), direction);
    }

    /**
     * What the view should be framed on: the loaded toolpath if there is one,
     * otherwise the machine envelope, otherwise a default patch of workspace.
     *
     * Not the whole scene graph — the coordinate grid runs to 600 mm in every
     * direction whatever else is loaded, so framing that would leave the work
     * a speck in the middle of it.
     */
    sceneBounds() {
      const toolpath = this.group.getObjectByName('Visualizer');
      if (toolpath) {
        const box = new THREE.Box3().setFromObject(toolpath);
        if (!box.isEmpty()) {
          return box;
        }
      }

      const limits = this.limits ? new THREE.Box3().setFromObject(this.limits) : new THREE.Box3();
      const size = limits.getSize(new THREE.Vector3());

      // A profile with no dimensions set still produces a cuboid, just a
      // degenerate one. Framing that would fill the canvas with a tenth of a
      // millimetre of nothing, so fall through to a default patch of
      // workspace — which is also what the grid falls back to.
      if (Math.max(size.x, size.y, size.z) <= 1) {
        return new THREE.Box3(
          new THREE.Vector3(-DEFAULT_SCENE_EXTENT, -DEFAULT_SCENE_EXTENT, -DEFAULT_SCENE_EXTENT),
          new THREE.Vector3(DEFAULT_SCENE_EXTENT, DEFAULT_SCENE_EXTENT, DEFAULT_SCENE_EXTENT)
        );
      }

      // With a profile but no file, the thing being looked at is the machine
      // and the grid that labels it — so take in the coordinate system too.
      // Its axis letters sit two grid squares beyond the envelope, and
      // framing the envelope alone leaves them clipped against the edge.
      const bounds = limits.clone();
      ['ImperialCoordinateSystem', 'MetricCoordinateSystem'].forEach((name) => {
        const object = this.group.getObjectByName(name);
        if (object && object.visible) {
          bounds.union(new THREE.Box3().setFromObject(object));
        }
      });

      return bounds;
    }

    // Frame `bounds`, looking from `direction`. Defaults to the direction the
    // camera is already looking from, which is what a "zoom to fit" button
    // means.
    fitTo(bounds, direction) {
      if (!this.camera || !this.controls) {
        return;
      }

      const from = direction || this.camera.position.clone().sub(this.controls.target);
      if (from.lengthSq() === 0) {
        from.copy(VIEW_DIRECTIONS['3d']);
      }

      const target = fitCameraToBounds(this.camera, bounds, from);
      this.controls.target.copy(target);
      this.controls.update();
      this.controls.saveState();
      this.autoFrame = true;
      this.updateScene();
    }

    // Rotates the cutting tool around the z axis with a given rpm and an optional fps
    // @param {number} rpm The rounds per minutes
    // @param {number} [fps] The frame rate (Defaults to 60 frames per second)
    rotateCuttingTool(rpm = 0, fps = 60) {
      if (!this.cuttingTool) {
        return;
      }

      const delta = 1 / fps;
      const degrees = 360 * (delta * Math.PI / 180); // Rotates 360 degrees per second
      this.cuttingTool.rotateZ(-(rpm / 60 * degrees)); // rotate in clockwise direction
    }

    // Update cutting tool position
    updateCuttingToolPosition() {
      if (!this.cuttingTool) {
        return;
      }

      const pivotPoint = this.pivotPoint.get();
      const { x: wpox, y: wpoy, z: wpoz } = this.workPosition;
      const x0 = wpox - pivotPoint.x;
      const y0 = wpoy - pivotPoint.y;
      const z0 = wpoz - pivotPoint.z;

      this.cuttingTool.position.set(x0, y0, z0);
    }

    // Update cutting pointer position
    updateCuttingPointerPosition() {
      if (!this.cuttingPointer) {
        return;
      }

      const pivotPoint = this.pivotPoint.get();
      const { x: wpox, y: wpoy, z: wpoz } = this.workPosition;
      const x0 = wpox - pivotPoint.x;
      const y0 = wpoy - pivotPoint.y;
      const z0 = wpoz - pivotPoint.z;

      this.cuttingPointer.position.set(x0, y0, z0);
    }

    // Update limits position
    updateLimitsPosition() {
      if (!this.limits) {
        return;
      }

      // Limits represent the machine's fixed envelope and stay anchored to the
      // grid regardless of the active work coordinate system.
      const limits = _get(this.machineProfile, 'limits');
      const { xmin = 0, xmax = 0, ymin = 0, ymax = 0, zmin = 0, zmax = 0 } = { ...limits };
      const pivotPoint = this.pivotPoint.get();
      const x0 = ((xmin + xmax) / 2) - pivotPoint.x;
      const y0 = ((ymin + ymax) / 2) - pivotPoint.y;
      const z0 = ((zmin + zmax) / 2) - pivotPoint.z;

      this.limits.position.set(x0, y0, z0);
    }

    // Update probe visualization position
    updateProbeVisualizationPosition() {
      if (!this.probeVisualization) {
        return;
      }

      const pivotPoint = this.pivotPoint.get();
      this.probeVisualization.group.position.set(-pivotPoint.x, -pivotPoint.y, -pivotPoint.z);
    }

    // Point the camera at one of the named viewpoints.
    //
    // Used at mount to apply the viewpoint the widget starts in, which
    // nothing did before: componentDidUpdate only ever saw a *change*, and
    // the starting value is not one. That went unnoticed while the default
    // happened to match where the camera was left on creation — looking
    // straight down — and would have quietly ignored any other default.
    // Later changes come from the toolbar, which calls the view methods
    // below directly.
    setCameraPosition(cameraPosition) {
      if (cameraPosition === 'top') {
        this.toTopView();
      }
      if (cameraPosition === '3d') {
        this.to3DView();
      }
      if (cameraPosition === 'front') {
        this.toFrontView();
      }
      if (cameraPosition === 'left') {
        this.toLeftSideView();
      }
      if (cameraPosition === 'right') {
        this.toRightSideView();
      }

      // Make this the view the controls return to. Otherwise reset() — which
      // unload() calls on its way through every load() — restores the camera
      // captured when the controls were constructed, so closing or opening a
      // file silently threw away the chosen viewpoint and dropped back to
      // looking straight down.
      if (this.controls) {
        this.controls.saveState();
      }

      this.updateScene();
    }

    // Make the controls look at the specified position
    lookAt(x, y, z) {
      this.controls.target.x = x;
      this.controls.target.y = y;
      this.controls.target.z = z;
      this.controls.update();
    }

    // Back to the framing the current view was set up with.
    lookAtCenter() {
      if (this.controls) {
        this.controls.reset();
      }
      this.updateScene();
    }

    load(name, gcode, callback) {
      // Remove previous G-code object
      this.unload();

      this.gcodeVisualizer = new GCodeVisualizer();
      this.gcodeVisualizer.setResolution(this.getVisibleWidth(), this.getVisibleHeight());

      const obj = this.gcodeVisualizer.render(gcode);
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

      // Set the pivot point to the center of the loaded object
      this.pivotPoint.set(center.x, center.y, center.z);

      // Explicitly anchor the gcode mesh so its bounding-box center lands at
      // world origin, independent of the pivot-delta callback's translation
      // history. Without this, when unload() leaves the pivot at the machine
      // profile's center (rather than (0, 0, 0)), the delta from
      // profile_center → gcode_center would land the mesh at world
      // profile_center instead of world origin.
      obj.position.set(-center.x, -center.y, -center.z);

      // Update position
      this.updateCuttingToolPosition();
      this.updateCuttingPointerPosition();
      this.updateLimitsPosition();
      this.updateProbeVisualizationPosition();

      // Frame the file that was just loaded, from wherever the view is
      // pointing. Keeping the direction matters: a file opened while looking
      // isometrically should still be isometric afterwards.
      this.fitTo(this.sceneBounds());

      // Update the scene
      this.updateScene();

      (typeof callback === 'function') && callback({ bbox: bbox });
    }

    unload() {
      const visualizerObject = this.group.getObjectByName('Visualizer');
      if (visualizerObject) {
        this.group.remove(visualizerObject);
      }

      if (this.gcodeVisualizer) {
        this.gcodeVisualizer = null;
      }

      if (this.pivotPoint) {
        // Reset pivot to the machine profile's XY center (or origin if no
        // profile) so the scene stays in the same "machine - pivot" frame as
        // changeMachineProfile produces. This keeps the visible workspace
        // centered at world origin and the orbit pivot (controls.target =
        // (0, 0, 0)) at the visible center after unloading gcode.
        if (!this.machineProfile) {
          this.pivotPoint.set(0, 0, 0);
        } else {
          const limits = _get(this.machineProfile, 'limits');
          const { xmin = 0, xmax = 0, ymin = 0, ymax = 0 } = { ...limits };
          const centerX = (xmin + xmax) / 2;
          const centerY = (ymin + ymax) / 2;
          this.pivotPoint.set(centerX, centerY, 0);
        }

        // Update positions after resetting pivot point
        this.updateCuttingToolPosition();
        this.updateCuttingPointerPosition();
        this.updateLimitsPosition();
        this.updateProbeVisualizationPosition();

        if (this.group) {
          this.rebuildCoordinateSystems();
        }
      }

      // Re-frame on whatever is left — the machine envelope, or the default
      // patch of workspace — without changing which way the view faces.
      this.fitTo(this.sceneBounds());

      // Update the scene
      this.updateScene();
    }

    setCameraMode(mode) {
      if (!this.controls) {
        return;
      }

      this.controls.mouseButtons.LEFT = MOUSE_BUTTON_ACTION[mode] ?? THREE.MOUSE.ROTATE;
    }

    toTopView() {
      this.fitTo(this.sceneBounds(), VIEW_DIRECTIONS.top);
    }

    to3DView() {
      this.fitTo(this.sceneBounds(), VIEW_DIRECTIONS['3d']);
    }

    toFrontView() {
      this.fitTo(this.sceneBounds(), VIEW_DIRECTIONS.front);
    }

    toLeftSideView() {
      this.fitTo(this.sceneBounds(), VIEW_DIRECTIONS.left);
    }

    toRightSideView() {
      this.fitTo(this.sceneBounds(), VIEW_DIRECTIONS.right);
    }

    // Frame whatever is worth looking at, from where the camera already is.
    zoomFit() {
      this.fitTo(this.sceneBounds());
    }

    /**
     * Step the zoom in or out.
     *
     * OrbitControls keeps its dolly and zoom handling to itself, so the
     * toolbar buttons do the arithmetic here: an orthographic camera scales
     * its zoom, and a perspective one moves along its line of sight. Both are
     * clamped to the same limits the controls use, so a button and the scroll
     * wheel cannot disagree about how far is too far.
     */
    dolly(scale) {
      if (!this.controls || !this.controls.enableZoom) {
        return;
      }

      this.autoFrame = false;

      if (this.camera.isOrthographicCamera) {
        this.camera.zoom = THREE.MathUtils.clamp(
          this.camera.zoom * scale,
          this.controls.minZoom,
          this.controls.maxZoom
        );
        this.camera.updateProjectionMatrix();
      } else {
        const offset = this.camera.position.clone().sub(this.controls.target);
        const distance = THREE.MathUtils.clamp(
          offset.length() / scale,
          this.controls.minDistance,
          this.controls.maxDistance
        );
        this.camera.position.copy(this.controls.target)
          .add(offset.setLength(distance));
      }

      this.controls.update();
      this.updateScene();
    }

    zoomIn(delta = 0.1) {
      this.dolly(1 + delta);
    }

    zoomOut(delta = 0.1) {
      this.dolly(1 / (1 + delta));
    }

    // deltaX and deltaY are in pixels; right and down are positive
    pan(deltaX, deltaY) {
      if (!this.controls || !this.controls.enablePan) {
        return;
      }

      this.autoFrame = false;

      const eye = new THREE.Vector3();
      const pan = new THREE.Vector3();
      const objectUp = new THREE.Vector3();

      eye.subVectors(this.camera.position, this.controls.target);
      objectUp.copy(this.camera.up);

      pan.copy(eye).cross(objectUp.clone()).setLength(deltaX);
      pan.add(objectUp.clone().setLength(deltaY));

      this.camera.position.add(pan);
      this.controls.target.add(pan);
      this.controls.update();
      this.updateScene();
    }

    // http://stackoverflow.com/questions/18581225/orbitcontrol-or-trackballcontrol
    panUp() {
      this.pan(0, 1);
    }

    panDown() {
      this.pan(0, -1);
    }

    panLeft() {
      this.pan(1, 0);
    }

    panRight() {
      this.pan(-1, 0);
    }

    render() {
      if (!WebGL.isWebGLAvailable()) {
        return null;
      }

      return (
        <div
          aria-label="3D Visualizer"
          style={{
            visibility: this.props.show ? 'visible' : 'hidden'
          }}
          ref={this.setRef}
        />
      );
    }
}

export default Visualizer;
