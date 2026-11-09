import * as THREE from 'three';
import GCodeVisualizer from '../GCodeVisualizer';
import { getBoundingBox } from '../helpers';
import {
  arcFixtures,
  disposeGCodeVisualizer,
  imperialUnitsFixture,
  metricUnitsFixture,
  rectangularFixture,
} from './fixtures';

const vectorFromPoint = point => new THREE.Vector3(...point);

describe('GCodeVisualizer geometry baseline', () => {
  const models = [];

  const render = (source) => {
    const model = new GCodeVisualizer();
    const object = model.render(source);
    models.push(model);
    return { model, object };
  };

  afterEach(() => {
    models.forEach(disposeGCodeVisualizer);
    models.length = 0;
  });

  test('known path preserves machine-coordinate bounds and frames', () => {
    const { model, object } = render(rectangularFixture);

    expect(getBoundingBox(object)).toEqual({
      min: { x: 10, y: 20, z: -2 },
      max: { x: 50, y: 60, z: 0 },
    });
    expect(model.frames).toHaveLength(7);
    expect(model.geometry.vertices).toHaveLength(5);
  });

  test.each(arcFixtures)('$name preserves sampled arc geometry', ({ source, bounds, samples }) => {
    const { model, object } = render(source);
    const workpiece = object.children[0];

    expect(getBoundingBox(object)).toEqual(bounds);
    expect(model.frames).toHaveLength(3);
    expect(model.geometry.vertices).toHaveLength(32);
    expect(workpiece.geometry.vertices).toHaveLength(32);

    samples.forEach(({ index, point }) => {
      expect(workpiece.geometry.vertices[index]).toEqual(vectorFromPoint(point));
    });
  });

  test('empty G-code produces an empty, zero-bounded workpiece', () => {
    const { model, object } = render('');

    expect(getBoundingBox(object)).toEqual({
      min: { x: 0, y: 0, z: 0 },
      max: { x: 0, y: 0, z: 0 },
    });
    expect(model.frames).toHaveLength(0);
    expect(model.geometry.vertices).toHaveLength(0);
    expect(object.children[0].geometry.vertices).toHaveLength(0);

    model.setFrameIndex(0);
    expect(model.frameIndex).toBe(0);
  });

  test.each([
    {
      name: 'metric',
      source: metricUnitsFixture,
      bounds: {
        min: { x: 1, y: 2, z: -0.1 },
        max: { x: 3, y: 4, z: 0 },
      },
    },
    {
      name: 'imperial',
      source: imperialUnitsFixture,
      bounds: {
        min: { x: 25.4, y: 50.8, z: -2.54 },
        max: { x: 76.19999999999999, y: 101.6, z: 0 },
      },
    },
  ])('$name units keep deterministic machine coordinates', ({ source, bounds }) => {
    const { object } = render(source);

    expect(getBoundingBox(object)).toEqual(bounds);
  });

  test('frame index accepts the first, middle, and final sent frames', () => {
    const { model } = render(rectangularFixture);

    model.setFrameIndex(0);
    expect(model.frameIndex).toBe(0);

    model.setFrameIndex(3);
    expect(model.frameIndex).toBe(3);

    model.setFrameIndex(model.frames.length - 1);
    expect(model.frameIndex).toBe(6);

    model.setFrameIndex(model.frames.length);
    expect(model.frameIndex).toBe(6);
  });
});
