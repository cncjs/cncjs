import { ensurePositiveNumber } from 'ensure-type';
import _get from 'lodash/get';
import _each from 'lodash/each';
import _isEqual from 'lodash/isEqual';
import colornames from 'colornames';
import * as THREE from 'three';
import {
  IMPERIAL_UNITS,
  METRIC_UNITS
} from '@app/constants';
import CombinedCamera from '@app/lib/three/CombinedCamera';
import TrackballControls from '@app/lib/three/TrackballControls';
import { getRenderPixelRatio } from '@app/lib/pixel-ratio';
import { mapValueToUnits } from '@app/lib/units';
import { getBoundingBox, loadSTL, loadTexture } from './helpers';
import Viewport from './Viewport';
import CoordinateAxes from './CoordinateAxes';
import Cuboid from './Cuboid';
import CuttingPointer from './CuttingPointer';
import GridLine from './GridLine';
import PivotPoint3 from './PivotPoint3';
import TextSprite from './TextSprite';
import GCodeVisualizer, { getDefaultVisualizerColors } from './GCodeVisualizer';
import ProbeVisualization from './ProbeVisualization';
import {
  beginVisualizerLoad,
  cancelVisualizerLoad,
  cancelOwnedAnimationFrame,
  recordOwnedListenerDelta,
  recordVisualizerRender,
  registerVisualizerEngine,
  requestOwnedAnimationFrame,
  unregisterVisualizerEngine,
  updateVisualizerEngineMetrics,
} from './metrics';
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
const CAMERA_DISTANCE = 200; // Move the camera out a bit from the origin (0, 0, 0)
const TRACKBALL_CONTROLS_MIN_DISTANCE = 1;
const TRACKBALL_CONTROLS_MAX_DISTANCE = 2000;

const DEFAULT_OBJECTS = {
  coordinateSystem: { visible: false },
  cuttingTool: { visible: false },
  gridLineNumbers: { visible: false },
  limits: { visible: true },
};

const normalizePosition = position => ({
  x: Number(_get(position, 'x', 0)) || 0,
  y: Number(_get(position, 'y', 0)) || 0,
  z: Number(_get(position, 'z', 0)) || 0,
});

const normalizeObjects = objects => ({
  coordinateSystem: {
    ...DEFAULT_OBJECTS.coordinateSystem,
    ..._get(objects, 'coordinateSystem', {}),
  },
  cuttingTool: {
    ...DEFAULT_OBJECTS.cuttingTool,
    ..._get(objects, 'cuttingTool', {}),
  },
  gridLineNumbers: {
    ...DEFAULT_OBJECTS.gridLineNumbers,
    ..._get(objects, 'gridLineNumbers', {}),
  },
  limits: {
    ...DEFAULT_OBJECTS.limits,
    ..._get(objects, 'limits', {}),
  },
});

const normalizeViewState = (viewState = {}) => ({
  show: viewState.show !== false,
  colorMode: viewState.colorMode === 'dark' ? 'dark' : 'light',
  visualizerColors: viewState.visualizerColors || getDefaultVisualizerColors(viewState.colorMode === 'dark' ? 'dark' : 'light'),
  cameraPosition: viewState.cameraPosition,
  projection: viewState.projection || 'perspective',
  cameraMode: viewState.cameraMode || CAMERA_MODE_ROTATE,
  units: viewState.units || METRIC_UNITS,
  objects: normalizeObjects(viewState.objects),
  machinePosition: normalizePosition(viewState.machinePosition),
  workPosition: normalizePosition(viewState.workPosition),
  isAgitated: viewState.isAgitated === true,
  sent: Number(viewState.sent) || 0,
  machineProfile: viewState.machineProfile || null,
});

const emptyViewState = () => normalizeViewState({
  cameraMode: CAMERA_MODE_ROTATE,
  projection: 'perspective',
  units: METRIC_UNITS,
});

class VisualizerEngine {
  constructor({ container, viewState, onError } = {}) {
    this.container = container;
    this.onError = typeof onError === 'function' ? onError : () => {};
    this.disposed = false;
    this.assetGeneration = 0;
    this.pendingAssetLoads = new Set();
    this.disposedResources = new WeakSet();
    this.agitationAnimationFrame = null;
    this.agitationAnimationGeneration = 0;
    this.controlsAnimationFrame = null;
    this.controlsAnimationGeneration = 0;
    this.shouldAnimateControls = false;
    this.appendedCanvas = null;

    this.viewState = normalizeViewState(viewState);
    this.machinePosition = { x: 0, y: 0, z: 0 };
    this.workPosition = { x: 0, y: 0, z: 0 };
    this.isAgitated = false;
    this.machineProfile = null;
    this.group = new THREE.Group();
    this.probeVisualization = null;
    this.gcodeVisualizer = null;
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.controls = null;
    this.viewport = null;
    this.cuttingTool = null;
    this.cuttingPointer = null;
    this.limits = null;

    this.pivotPoint = new PivotPoint3({ x: 0, y: 0, z: 0 }, (x, y, z) => {
      _each(this.group.children, (object) => {
        object.translateX(x);
        object.translateY(y);
        object.translateZ(z);
      });
    });

    const initialPivot = this.pivotPoint.get();
    registerVisualizerEngine(this, {
      width: this.getVisibleWidth(),
      height: this.getVisibleHeight(),
      canvasAttached: false,
      pivotX: initialPivot.x,
      pivotY: initialPivot.y,
      pivotZ: initialPivot.z,
      cameraPosition: this.viewState.cameraPosition,
      cameraMode: this.viewState.cameraMode,
      projection: this.viewState.projection,
      units: this.viewState.units,
      hasGCode: false,
      limitsVisible: this.viewState.objects.limits.visible,
      coordinateSystemVisible: this.viewState.objects.coordinateSystem.visible,
      gridLineNumbersVisible: this.viewState.objects.gridLineNumbers.visible,
      cuttingToolVisible: this.viewState.objects.cuttingTool.visible,
    });

    try {
      this.createScene();
      this.resize();

      // The initial machine profile must pass through the same profile pipeline
      // as later profile changes. Starting with a null profile makes that first
      // update observable even when the store already contains a profile.
      const initialState = normalizeViewState(viewState);
      this.viewState = { ...emptyViewState(), colorMode: initialState.colorMode };
      this.update(initialState);
    } catch (error) {
      this.dispose();
      throw error;
    }
  }

  getVisibleWidth() {
    return Math.max(
      ensurePositiveNumber(this.container && this.container.clientWidth),
      1
    );
  }

  getVisibleHeight() {
    return ensurePositiveNumber(this.container && this.container.clientHeight);
  }

  updatePivotMetrics() {
    const pivot = this.pivotPoint.get();
    updateVisualizerEngineMetrics(this, {
      pivotX: pivot.x,
      pivotY: pivot.y,
      pivotZ: pivot.z,
    });
  }

  updateGCodeWorldCenterMetrics() {
    if (process.env.NODE_ENV !== 'development') {
      return;
    }
    const object = this.group && this.group.getObjectByName('Visualizer');
    if (!object) {
      updateVisualizerEngineMetrics(this, {
        gcodeWorldCenterX: null,
        gcodeWorldCenterY: null,
        gcodeWorldCenterZ: null,
      });
      return;
    }
    const worldBounds = new THREE.Box3().setFromObject(object);
    const worldCenter = worldBounds.getCenter(new THREE.Vector3());
    updateVisualizerEngineMetrics(this, {
      gcodeWorldCenterX: worldCenter.x,
      gcodeWorldCenterY: worldCenter.y,
      gcodeWorldCenterZ: worldCenter.z,
    });
  }

  update(nextViewState = {}) {
    if (this.disposed) {
      return;
    }

    const previousState = this.viewState;
    const state = normalizeViewState({
      ...previousState,
      ...nextViewState,
      objects: {
        ...previousState.objects,
        ..._get(nextViewState, 'objects', {}),
      },
      visualizerColors: nextViewState.visualizerColors || (
        nextViewState.colorMode && nextViewState.colorMode !== previousState.colorMode
          ? getDefaultVisualizerColors(nextViewState.colorMode === 'dark' ? 'dark' : 'light')
          : previousState.visualizerColors
      ),
    });
    this.viewState = state;
    if (process.env.NODE_ENV === 'development') {
      updateVisualizerEngineMetrics(this, {
        cameraPosition: state.cameraPosition || null,
        cameraMode: state.cameraMode,
        projection: state.projection,
        units: state.units,
        limitsVisible: state.objects.limits.visible,
        coordinateSystemVisible: state.objects.coordinateSystem.visible,
        gridLineNumbersVisible: state.objects.gridLineNumbers.visible,
        cuttingToolVisible: state.objects.cuttingTool.visible,
      });
    }

    let forceUpdate = false;
    let needUpdateScene = false;

    if (previousState.show !== state.show) {
      if (state.show === true) {
        this.resize();
        if (this.viewport) {
          this.viewport.update();
        }
        forceUpdate = true;
      }
      needUpdateScene = true;
    }

    if (this.gcodeVisualizer) {
      this.gcodeVisualizer.setFrameIndex(state.sent);
      if (previousState.sent !== state.sent) {
        needUpdateScene = true;
      }
      if (!_isEqual(previousState.visualizerColors.toolpath, state.visualizerColors.toolpath)) {
        this.gcodeVisualizer.setColors(state.visualizerColors.toolpath);
        needUpdateScene = true;
      }
    }

    if (previousState.projection !== state.projection) {
      if (this.camera) {
        if (state.projection === 'orthographic') {
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
      }
      needUpdateScene = true;
    }

    if (previousState.cameraMode !== state.cameraMode) {
      this.setCameraMode(state.cameraMode);
      needUpdateScene = true;
    }

    if (previousState.colorMode !== state.colorMode ||
        !_isEqual(previousState.visualizerColors.coordinate, state.visualizerColors.coordinate)) {
      this.rebuildCoordinateSystems();
      needUpdateScene = true;
    }

    if ((previousState.units !== state.units) ||
            (previousState.objects.coordinateSystem.visible !== state.objects.coordinateSystem.visible)) {
      const visible = state.objects.coordinateSystem.visible;
      const imperialCoordinateSystem = this.group.getObjectByName('ImperialCoordinateSystem');
      if (imperialCoordinateSystem) {
        imperialCoordinateSystem.visible = visible && (state.units === IMPERIAL_UNITS);
      }
      const metricCoordinateSystem = this.group.getObjectByName('MetricCoordinateSystem');
      if (metricCoordinateSystem) {
        metricCoordinateSystem.visible = visible && (state.units === METRIC_UNITS);
      }
      needUpdateScene = true;
    }

    if ((previousState.units !== state.units) ||
            (previousState.objects.gridLineNumbers.visible !== state.objects.gridLineNumbers.visible)) {
      const visible = state.objects.gridLineNumbers.visible;
      const imperialGridLineNumbers = this.group.getObjectByName('ImperialGridLineNumbers');
      if (imperialGridLineNumbers) {
        imperialGridLineNumbers.visible = visible && (state.units === IMPERIAL_UNITS);
      }
      const metricGridLineNumbers = this.group.getObjectByName('MetricGridLineNumbers');
      if (metricGridLineNumbers) {
        metricGridLineNumbers.visible = visible && (state.units === METRIC_UNITS);
      }
      needUpdateScene = true;
    }

    if (this.limits && this.limits.visible !== state.objects.limits.visible) {
      this.limits.visible = state.objects.limits.visible;
      needUpdateScene = true;
    }

    if (this.cuttingTool && this.cuttingPointer &&
        this.cuttingTool.visible !== state.objects.cuttingTool.visible) {
      this.cuttingTool.visible = state.objects.cuttingTool.visible;
      this.cuttingPointer.visible = !state.objects.cuttingTool.visible;
      needUpdateScene = true;
    }

    let needUpdatePosition = false;
    if (!_isEqual(this.machinePosition, state.machinePosition)) {
      this.machinePosition = state.machinePosition;
      needUpdatePosition = true;
      needUpdateScene = true;
    }
    if (!_isEqual(this.workPosition, state.workPosition)) {
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

    if (!_isEqual(previousState.machineProfile, state.machineProfile)) {
      this.changeMachineProfile(state.machineProfile);
      needUpdateScene = true;
    }

    if (this.isAgitated !== state.isAgitated) {
      this.isAgitated = state.isAgitated;
      if (this.isAgitated) {
        this.startAgitation();
      } else {
        this.cancelAgitation();
        this.rotateCuttingTool(0);
        needUpdateScene = true;
      }
    }

    if (previousState.cameraPosition !== state.cameraPosition) {
      this.applyCameraPosition();
    }

    if (needUpdateScene) {
      this.updateScene({ forceUpdate });
    }
  }

  createScene() {
    if (!this.container) {
      return;
    }

    const { units, objects, cameraMode, projection } = this.viewState;
    const width = this.getVisibleWidth();
    const height = this.getVisibleHeight();

    this.renderer = new THREE.WebGLRenderer({
      autoClearColor: true,
      antialias: true,
      alpha: true
    });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setPixelRatio(getRenderPixelRatio());
    this.renderer.setSize(width, height);
    this.renderer.clear();

    this.appendedCanvas = this.renderer.domElement;
    this.container.appendChild(this.appendedCanvas);
    updateVisualizerEngineMetrics(this, {
      canvasAttached: this.appendedCanvas.parentNode === this.container,
      width,
      height,
    });

    this.scene = new THREE.Scene();
    this.camera = this.createCombinedCamera(width, height);
    this.controls = this.createTrackballControls(this.camera, this.renderer.domElement);
    this.setCameraMode(cameraMode);

    if (projection === 'orthographic') {
      this.camera.toOrthographic();
      this.camera.setZoom(1);
      this.camera.setFov(ORTHOGRAPHIC_FOV);
    } else {
      this.camera.toPerspective();
      this.camera.setZoom(1);
      this.camera.setFov(PERSPECTIVE_FOV);
    }

    const lightColor = 0xffffff;
    const lightIntensity = 1;
    const lightA = new THREE.DirectionalLight(lightColor, lightIntensity);
    lightA.position.set(-1, -1, 1);
    this.scene.add(lightA);

    const lightB = new THREE.DirectionalLight(lightColor, lightIntensity);
    lightB.position.set(1, -1, 1);
    this.scene.add(lightB);

    this.scene.add(new THREE.AmbientLight(colornames('gray 25')));
    this.rebuildCoordinateSystems();

    this.loadCuttingTool(objects);

    this.cuttingPointer = new CuttingPointer({
      color: colornames('indianred'),
      diameter: 2
    });
    this.cuttingPointer.name = 'CuttingPointer';
    this.cuttingPointer.visible = !objects.cuttingTool.visible;
    this.group.add(this.cuttingPointer);

    const limits = _get(this.machineProfile, 'limits');
    const { xmin = 0, xmax = 0, ymin = 0, ymax = 0, zmin = 0, zmax = 0 } = { ...limits };
    this.limits = this.createLimits(xmin, xmax, ymin, ymax, zmin, zmax);
    this.limits.name = 'Limits';
    this.limits.visible = objects.limits.visible;
    this.group.add(this.limits);
    this.updateLimitsPosition();

    const defaultConfig = {
      startX: 0,
      startY: 0,
      endX: 10,
      endY: 10,
      units
    };
    this.probeVisualization = new ProbeVisualization(
      [],
      defaultConfig,
      this.camera,
      this.renderer.domElement,
      this.controls,
      () => this.updateScene({ forceUpdate: true }),
      this
    );
    this.probeVisualization.group.name = 'ProbeVisualization';
    this.probeVisualization.group.visible = false;
    this.group.add(this.probeVisualization.group);

    this.scene.add(this.group);
  }

  disposeResource(resource) {
    if (!resource ||
        (typeof resource !== 'object' && typeof resource !== 'function') ||
        this.disposedResources.has(resource)) {
      return;
    }
    this.disposedResources.add(resource);
    if (typeof resource.dispose === 'function') {
      resource.dispose();
    }
  }

  disposeObjectResources(object, excludedObjects = new Set()) {
    if (!object) {
      return;
    }

    object.traverse(child => {
      if (excludedObjects.has(child)) {
        return;
      }
      if (child.geometry && !child.isSprite) {
        this.disposeResource(child.geometry);
      }
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach(material => {
        if (!material) {
          return;
        }
        Object.keys(material).forEach(key => {
          const value = material[key];
          if (value && value.isTexture) {
            this.disposeResource(value);
          }
        });
        this.disposeResource(material);
      });
    });
  }

  disposePendingAssets() {
    this.pendingAssetLoads.forEach(load => {
      load.resources.forEach(resource => this.disposeResource(resource));
      load.resources.clear();
    });
    this.pendingAssetLoads.clear();
  }

  settleAsset(generation, load, promise) {
    return Promise.resolve(promise).then(resource => {
      if (this.disposed || generation !== this.assetGeneration) {
        this.disposeResource(resource);
      } else {
        load.resources.add(resource);
      }
      return { status: 'fulfilled', value: resource };
    }, reason => ({ status: 'rejected', reason }));
  }

  loadCuttingTool(objects) {
    const generation = ++this.assetGeneration;
    const load = { resources: new Set() };
    this.pendingAssetLoads.add(load);

    let geometryPromise;
    let texturePromise;
    try {
      geometryPromise = loadSTL('assets/models/stl/bit.stl');
    } catch (error) {
      geometryPromise = Promise.reject(error);
    }
    try {
      texturePromise = loadTexture('assets/textures/brushed-steel-texture.jpg');
    } catch (error) {
      texturePromise = Promise.reject(error);
    }

    Promise.all([
      this.settleAsset(generation, load, geometryPromise),
      this.settleAsset(generation, load, texturePromise),
    ]).then(results => {
      this.pendingAssetLoads.delete(load);
      const resources = results
        .filter(result => result.status === 'fulfilled')
        .map(result => result.value);

      if (this.disposed || generation !== this.assetGeneration) {
        resources.forEach(resource => this.disposeResource(resource));
        return;
      }

      const rejected = results.find(result => result.status === 'rejected');
      if (rejected) {
        resources.forEach(resource => this.disposeResource(resource));
        this.onError(rejected.reason);
        return;
      }

      const [geometry, texture] = resources;
      load.resources.clear();
      geometry.rotateX(-Math.PI / 2);
      geometry.scale(0.5, 0.5, 0.5);
      geometry.computeBoundingBox();

      const height = geometry.boundingBox.max.z - geometry.boundingBox.min.z;
      geometry.translate(0, 0, (height / 2));

      let material;
      if (geometry.hasColors) {
        material = new THREE.MeshLambertMaterial({
          map: texture,
          opacity: 0.9,
          transparent: false
        });
      } else {
        this.disposeResource(texture);
      }

      if (this.cuttingTool) {
        this.group.remove(this.cuttingTool);
        this.disposeObjectResources(this.cuttingTool);
      }
      const object = new THREE.Object3D();
      object.add(new THREE.Mesh(geometry, material));
      this.cuttingTool = object;
      this.cuttingTool.name = 'CuttingTool';
      this.cuttingTool.visible = this.viewState.objects.cuttingTool.visible;
      this.group.add(this.cuttingTool);
      this.updateCuttingToolPosition();
      this.updateScene();
    });
  }

  createLimits(xmin, xmax, ymin, ymax, zmin, zmax) {
    const dx = Math.abs(xmax - xmin) || Number.MIN_VALUE;
    const dy = Math.abs(ymax - ymin) || Number.MIN_VALUE;
    const dz = Math.abs(zmax - zmin) || Number.MIN_VALUE;
    return new Cuboid({
      dx,
      dy,
      dz,
      color: colornames('indianred'),
      opacity: 0.5,
      transparent: true,
      linewidth: 1,
      dashed: true,
      dashSize: 3,
      gapSize: 1,
      scale: 1,
    });
  }

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
    const labelOffset = gridSpacing * 2;
    const group = new THREE.Group();
    const colors = this.viewState.visualizerColors.coordinate;

    const gridLine = new GridLine(
      minX,
      maxX,
      gridSpacing,
      minY,
      maxY,
      gridSpacing,
      colors.z,
      colors.grid
    );
    _each(gridLine.children, object => {
      object.material.opacity = this.viewState.colorMode === 'dark' ? 0.5 : 1;
      object.material.transparent = true;
      object.material.depthWrite = false;
    });
    gridLine.name = 'GridLine';
    group.add(gridLine);

    const coordinateAxes = new CoordinateAxes({ minX, maxX, minY, maxY, minZ, maxZ, colors });
    coordinateAxes.name = 'CoordinateAxes';
    group.add(coordinateAxes);

    group.add(new TextSprite({
      x: maxX + labelOffset,
      y: 0,
      z: 0,
      size: 20,
      text: 'X',
      color: colors.x
    }));
    group.add(new TextSprite({
      x: 0,
      y: maxY + labelOffset,
      z: 0,
      size: 20,
      text: 'Y',
      color: colors.y
    }));
    group.add(new TextSprite({
      x: 0,
      y: 0,
      z: maxZ + labelOffset,
      size: 20,
      text: 'Z',
      color: colors.z
    }));

    return group;
  }

  createGridLineNumbers(units) {
    const { minX, maxX, minY, maxY, gridSpacing } = this.getCoordinateBounds(units);
    const textSize = (units === IMPERIAL_UNITS) ? (25.4 / 3) : (10 / 3);
    const textOffset = (units === IMPERIAL_UNITS) ? (25.4 / 5) : (10 / 5);
    const group = new THREE.Group();
    const colors = this.viewState.visualizerColors.coordinate;
    const opacity = this.viewState.colorMode === 'dark' ? 0.85 : 0.5;

    for (let x = minX; x <= maxX; x += gridSpacing) {
      if (x !== 0) {
        group.add(new TextSprite({
          x,
          y: textOffset,
          z: 0,
          size: textSize,
          text: mapValueToUnits(x, units),
          textAlign: 'center',
          textBaseline: 'bottom',
          color: colors.x,
          opacity
        }));
      }
    }

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
          color: colors.y,
          opacity
        }));
      }
    }

    return group;
  }

  rebuildCoordinateSystems() {
    const { units, objects } = this.viewState;
    [
      'ImperialCoordinateSystem',
      'MetricCoordinateSystem',
      'ImperialGridLineNumbers',
      'MetricGridLineNumbers'
    ].forEach(name => {
      const object = this.group.getObjectByName(name);
      if (object) {
        this.group.remove(object);
        this.disposeObjectResources(object);
      }
    });

    const pivot = this.pivotPoint.get();
    const positionAtPivot = group => {
      group.position.set(-pivot.x, -pivot.y, -pivot.z);
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

  changeMachineProfile(machineProfile) {
    const nextMachineProfile = machineProfile || null;

    if (_isEqual(nextMachineProfile, this.machineProfile)) {
      return;
    }

    this.machineProfile = nextMachineProfile;

    if (!this.machineProfile) {
      if (!this.gcodeVisualizer) {
        this.pivotPoint.set(0, 0, 0);
        this.updatePivotMetrics();
      }
      this.updateCuttingToolPosition();
      this.updateCuttingPointerPosition();
      this.updateLimitsPosition();
      this.updateProbeVisualizationPosition();
      this.rebuildCoordinateSystems();
      this.updateGCodeWorldCenterMetrics();
      this.updateScene();
      return;
    }

    if (this.limits) {
      this.group.remove(this.limits);
      this.disposeObjectResources(this.limits);
      this.limits = null;
    }

    const limits = _get(this.machineProfile, 'limits');
    const { xmin = 0, xmax = 0, ymin = 0, ymax = 0, zmin = 0, zmax = 0 } = { ...limits };
    this.limits = this.createLimits(xmin, xmax, ymin, ymax, zmin, zmax);
    this.limits.name = 'Limits';
    this.limits.visible = this.viewState.objects.limits.visible;
    this.group.add(this.limits);

    if (!this.gcodeVisualizer) {
      this.pivotPoint.set((xmin + xmax) / 2, (ymin + ymax) / 2, 0);
      this.updatePivotMetrics();
    }

    this.updateCuttingToolPosition();
    this.updateCuttingPointerPosition();
    this.updateLimitsPosition();
    this.updateProbeVisualizationPosition();
    this.rebuildCoordinateSystems();
    this.updateGCodeWorldCenterMetrics();
    this.updateScene();
  }

  resize() {
    if (this.disposed || !(this.camera && this.renderer)) {
      return;
    }

    const width = this.getVisibleWidth();
    const height = this.getVisibleHeight();
    if (this.container.clientWidth === 0 || height === 0) {
      return;
    }

    this.camera.setSize(width, height);
    this.camera.aspect = height > 0 ? width / height : 1;
    this.camera.updateProjectionMatrix();

    if (!this.viewport) {
      this.viewport = new Viewport(this.camera, CAMERA_VIEWPORT_WIDTH, CAMERA_VIEWPORT_HEIGHT);
    }

    if (this.controls && typeof this.controls.handleResize === 'function') {
      this.controls.handleResize();
    }

    this.renderer.setPixelRatio(getRenderPixelRatio());
    this.renderer.setSize(width, height);
    updateVisualizerEngineMetrics(this, { width, height });
    this.updateScene();
  }

  updateScene(options) {
    if (this.disposed) {
      return;
    }

    const { forceUpdate = false } = { ...options };
    const needUpdateScene = this.viewState.show || forceUpdate;

    if (this.renderer && needUpdateScene) {
      const renderStartedAt = process.env.NODE_ENV === 'development' ? performance.now() : 0;
      this.renderer.render(this.scene, this.camera);
      const renderDurationMs = process.env.NODE_ENV === 'development'
        ? performance.now() - renderStartedAt
        : 0;
      const renderCompletedAtMs = process.env.NODE_ENV === 'development' ? performance.now() : undefined;
      const sceneMetrics = process.env.NODE_ENV === 'development' ? this.getDevelopmentSceneMetrics() : undefined;
      recordVisualizerRender(
        this,
        this.renderer.info && this.renderer.info.memory,
        renderDurationMs,
        sceneMetrics,
        renderCompletedAtMs,
      );
    }
  }

  getDevelopmentSceneMetrics() {
    const cameraPosition = this.camera && this.camera.position;
    const cameraRotation = this.camera && this.camera.rotation;
    const target = this.controls && this.controls.target;
    const getVisible = name => {
      const object = this.group && this.group.getObjectByName(name);
      return !!(object && object.visible);
    };
    const coordinateSystemVisible = getVisible('MetricCoordinateSystem') || getVisible('ImperialCoordinateSystem');
    const gridLineNumbersVisible = getVisible('MetricGridLineNumbers') || getVisible('ImperialGridLineNumbers');

    return {
      cameraX: cameraPosition ? cameraPosition.x : null,
      cameraY: cameraPosition ? cameraPosition.y : null,
      cameraZ: cameraPosition ? cameraPosition.z : null,
      cameraRotationX: cameraRotation ? cameraRotation.x : null,
      cameraRotationY: cameraRotation ? cameraRotation.y : null,
      cameraRotationZ: cameraRotation ? cameraRotation.z : null,
      cameraTargetX: target ? target.x : null,
      cameraTargetY: target ? target.y : null,
      cameraTargetZ: target ? target.z : null,
      cameraDistance: cameraPosition && target ? cameraPosition.distanceTo(target) : null,
      cameraZoom: this.camera ? this.camera.zoom : null,
      cameraFov: this.camera ? this.camera.fov : null,
      projectionModeOrthographic: !!(this.camera && this.camera.inOrthographicMode),
      sceneLimitsVisible: !!(this.limits && this.limits.visible),
      sceneCoordinateSystemVisible: coordinateSystemVisible,
      sceneGridLineNumbersVisible: gridLineNumbersVisible,
      sceneCuttingToolVisible: !!(this.cuttingTool && this.cuttingTool.visible),
    };
  }

  createCombinedCamera(width, height) {
    const frustumWidth = width / 2;
    const frustumHeight = (height || width) / 2;
    const camera = new CombinedCamera(
      frustumWidth,
      frustumHeight,
      PERSPECTIVE_FOV,
      PERSPECTIVE_NEAR,
      PERSPECTIVE_FAR,
      ORTHOGRAPHIC_NEAR,
      ORTHOGRAPHIC_FAR
    );

    camera.position.x = 0;
    camera.position.y = 0;
    camera.position.z = CAMERA_DISTANCE;
    return camera;
  }

  createTrackballControls(object, domElement) {
    const controls = new TrackballControls(object, domElement);

    controls.rotateSpeed = Math.PI;
    controls.zoomSpeed = 1.2;
    controls.panSpeed = 1.0;
    controls.noZoom = false;
    controls.noPan = false;
    controls.staticMoving = true;
    controls.dynamicDampingFactor = 0.3;
    controls.keys = [65, 83, 68];
    controls.minDistance = TRACKBALL_CONTROLS_MIN_DISTANCE;
    controls.maxDistance = TRACKBALL_CONTROLS_MAX_DISTANCE;

    const animate = generation => {
      if (generation !== this.controlsAnimationGeneration ||
          this.disposed || !this.shouldAnimateControls) {
        return;
      }
      this.controlsAnimationFrame = null;
      controls.update();
      this.updateScene();
      if (this.shouldAnimateControls && typeof requestAnimationFrame === 'function') {
        this.controlsAnimationFrame = requestOwnedAnimationFrame(this, () => animate(generation));
      }
    };

    this.controlsStartHandler = () => {
      if (this.shouldAnimateControls) {
        return;
      }
      this.shouldAnimateControls = true;
      const generation = ++this.controlsAnimationGeneration;
      animate(generation);
    };
    this.controlsEndHandler = () => {
      this.shouldAnimateControls = false;
      this.cancelControlsAnimation();
      this.updateScene();
    };
    this.controlsChangeHandler = () => {
      this.updateScene();
    };

    controls.addEventListener('start', this.controlsStartHandler);
    controls.addEventListener('end', this.controlsEndHandler);
    controls.addEventListener('change', this.controlsChangeHandler);
    recordOwnedListenerDelta(this, 3);

    return controls;
  }

  setCameraMode(mode) {
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

  startAgitation() {
    if (this.agitationAnimationFrame !== null || typeof requestAnimationFrame !== 'function') {
      return;
    }
    const generation = ++this.agitationAnimationGeneration;
    this.agitationAnimationFrame = requestOwnedAnimationFrame(this, () => this.renderAnimationLoop(generation));
  }

  cancelAgitation() {
    this.agitationAnimationGeneration += 1;
    if (this.agitationAnimationFrame !== null && typeof cancelAnimationFrame === 'function') {
      cancelOwnedAnimationFrame(this, this.agitationAnimationFrame);
    }
    this.agitationAnimationFrame = null;
  }

  renderAnimationLoop = generation => {
    if (generation !== this.agitationAnimationGeneration || this.disposed) {
      return;
    }
    this.agitationAnimationFrame = null;

    if (this.isAgitated) {
      this.rotateCuttingTool(600);
    } else {
      this.rotateCuttingTool(0);
    }
    this.updateScene();

    if (this.isAgitated && typeof requestAnimationFrame === 'function') {
      this.agitationAnimationFrame = requestOwnedAnimationFrame(this, () => this.renderAnimationLoop(generation));
    }
  };

  cancelControlsAnimation() {
    this.controlsAnimationGeneration += 1;
    if (this.controlsAnimationFrame !== null && typeof cancelAnimationFrame === 'function') {
      cancelOwnedAnimationFrame(this, this.controlsAnimationFrame);
    }
    this.controlsAnimationFrame = null;
  }

  rotateCuttingTool(rpm = 0, fps = 60) {
    if (!this.cuttingTool) {
      return;
    }

    const delta = 1 / fps;
    const degrees = 360 * (delta * Math.PI / 180);
    this.cuttingTool.rotateZ(-(rpm / 60 * degrees));
  }

  updateCuttingToolPosition() {
    if (!this.cuttingTool) {
      return;
    }

    const pivotPoint = this.pivotPoint.get();
    const { x: wpox, y: wpoy, z: wpoz } = this.workPosition;
    this.cuttingTool.position.set(
      wpox - pivotPoint.x,
      wpoy - pivotPoint.y,
      wpoz - pivotPoint.z
    );
  }

  updateCuttingPointerPosition() {
    if (!this.cuttingPointer) {
      return;
    }

    const pivotPoint = this.pivotPoint.get();
    const { x: wpox, y: wpoy, z: wpoz } = this.workPosition;
    this.cuttingPointer.position.set(
      wpox - pivotPoint.x,
      wpoy - pivotPoint.y,
      wpoz - pivotPoint.z
    );
  }

  updateLimitsPosition() {
    if (!this.limits) {
      return;
    }

    const limits = _get(this.machineProfile, 'limits');
    const { xmin = 0, xmax = 0, ymin = 0, ymax = 0, zmin = 0, zmax = 0 } = { ...limits };
    const pivotPoint = this.pivotPoint.get();
    this.limits.position.set(
      ((xmin + xmax) / 2) - pivotPoint.x,
      ((ymin + ymax) / 2) - pivotPoint.y,
      ((zmin + zmax) / 2) - pivotPoint.z
    );
  }

  updateProbeVisualizationPosition() {
    if (!this.probeVisualization) {
      return;
    }

    const pivotPoint = this.pivotPoint.get();
    this.probeVisualization.group.position.set(-pivotPoint.x, -pivotPoint.y, -pivotPoint.z);
  }

  lookAt(x, y, z) {
    if (!this.controls) {
      return;
    }
    this.controls.target.x = x;
    this.controls.target.y = y;
    this.controls.target.z = z;
    this.controls.update();
    this.updateScene();
  }

  applyCameraPosition() {
    if (!this.camera || !this.controls) {
      return;
    }
    if (this.viewState.cameraPosition === 'top') {
      this.toTopView();
    }
    if (this.viewState.cameraPosition === '3d') {
      this.to3DView();
    }
    if (this.viewState.cameraPosition === 'front') {
      this.toFrontView();
    }
    if (this.viewState.cameraPosition === 'left') {
      this.toLeftSideView();
    }
    if (this.viewState.cameraPosition === 'right') {
      this.toRightSideView();
    }
  }

  lookAtCenter() {
    if (this.viewport) {
      this.viewport.update();
    }
    if (this.controls) {
      this.controls.reset();
    }
    this.applyCameraPosition();
    this.updateScene();
  }

  load({ name, content } = {}) {
    // `name` is intentionally accepted for owner metadata. Parsing is based
    // only on the supplied content and remains synchronous.
    this.unload();

    beginVisualizerLoad(this, name);
    this.gcodeVisualizer = new GCodeVisualizer(this.viewState.visualizerColors.toolpath);
    let object;
    try {
      object = this.gcodeVisualizer.render(content);
    } catch (error) {
      // A failed parse must not leave a load sample pending for another file.
      cancelVisualizerLoad(this);
      throw error;
    }
    this.gcodeVisualizer.setFrameIndex(this.viewState.sent);
    object.name = 'Visualizer';
    this.group.add(object);
    updateVisualizerEngineMetrics(this, { hasGCode: true });

    const bbox = getBoundingBox(object);
    const dX = bbox.max.x - bbox.min.x;
    const dY = bbox.max.y - bbox.min.y;
    const dZ = bbox.max.z - bbox.min.z;
    const center = new THREE.Vector3(
      bbox.min.x + (dX / 2),
      bbox.min.y + (dY / 2),
      bbox.min.z + (dZ / 2)
    );

    this.pivotPoint.set(center.x, center.y, center.z);
    this.updatePivotMetrics();
    object.position.set(-center.x, -center.y, -center.z);
    this.updateGCodeWorldCenterMetrics();

    this.updateCuttingToolPosition();
    this.updateCuttingPointerPosition();
    this.updateLimitsPosition();
    this.updateProbeVisualizationPosition();

    if (this.viewport && dX > 0 && dY > 0) {
      const width = Math.max(dX, 50);
      const height = Math.max(dY, 50);
      const target = new THREE.Vector3(0, 0, bbox.max.z);
      this.viewport.set(width, height, target);
    }
    this.applyCameraPosition();

    this.updateScene();
    return { bbox };
  }

  unload() {
    cancelVisualizerLoad(this);
    const visualizerObject = this.group.getObjectByName('Visualizer');
    if (visualizerObject) {
      this.group.remove(visualizerObject);
    }

    if (this.gcodeVisualizer && typeof this.gcodeVisualizer.dispose === 'function') {
      this.gcodeVisualizer.dispose(resource => this.disposeResource(resource));
    } else if (visualizerObject) {
      this.disposeObjectResources(visualizerObject);
    }

    this.gcodeVisualizer = null;
    if (process.env.NODE_ENV === 'development') {
      this.updateGCodeWorldCenterMetrics();
      updateVisualizerEngineMetrics(this, { hasGCode: false });
    } else {
      updateVisualizerEngineMetrics(this, { hasGCode: false });
    }

    if (this.machineProfile) {
      const limits = _get(this.machineProfile, 'limits');
      const { xmin = 0, xmax = 0, ymin = 0, ymax = 0 } = { ...limits };
      this.pivotPoint.set((xmin + xmax) / 2, (ymin + ymax) / 2, 0);
      this.updatePivotMetrics();
    } else {
      this.pivotPoint.set(0, 0, 0);
      this.updatePivotMetrics();
    }

    this.updateCuttingToolPosition();
    this.updateCuttingPointerPosition();
    this.updateLimitsPosition();
    this.updateProbeVisualizationPosition();
    this.rebuildCoordinateSystems();

    if (this.controls) {
      this.controls.reset();
    }
    if (this.viewport) {
      this.viewport.reset();
    }
    this.applyCameraPosition();
    this.updateScene();
  }

  toTopView() {
    if (!this.camera) {
      return;
    }

    if (this.controls) {
      this.controls.reset();
    }
    this.camera.up.set(0, 1, 0);
    this.camera.position.set(0, 0, CAMERA_DISTANCE);
    if (this.viewport) {
      this.viewport.update();
    }
    if (this.controls) {
      this.controls.update();
    }
    this.updateScene();
  }

  to3DView() {
    if (!this.camera) {
      return;
    }

    if (this.controls) {
      this.controls.reset();
    }
    this.camera.up.set(0, 0, 1);
    this.camera.position.set(CAMERA_DISTANCE, -CAMERA_DISTANCE, CAMERA_DISTANCE);
    if (this.viewport) {
      this.viewport.update();
    }
    if (this.controls) {
      this.controls.update();
    }
    this.updateScene();
  }

  toFrontView() {
    if (!this.camera) {
      return;
    }

    if (this.controls) {
      this.controls.reset();
    }
    this.camera.up.set(0, 0, 1);
    this.camera.position.set(0, -CAMERA_DISTANCE, 0);
    if (this.viewport) {
      this.viewport.update();
    }
    if (this.controls) {
      this.controls.update();
    }
    this.updateScene();
  }

  toLeftSideView() {
    if (!this.camera) {
      return;
    }

    if (this.controls) {
      this.controls.reset();
    }
    this.camera.up.set(0, 0, 1);
    this.camera.position.set(CAMERA_DISTANCE, 0, 0);
    if (this.viewport) {
      this.viewport.update();
    }
    if (this.controls) {
      this.controls.update();
    }
  }

  toRightSideView() {
    if (!this.camera) {
      return;
    }

    if (this.controls) {
      this.controls.reset();
    }
    this.camera.up.set(0, 0, 1);
    this.camera.position.set(-CAMERA_DISTANCE, 0, 0);
    if (this.viewport) {
      this.viewport.update();
    }
    if (this.controls) {
      this.controls.update();
    }
    this.updateScene();
  }

  zoomFit() {
    if (this.viewport) {
      this.viewport.update();
    }
    this.updateScene();
  }

  zoomIn(delta = 0.1) {
    if (!this.controls || this.controls.noZoom) {
      return;
    }
    this.controls.zoomIn(delta);
    this.controls.update();
    this.updateScene();
  }

  zoomOut(delta = 0.1) {
    if (!this.controls || this.controls.noZoom) {
      return;
    }
    this.controls.zoomOut(delta);
    this.controls.update();
    this.updateScene();
  }

  pan(deltaX, deltaY) {
    if (!this.controls) {
      return;
    }
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
    this.updateScene();
  }

  panUp() {
    if (this.controls && !this.controls.noPan) {
      this.pan(0, 1 * this.controls.panSpeed);
    }
  }

  panDown() {
    if (this.controls && !this.controls.noPan) {
      this.pan(0, -1 * this.controls.panSpeed);
    }
  }

  panLeft() {
    if (this.controls && !this.controls.noPan) {
      this.pan(1 * this.controls.panSpeed, 0);
    }
  }

  panRight() {
    if (this.controls && !this.controls.noPan) {
      this.pan(-1 * this.controls.panSpeed, 0);
    }
  }

  showProbe(data = {}) {
    const { probeData = [], config = {} } = data;

    if (!this.probeVisualization) {
      return;
    }

    if (this.probeVisualization.config) {
      const { snapX, snapY, units, interactable } = config;
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

    if (probeData.length > 0 || config.startX !== undefined) {
      if (probeData.length > 0 && this.probeVisualization.config) {
        this.probeVisualization.updateProbeData(probeData);
      }
      if (typeof this.probeVisualization.updateBounds === 'function' &&
          config.startX !== undefined) {
        this.probeVisualization.updateBounds(
          config.startX,
          config.startY,
          config.endX,
          config.endY
        );
      }
    }

    if (typeof this.probeVisualization.recreateInteractiveElements === 'function') {
      this.probeVisualization.recreateInteractiveElements();
    }
    if (typeof this.probeVisualization.setInteractable === 'function') {
      this.probeVisualization.setInteractable(config.interactable !== undefined ? config.interactable : false);
    }

    this.updateProbeVisualizationPosition();
    this.probeVisualization.group.visible = true;
    this.updateScene({ forceUpdate: true });
  }

  updateProbe(data = {}) {
    if (!this.probeVisualization) {
      return;
    }

    const { probeData = [], config = {} } = data;
    if (probeData.length > 0 && typeof this.probeVisualization.updateProbeData === 'function') {
      this.probeVisualization.updateProbeData(probeData);
    }
    if (this.probeVisualization.config) {
      const { snapX, snapY, units, interactable } = config;
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
    if (typeof this.probeVisualization.updateBounds === 'function' &&
        config.startX !== undefined) {
      this.probeVisualization.updateBounds(
        config.startX,
        config.startY,
        config.endX,
        config.endY
      );
    }
    if (typeof this.probeVisualization.recreateInteractiveElements === 'function') {
      this.probeVisualization.recreateInteractiveElements();
    }
    if (typeof this.probeVisualization.setInteractable === 'function' &&
        config.interactable !== undefined) {
      this.probeVisualization.setInteractable(config.interactable);
    }
    this.updateProbeVisualizationPosition();
    this.updateScene({ forceUpdate: true });
  }

  hideProbe() {
    if (this.probeVisualization) {
      this.probeVisualization.group.visible = false;
      this.updateScene({ forceUpdate: true });
    }
  }

  dispose() {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.assetGeneration += 1;
    this.disposePendingAssets();
    this.cancelAgitation();
    this.cancelControlsAnimation();
    this.shouldAnimateControls = false;

    const probeGroup = this.probeVisualization && this.probeVisualization.group;
    const excludedObjects = new Set();
    if (probeGroup) {
      probeGroup.traverse(object => excludedObjects.add(object));
    }
    if (this.probeVisualization && typeof this.probeVisualization.dispose === 'function') {
      this.probeVisualization.dispose();
    }
    const visualizerObject = this.group.getObjectByName('Visualizer');
    if (this.gcodeVisualizer && typeof this.gcodeVisualizer.dispose === 'function') {
      this.gcodeVisualizer.dispose(resource => this.disposeResource(resource));
    } else if (visualizerObject) {
      this.disposeObjectResources(visualizerObject);
    }
    if (visualizerObject) {
      this.group.remove(visualizerObject);
    }
    this.gcodeVisualizer = null;
    if (this.controls) {
      if (typeof this.controls.removeEventListener === 'function') {
        this.controls.removeEventListener('start', this.controlsStartHandler);
        this.controls.removeEventListener('end', this.controlsEndHandler);
        this.controls.removeEventListener('change', this.controlsChangeHandler);
        recordOwnedListenerDelta(this, -3);
      }
      if (typeof this.controls.dispose === 'function') {
        this.controls.dispose();
      }
    }
    this.disposeObjectResources(this.group, excludedObjects);
    if (this.renderer && typeof this.renderer.dispose === 'function') {
      this.renderer.dispose();
    }
    if (this.appendedCanvas && this.appendedCanvas.parentNode === this.container) {
      this.container.removeChild(this.appendedCanvas);
    }
    updateVisualizerEngineMetrics(this, { canvasAttached: false });
    unregisterVisualizerEngine(this);
  }
}

export const createVisualizerEngine = options => new VisualizerEngine(options);

export default createVisualizerEngine;
