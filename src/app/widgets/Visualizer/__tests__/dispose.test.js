/* eslint-env jest */
import { disposeObject } from '../dispose';

const resource = () => ({ dispose: jest.fn() });
const node = (props = {}, children = []) => ({
  ...props,
  children,
  traverse(fn) {
    fn(this);
    children.forEach(child => child.traverse(fn));
  }
});

describe('disposeObject', () => {
  test('disposes geometry, material and its texture for every object', () => {
    const geometry = resource();
    const map = resource();
    const material = { ...resource(), map };
    disposeObject(node({}, [node({ geometry, material })]));
    expect(geometry.dispose).toHaveBeenCalledTimes(1);
    expect(material.dispose).toHaveBeenCalledTimes(1);
    expect(map.dispose).toHaveBeenCalledTimes(1);
  });

  test('leaves the geometry shared by sprites alone but disposes their material and label texture', () => {
    const sharedGeometry = resource();
    const map = resource();
    const material = { ...resource(), map };
    disposeObject(node({}, [node({ isSprite: true, geometry: sharedGeometry, material })]));
    expect(sharedGeometry.dispose).not.toHaveBeenCalled();
    expect(material.dispose).toHaveBeenCalledTimes(1);
    expect(map.dispose).toHaveBeenCalledTimes(1);
  });

  test('handles material arrays and objects without a geometry or material', () => {
    const a = resource();
    const b = resource();
    expect(() => disposeObject(node({}, [node({ material: [a, b] }), node()]))).not.toThrow();
    expect(a.dispose).toHaveBeenCalledTimes(1);
    expect(b.dispose).toHaveBeenCalledTimes(1);
  });
});
