import fs from 'fs';
import path from 'path';

export const rectangularFixture = [
  'G21', 'G90',
  'G0 X10 Y20 Z-2',
  'G1 X50 Y20 Z-2 F100',
  'G1 X50 Y60 Z0',
  'G1 X10 Y60 Z0',
  'G1 X10 Y20 Z-2',
].join('\n');

export const metricUnitsFixture = [
  'G21', 'G90',
  'G0 X1 Y2 Z-0.1',
  'G1 X3 Y4 Z0',
].join('\n');

export const imperialUnitsFixture = [
  'G20', 'G90',
  'G0 X1 Y2 Z-0.1',
  'G1 X3 Y4 Z0',
].join('\n');

const ARC_FIXTURE_DIR = path.resolve(__dirname, '../../../../../examples/gcode');

const arcFixture = (name, bounds, samples) => ({
  name,
  source: fs.readFileSync(path.join(ARC_FIXTURE_DIR, name), 'utf8'),
  bounds,
  samples,
});

export const arcFixtures = [
  arcFixture(
    'arc-xy-plane.gcode',
    {
      min: { x: 0, y: 0, z: 0 },
      max: { x: 20, y: 20, z: 0 },
    },
    [
      { index: 0, point: [0, 20, 0] },
      { index: 16, point: [14.142135623730951, 14.14213562373095, 0] },
      { index: 31, point: [20, 0, 0] },
    ]
  ),
  arcFixture(
    'arc-xz-plane.gcode',
    {
      min: { x: -20, y: 0, z: -20 },
      max: { x: 20, y: 0, z: 20 },
    },
    [
      { index: 0, point: [0, 0, 20] },
      { index: 16, point: [-14.142135623730951, 0, -14.14213562373095] },
      { index: 31, point: [20, 0, -3.673940397442059e-15] },
    ]
  ),
  arcFixture(
    'arc-yz-plane.gcode',
    {
      min: { x: 0, y: 0, z: 0 },
      max: { x: 0, y: 20, z: 20 },
    },
    [
      { index: 0, point: [0, 0, 20] },
      { index: 16, point: [0, 14.142135623730951, 14.14213562373095] },
      { index: 31, point: [0, 20, 0] },
    ]
  ),
];

const disposeMaterial = (material) => {
  if (!material) {
    return;
  }

  if (material.map && typeof material.map.dispose === 'function') {
    material.map.dispose();
  }
  if (typeof material.dispose === 'function') {
    material.dispose();
  }
};

export const disposeThreeObject = (object) => {
  if (!object) {
    return;
  }

  object.traverse((child) => {
    if (child.geometry && typeof child.geometry.dispose === 'function') {
      child.geometry.dispose();
    }

    if (Array.isArray(child.material)) {
      child.material.forEach(disposeMaterial);
    } else {
      disposeMaterial(child.material);
    }
  });

  if (object.parent) {
    object.parent.remove(object);
  }
};

export const disposeGCodeVisualizer = (model) => {
  if (!model) {
    return;
  }

  disposeThreeObject(model.group);

  if (model.geometry && typeof model.geometry.dispose === 'function') {
    model.geometry.dispose();
  }
};
