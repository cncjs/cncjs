import colornames from 'colornames';
import pubsub from 'pubsub-js';
import * as THREE from 'three';
import log from 'app/lib/log';
import TextSprite from './TextSprite';
import { IMPERIAL_UNITS, METRIC_UNITS } from '../../constants';

class ProbeVisualization {
  constructor(probeData = [], config = {}, camera = null, domElement = null, trackballControls = null, sceneUpdateCallback = null) {
    // Create THREE.Object3D group for all visual elements
    this.group = new THREE.Object3D();
    this.group.name = 'ProbeVisualization';

    const {
      startX = 0,
      startY = 0,
      endX = 10,
      endY = 10,
      units = METRIC_UNITS,
      snapSize = (units === IMPERIAL_UNITS) ? (25.4 / 64) : 5, // Default: 5mm metric, 1/64" imperial
      interactable = false, // Whether dragging/resizing is enabled
    } = config;

    // Store config for later updates
    this.config = { startX, startY, endX, endY, units, snapSize, interactable };

    // Calculate text sizes based on units
    this.labelSize = (units === IMPERIAL_UNITS) ? (25.4 / 2) : (10 / 2);
    this.zOffsetLabelSize = (units === IMPERIAL_UNITS) ? (25.4 / 5) : (10 / 5);

    // Storage for interactive elements
    this.boundaryLine = null;
    this.cornerHandles = [];
    this.interactionPlane = null;
    this.labels = [];

    // Interaction state (for drag/resize)
    this.camera = camera;
    this.domElement = domElement;
    this.controls = trackballControls;
    this.sceneUpdateCallback = sceneUpdateCallback;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.interactionState = 'NONE'; // NONE | DRAGGING_AREA | RESIZING_CORNER
    this.dragStartWorld = null;
    this.initialBounds = null;
    this.activeCornerIndex = null;
    this.lastIntersected = null;

    // Always draw boundary rectangle with dashed lines
    this.drawBoundary(startX, startY, endX, endY);

    // Draw "PROBE AREA" label at top
    this.labels.push(this.drawLabel('PROBE AREA', (startX + endX) / 2, endY + 5, 0));

    // Draw "START" label at first corner
    this.labels.push(this.drawLabel('START', startX - 5, startY - 5, 0));

    // Draw "END" label at opposite corner
    this.labels.push(this.drawLabel('END', endX + 5, endY + 5, 0));

    // Create interactive elements only if no probe data (setup mode)
    if (probeData.length === 0) {
      this.createInteractiveElements();

      // Set initial visibility based on interactable flag
      this.cornerHandles.forEach(handle => {
        handle.visible = interactable;
      });
      if (this.interactionPlane) {
        this.interactionPlane.visible = interactable;
      }
      if (this.boundaryLine) {
        this.boundaryLine.visible = interactable;
      }
      this.labels.forEach(label => {
        label.visible = interactable;
      });

      // Bind interaction events if camera and domElement are provided
      // (visibility controls whether they're actually interactive)
      if (this.camera && this.domElement) {
        this.bindEvents();
      }
    }

    // Only draw probe points if we have data
    if (probeData && probeData.length > 0) {
      // Calculate Z range for color mapping
      const zValues = probeData.map(p => p.z);
      const minZ = Math.min(...zValues);
      const maxZ = Math.max(...zValues);
      const zRange = maxZ - minZ;

      // Create mesh surface if we have enough points
      if (probeData.length >= 4) {
        this.drawProbeSurface(probeData, minZ, maxZ, zRange, startX, endX, startY, endY);
      }

      // Draw probe points with Z-offset labels
      probeData.forEach((point, index) => {
        const { x, y, z } = point;

        // Calculate Z offset relative to first point
        const zOffset = index === 0 ? 0 : z - probeData[0].z;

        // Color based on Z height (green = low/negative, red = high/positive)
        const normalizedZ = zRange > 0 ? (z - minZ) / zRange : 0;
        const color = new THREE.Color();
        // Green for low points, yellow/orange/red for high points
        color.setHSL(0.33 - normalizedZ * 0.33, 0.8, 0.4);

        // Draw sphere at probe point (at Z = 0 for top-down view)
        this.drawProbePoint(x, y, z, color);

        // Add Z-offset label next to the point
        this.drawZOffsetLabel(x, y, z, zOffset);
      });
    }
  }

  drawBoundary(startX, startY, endX, endY) {
    const points = [
      new THREE.Vector3(startX, startY, 0),
      new THREE.Vector3(endX, startY, 0),
      new THREE.Vector3(endX, endY, 0),
      new THREE.Vector3(startX, endY, 0),
      new THREE.Vector3(startX, startY, 0),
    ];

    const geometry = new THREE.Geometry();
    geometry.vertices = points;

    const material = new THREE.LineDashedMaterial({
      color: colornames('brown'),
      linewidth: 2,
      dashSize: 3,
      gapSize: 2,
      opacity: 0.7,
      transparent: true
    });

    const line = new THREE.Line(geometry, material);
    line.computeLineDistances();
    this.boundaryLine = line;
    this.group.add(line);
  }

  drawProbePoint(x, y, z, color) {
    // Draw small sphere at probe location
    const geometry = new THREE.SphereGeometry(1.5, 16, 16);
    const material = new THREE.MeshBasicMaterial({
      color,
      opacity: 0.9,
      transparent: false
    });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.set(x, y, z);
    this.group.add(sphere);
  }

  drawLabel(text, x, y, z) {
    const textSprite = new TextSprite({
      text,
      color: colornames('brown'),
      size: this.labelSize,
      opacity: 0.8,
      fontWeight: 'bold',
    });
    textSprite.position.set(x, y, z);
    this.group.add(textSprite);
    return textSprite;
  }

  drawZOffsetLabel(x, y, z, zOffset) {
    // Format Z offset with sign
    const text = zOffset.toFixed(3);
    const textSprite = new TextSprite({
      text,
      color: colornames('darkred'),
      size: this.zOffsetLabelSize,
      opacity: 1.0, // Fully opaque for better visibility
    });
    // Position label higher above the probe point for better visibility
    textSprite.position.set(x + 2, y + 1, z + 3);
    this.group.add(textSprite);
  }

  drawProbeSurface(probeData, minZ, maxZ, zRange, startX, endX, startY, endY) {
    // Create a mesh surface from probe points
    // Find grid dimensions
    const xCoords = [...new Set(probeData.map(p => p.x))].sort((a, b) => a - b);
    const yCoords = [...new Set(probeData.map(p => p.y))].sort((a, b) => a - b);
    const gridWidth = xCoords.length;
    const gridHeight = yCoords.length;

    if (gridWidth < 2 || gridHeight < 2) {
      return;
    }

    // Create a map for quick lookup: "x,y" -> point
    const pointMap = new Map();
    probeData.forEach(point => {
      const key = `${point.x.toFixed(3)},${point.y.toFixed(3)}`;
      pointMap.set(key, point);
    });

    const geometry = new THREE.Geometry();
    const vertexMap = new Map(); // Maps "x,y" to vertex index

    // Create vertices in grid order
    let vertexIndex = 0;
    for (let yi = 0; yi < gridHeight; yi++) {
      for (let xi = 0; xi < gridWidth; xi++) {
        const x = xCoords[xi];
        const y = yCoords[yi];
        const key = `${x.toFixed(3)},${y.toFixed(3)}`;
        const point = pointMap.get(key);

        if (point) {
          geometry.vertices.push(new THREE.Vector3(point.x, point.y, point.z));
          vertexMap.set(key, vertexIndex);
          vertexIndex++;
        }
      }
    }

    // Create faces (triangles) connecting the probe points
    for (let yi = 0; yi < gridHeight - 1; yi++) {
      for (let xi = 0; xi < gridWidth - 1; xi++) {
        const x1 = xCoords[xi];
        const x2 = xCoords[xi + 1];
        const y1 = yCoords[yi];
        const y2 = yCoords[yi + 1];

        const k1 = `${x1.toFixed(3)},${y1.toFixed(3)}`;
        const k2 = `${x2.toFixed(3)},${y1.toFixed(3)}`;
        const k3 = `${x1.toFixed(3)},${y2.toFixed(3)}`;
        const k4 = `${x2.toFixed(3)},${y2.toFixed(3)}`;

        const i1 = vertexMap.get(k1);
        const i2 = vertexMap.get(k2);
        const i3 = vertexMap.get(k3);
        const i4 = vertexMap.get(k4);

        // Only create faces if all 4 vertices exist
        if (i1 !== undefined && i2 !== undefined && i3 !== undefined && i4 !== undefined) {
          const p1 = pointMap.get(k1);
          const p2 = pointMap.get(k2);
          const p3 = pointMap.get(k3);
          const p4 = pointMap.get(k4);

          const getColor = (point) => {
            const normalizedZ = zRange > 0 ? (point.z - minZ) / zRange : 0;
            const color = new THREE.Color();
            color.setHSL(0.33 - normalizedZ * 0.33, 0.6, 0.5);
            return color;
          };

          // First triangle
          const face1 = new THREE.Face3(i1, i2, i3);
          face1.vertexColors = [getColor(p1), getColor(p2), getColor(p3)];
          geometry.faces.push(face1);

          // Second triangle
          const face2 = new THREE.Face3(i2, i4, i3);
          face2.vertexColors = [getColor(p2), getColor(p4), getColor(p3)];
          geometry.faces.push(face2);
        }
      }
    }

    if (geometry.faces.length === 0) {
      return; // No faces created
    }

    geometry.computeFaceNormals();
    geometry.computeVertexNormals();

    const material = new THREE.MeshBasicMaterial({
      vertexColors: THREE.VertexColors,
      side: THREE.DoubleSide,
      opacity: 0.7,
      transparent: true,
    });

    const mesh = new THREE.Mesh(geometry, material);
    this.group.add(mesh);
  }

  recreateInteractiveElements() {
    // Remove existing interactive elements
    this.cornerHandles.forEach(handle => {
      this.group.remove(handle);
      if (handle.geometry) {
        handle.geometry.dispose();
      }
      if (handle.material) {
        handle.material.dispose();
      }
    });
    this.cornerHandles = [];

    if (this.interactionPlane) {
      this.group.remove(this.interactionPlane);
      if (this.interactionPlane.geometry) {
        this.interactionPlane.geometry.dispose();
      }
      if (this.interactionPlane.material) {
        this.interactionPlane.material.dispose();
      }
      this.interactionPlane = null;
    }

    // Recreate with current bounds
    this.createInteractiveElements();
  }

  createInteractiveElements() {
    const { startX, startY, endX, endY } = this.config;

    // Create corner handles (4 larger spheres at corners for easier clicking)
    const cornerPositions = [
      [startX, startY, 0], // bottom-left (0 - nw-resize)
      [endX, startY, 0], // bottom-right (1 - ne-resize)
      [endX, endY, 0], // top-right (2 - se-resize)
      [startX, endY, 0], // top-left (3 - sw-resize)
    ];

    cornerPositions.forEach((pos, index) => {
      const geometry = new THREE.SphereGeometry(3, 16, 16);
      const material = new THREE.MeshBasicMaterial({
        color: colornames('orange'),
        opacity: 0.9,
        transparent: true,
        depthTest: false,
      });
      const handle = new THREE.Mesh(geometry, material);
      handle.position.set(...pos);
      handle.userData = { type: 'corner', cornerIndex: index };
      handle.name = `corner-${index}`;
      handle.renderOrder = 999;

      this.cornerHandles.push(handle);
      this.group.add(handle);
    });

    // Create invisible interaction plane for drag detection
    const width = Math.abs(endX - startX);
    const height = Math.abs(endY - startY);
    const centerX = (startX + endX) / 2;
    const centerY = (startY + endY) / 2;

    const planeGeometry = new THREE.PlaneGeometry(width, height);
    const planeMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0, // Fully transparent but still visible for raycasting
      side: THREE.DoubleSide,
      depthWrite: false, // Don't block objects behind it
    });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.position.set(centerX, centerY, 0);
    plane.userData = { type: 'area' };
    plane.name = 'interaction-plane';
    // Keep visible = true (default) so raycasting works, but opacity = 0 makes it invisible

    this.interactionPlane = plane;
    this.group.add(plane);
  }

  updateProbeData(probeData) {
    // Remove old probe points and surface
    const objectsToRemove = [];
    this.group.children.forEach(child => {
      if (child !== this.boundaryLine &&
          !this.cornerHandles.includes(child) &&
          child !== this.interactionPlane &&
          !this.labels.includes(child)) {
        objectsToRemove.push(child);
      }
    });

    objectsToRemove.forEach(obj => {
      this.group.remove(obj);
      if (obj.geometry) {
        obj.geometry.dispose();
      }
      if (obj.material) {
        obj.material.dispose();
      }
    });

    // Redraw probe points and surface if we have data
    if (probeData && probeData.length > 0) {
      const zValues = probeData.map(p => p.z);
      const minZ = Math.min(...zValues);
      const maxZ = Math.max(...zValues);
      const zRange = maxZ - minZ;

      // Create mesh surface if we have enough points
      if (probeData.length >= 4) {
        this.drawProbeSurface(probeData, minZ, maxZ, zRange, this.config.startX, this.config.endX, this.config.startY, this.config.endY);
      }

      // Draw probe points with Z-offset labels
      probeData.forEach((point, index) => {
        const { x, y, z } = point;
        const zOffset = index === 0 ? 0 : z - probeData[0].z;
        const normalizedZ = zRange > 0 ? (z - minZ) / zRange : 0;
        const color = new THREE.Color();
        color.setHSL(0.33 - normalizedZ * 0.33, 0.8, 0.4);

        this.drawProbePoint(x, y, z, color);
        this.drawZOffsetLabel(x, y, z, zOffset);
      });
    }
  }

  updateBounds(startX, startY, endX, endY) {
    // Update stored config
    this.config.startX = startX;
    this.config.startY = startY;
    this.config.endX = endX;
    this.config.endY = endY;

    // Update boundary line vertices instead of recreating
    if (this.boundaryLine && this.boundaryLine.geometry) {
      const vertices = this.boundaryLine.geometry.vertices;
      if (vertices && vertices.length === 5) {
        vertices[0].set(startX, startY, 0);
        vertices[1].set(endX, startY, 0);
        vertices[2].set(endX, endY, 0);
        vertices[3].set(startX, endY, 0);
        vertices[4].set(startX, startY, 0);
        this.boundaryLine.geometry.verticesNeedUpdate = true;
        this.boundaryLine.computeLineDistances();
      }
    }

    // Update corner handles positions
    if (this.cornerHandles.length === 4) {
      this.cornerHandles[0].position.set(startX, startY, 0); // bottom-left
      this.cornerHandles[1].position.set(endX, startY, 0); // bottom-right
      this.cornerHandles[2].position.set(endX, endY, 0); // top-right
      this.cornerHandles[3].position.set(startX, endY, 0); // top-left
    }

    // Reposition the interaction plane (geometry is not recreated because
    // raycastProbeElements uses manual bounds-checking, not mesh raycasting)
    if (this.interactionPlane) {
      this.interactionPlane.position.set((startX + endX) / 2, (startY + endY) / 2, 0);
    }

    // Update labels
    if (this.labels.length >= 3) {
      // Update "Probe Area" label position
      this.labels[0].position.set((startX + endX) / 2, endY + 5, 0);
      // Update "Start" label position
      this.labels[1].position.set(startX - 5, startY - 5, 0);
      // Update "End" label position
      this.labels[2].position.set(endX + 5, endY + 5, 0);
    }

    // Trigger scene update if callback provided
    if (this.sceneUpdateCallback) {
      this.sceneUpdateCallback();
    }
  }

  setHoverState(isHovered, elementType, cornerIndex) {
    if (elementType === 'corner') {
      // Highlight only the hovered corner handle
      this.cornerHandles.forEach((handle, index) => {
        handle.material.opacity = (isHovered && index === cornerIndex) ? 1.0 : 0.8;
      });
    } else if (elementType === 'area') {
      // Highlight boundary line
      if (this.boundaryLine) {
        this.boundaryLine.material.opacity = isHovered ? 1.0 : 0.7;
      }
    } else {
      // Reset all to default
      this.cornerHandles.forEach(handle => {
        handle.material.opacity = 0.8;
      });
      if (this.boundaryLine) {
        this.boundaryLine.material.opacity = 0.7;
      }
    }
  }

  // ===== INTERACTION METHODS ===== //

  bindEvents() {
    if (!this.domElement) {
      return;
    }

    this.onMouseMoveBound = this.onMouseMove.bind(this);
    this.onMouseDownBound = this.onMouseDown.bind(this);
    this.onMouseUpBound = this.onMouseUp.bind(this);

    // Use capture phase to intercept events BEFORE TrackballControls
    this.domElement.addEventListener('mousemove', this.onMouseMoveBound, true);
    this.domElement.addEventListener('mousedown', this.onMouseDownBound, true);
    this.domElement.addEventListener('mouseup', this.onMouseUpBound, true);

    log.info('[ProbeVisualization] Event listeners bound (capture phase)');
  }

  unbindEvents() {
    if (!this.domElement) {
      return;
    }

    this.domElement.removeEventListener('mousemove', this.onMouseMoveBound, true);
    this.domElement.removeEventListener('mousedown', this.onMouseDownBound, true);
    this.domElement.removeEventListener('mouseup', this.onMouseUpBound, true);

    // Reset cursor
    this.domElement.style.cursor = 'default';

    // Re-enable controls if disabled
    if (this.controls && !this.controls.enabled) {
      this.controls.enabled = true;
    }

    log.debug('[ProbeVisualization] Event listeners unbound');
  }

  setInteractable(enabled) {
    // Update config
    this.config.interactable = enabled;

    // Show or hide interactive elements (simpler than binding/unbinding events)
    this.cornerHandles.forEach(handle => {
      handle.visible = enabled;
    });

    if (this.interactionPlane) {
      this.interactionPlane.visible = enabled;
    }

    // Also hide boundary line and labels when not interactable
    if (this.boundaryLine) {
      this.boundaryLine.visible = enabled;
    }
    this.labels.forEach(label => {
      label.visible = enabled;
    });

    log.info(`[ProbeVisualization] Interactions ${enabled ? 'enabled' : 'disabled'} (interactive elements ${enabled ? 'visible' : 'hidden'})`);
  }

  snapToGrid(value) {
    const gridSize = this.config.snapSize || 5; // Use configured snap size, fallback to 5mm
    return Math.round(value / gridSize) * gridSize;
  }

  getActualCamera() {
    // CombinedCamera has internal cameraP (perspective) or cameraO (orthographic).
    // These sub-cameras have the correct projection matrix but their matrixWorld
    // is NOT updated by TrackballControls — only the parent CombinedCamera's
    // position/rotation is. We must sync the sub-camera's matrixWorld from the
    // parent so the raycaster computes rays from the correct camera position.
    if (this.camera && this.camera.inOrthographicMode !== undefined) {
      const subCamera = this.camera.inOrthographicMode ? this.camera.cameraO : this.camera.cameraP;
      subCamera.matrixWorld.copy(this.camera.matrixWorld);
      return subCamera;
    }
    return this.camera;
  }

  screenToWorld(clientX, clientY) {
    if (!this.camera || !this.domElement) {
      return null;
    }

    const rect = this.domElement.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    const actualCamera = this.getActualCamera();
    this.raycaster.setFromCamera(this.mouse, actualCamera);

    // Intersect at the group's Z level so the projection is correct when the
    // camera is rotated (parallax between world Z=0 and the probe area's Z).
    const groupZ = this.group.position.z;
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -groupZ);
    const target = new THREE.Vector3();
    return this.raycaster.ray.intersectPlane(plane, target);
  }

  // Returns world-space distance corresponding to `pixels` screen pixels at the current zoom level.
  getPixelToWorldScale() {
    if (!this.domElement) {
      return 1;
    }
    const rect = this.domElement.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const worldCenter = this.screenToWorld(cx, cy);
    const worldRight = this.screenToWorld(cx + 1, cy);
    if (!worldCenter || !worldRight) {
      return 1;
    }
    return worldCenter.distanceTo(worldRight); // world units per pixel
  }

  raycastProbeElements(event) {
    // Don't raycast if interactions are disabled
    if (!this.config.interactable) {
      return null;
    }

    // Compute zoom-aware threshold BEFORE screenToWorld for the mouse position,
    // because getPixelToWorldScale calls screenToWorld internally and changes
    // the raycaster state.
    const CORNER_THRESHOLD_PIXELS = 15;
    const cornerThreshold = Math.max(10, CORNER_THRESHOLD_PIXELS * this.getPixelToWorldScale());

    // Get mouse world position on Z=0 plane (must be AFTER getPixelToWorldScale
    // so the raycaster is set from the actual mouse position last)
    const worldPos = this.screenToWorld(event.clientX, event.clientY);
    if (!worldPos) {
      return null;
    }

    const { startX, startY, endX, endY } = this.config;

    // Convert corner local coordinates to world coordinates
    const corners = [
      { x: startX, y: startY, index: 0 }, // bottom-left
      { x: endX, y: startY, index: 1 }, // bottom-right
      { x: endX, y: endY, index: 2 }, // top-right
      { x: startX, y: endY, index: 3 }, // top-left
    ];

    // Check distance to each corner in world coordinates
    for (const corner of corners) {
      const cornerWorld = this.group.localToWorld(new THREE.Vector3(corner.x, corner.y, 0));
      const distance = Math.sqrt(
        ((worldPos.x - cornerWorld.x) ** 2) +
        ((worldPos.y - cornerWorld.y) ** 2)
      );

      if (distance <= cornerThreshold) {
        return {
          userData: { type: 'corner', cornerIndex: corner.index },
          name: `corner-${corner.index}`,
          worldPos
        };
      }
    }

    // Check if inside probe area (for drag) - convert bounds to world coords
    const minWorld = this.group.localToWorld(new THREE.Vector3(Math.min(startX, endX), Math.min(startY, endY), 0));
    const maxWorld = this.group.localToWorld(new THREE.Vector3(Math.max(startX, endX), Math.max(startY, endY), 0));

    if (worldPos.x >= minWorld.x && worldPos.x <= maxWorld.x &&
        worldPos.y >= minWorld.y && worldPos.y <= maxWorld.y) {
      return {
        userData: { type: 'area' },
        name: 'interaction-plane',
        worldPos
      };
    }

    return null;
  }

  isSameIntersection(a, b) {
    if (a === b) {
      return true;
    }
    if (!a || !b) {
      return false;
    }
    return a.userData.type === b.userData.type &&
      a.userData.cornerIndex === b.userData.cornerIndex;
  }

  onMouseMove(event) {
    if (this.interactionState === 'NONE') {
      const intersected = this.raycastProbeElements(event);

      // Update hover state
      if (!this.isSameIntersection(intersected, this.lastIntersected)) {
        if (this.lastIntersected) {
          this.setHoverState(false, null);
        }
        if (intersected) {
          this.setHoverState(true, intersected.userData.type, intersected.userData.cornerIndex);
        }
        this.lastIntersected = intersected;
      }

      this.updateCursor(intersected);
    } else if (this.interactionState === 'DRAGGING_AREA') {
      event.preventDefault();
      event.stopPropagation();
      this.handleDragArea(event);
    } else if (this.interactionState === 'RESIZING_CORNER') {
      event.preventDefault();
      event.stopPropagation();
      this.handleResizeCorner(event);
    }
  }

  onMouseDown(event) {
    if (event.button !== 0) {
      return;
    }

    const intersected = this.raycastProbeElements(event);

    if (intersected) {
      event.preventDefault();
      event.stopPropagation();
      this.startInteraction(intersected);
    }
  }

  onMouseUp(event) {
    if (event.button !== 0) {
      return;
    }
    if (this.interactionState !== 'NONE') {
      this.endInteraction();
      this.publishBoundsUpdate();
    }
  }

  startInteraction(intersected) {
    // Use the world position already computed by raycastProbeElements to avoid
    // a second screenToWorld call that could return a stale raycaster result.
    const worldPos = intersected.worldPos;
    if (!worldPos) {
      return;
    }

    this.dragStartWorld = worldPos.clone();
    this.initialBounds = { ...this.config };

    if (intersected.userData.type === 'corner') {
      this.interactionState = 'RESIZING_CORNER';
      this.activeCornerIndex = intersected.userData.cornerIndex;
      log.debug('[ProbeVisualization] Start resizing corner:', this.activeCornerIndex);
    } else if (intersected.userData.type === 'area') {
      this.interactionState = 'DRAGGING_AREA';
      log.debug('[ProbeVisualization] Start dragging area');
    }

    // Disable camera controls
    if (this.controls) {
      this.controls.enabled = false;
    }
  }

  handleDragArea(event) {
    const worldPos = this.screenToWorld(event.clientX, event.clientY);
    if (!worldPos || !this.dragStartWorld) {
      return;
    }

    // Convert to local coordinates for delta calculation
    const localPos = this.group.worldToLocal(worldPos.clone());
    const localStartWorld = this.group.worldToLocal(this.dragStartWorld.clone());

    const deltaX = localPos.x - localStartWorld.x;
    const deltaY = localPos.y - localStartWorld.y;

    // Snap the start corner and preserve the original dimensions so the
    // area doesn't change size during drag
    const width = this.initialBounds.endX - this.initialBounds.startX;
    const height = this.initialBounds.endY - this.initialBounds.startY;
    const newStartX = this.snapToGrid(this.initialBounds.startX + deltaX);
    const newStartY = this.snapToGrid(this.initialBounds.startY + deltaY);

    // Update visualization with grid-snapped values
    this.updateBounds(newStartX, newStartY, newStartX + width, newStartY + height);
  }

  handleResizeCorner(event) {
    const worldPos = this.screenToWorld(event.clientX, event.clientY);
    if (!worldPos) {
      return;
    }

    // Convert world position to group's local coordinate system
    const localPos = this.group.worldToLocal(worldPos.clone());

    let { startX, startY, endX, endY } = this.initialBounds;

    // Snap local position to grid during drag
    const snappedX = this.snapToGrid(localPos.x);
    const snappedY = this.snapToGrid(localPos.y);

    // Update the appropriate corner with snapped values
    switch (this.activeCornerIndex) {
      case 0: // bottom-left
        startX = snappedX;
        startY = snappedY;
        break;
      case 1: // bottom-right
        endX = snappedX;
        startY = snappedY;
        break;
      case 2: // top-right
        endX = snappedX;
        endY = snappedY;
        break;
      case 3: // top-left
        startX = snappedX;
        endY = snappedY;
        break;
      default:
        break;
    }

    // Prevent negative areas
    const minSize = (this.config.units === IMPERIAL_UNITS) ? 25.4 : 10;
    if (endX <= startX) {
      if (this.activeCornerIndex === 0 || this.activeCornerIndex === 3) {
        startX = endX - minSize;
      } else {
        endX = startX + minSize;
      }
    }
    if (endY <= startY) {
      if (this.activeCornerIndex === 0 || this.activeCornerIndex === 1) {
        startY = endY - minSize;
      } else {
        endY = startY + minSize;
      }
    }

    // Update visualization with grid-snapped values
    this.updateBounds(startX, startY, endX, endY);
  }

  endInteraction() {
    log.debug('[ProbeVisualization] End interaction, state:', this.interactionState);

    // Snap to grid on release
    const { startX, startY, endX, endY } = this.config;
    const snappedStartX = this.snapToGrid(startX);
    const snappedStartY = this.snapToGrid(startY);
    const snappedEndX = this.snapToGrid(endX);
    const snappedEndY = this.snapToGrid(endY);

    log.info('[ProbeVisualization] Snapping to grid:', {
      before: { startX, startY, endX, endY },
      after: { startX: snappedStartX, startY: snappedStartY, endX: snappedEndX, endY: snappedEndY },
      snapSize: this.config.snapSize
    });

    // Always update to snapped values
    this.updateBounds(snappedStartX, snappedStartY, snappedEndX, snappedEndY);

    this.interactionState = 'NONE';
    this.dragStartWorld = null;
    this.initialBounds = null;
    this.activeCornerIndex = null;

    // Re-enable camera controls
    if (this.controls) {
      this.controls.enabled = true;
    }

    // Reset hover state
    this.setHoverState(false, null);
    this.lastIntersected = null;
    this.updateCursor(null);
  }

  updateCursor(intersected) {
    if (!this.domElement) {
      return;
    }

    if (!intersected) {
      this.domElement.style.cursor = 'default';
    } else if (intersected.userData.type === 'area') {
      this.domElement.style.cursor = 'move';
    } else if (intersected.userData.type === 'corner') {
      const cursors = ['sw-resize', 'se-resize', 'ne-resize', 'nw-resize'];
      this.domElement.style.cursor = cursors[intersected.userData.cornerIndex];
    }
  }

  publishBoundsUpdate() {
    const { startX, startY, endX, endY, units } = this.config;
    log.info('[ProbeVisualization] Publishing bounds update:', { startX, startY, endX, endY });

    pubsub.publish('autolevel:probeAreaUpdated', {
      startX,
      startY,
      endX,
      endY,
      units
    });
  }

  dispose() {
    this.unbindEvents();

    this.group.traverse(obj => {
      if (obj.geometry) {
        obj.geometry.dispose();
      }
      if (obj.material) {
        obj.material.dispose();
      }
    });
  }
}

export default ProbeVisualization;
