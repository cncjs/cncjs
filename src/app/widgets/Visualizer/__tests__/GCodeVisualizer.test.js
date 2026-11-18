/* eslint-env jest */
/* eslint-disable global-require */
describe('GCodeVisualizer theme refresh', () => {
  let GCodeVisualizer;
  let setToolpathColors;

  beforeAll(() => {
    // scene-theme.js reads the theme class at import time
    global.document = { documentElement: { classList: { contains: () => false } } };
    ({ default: GCodeVisualizer, setToolpathColors } = require('../GCodeVisualizer'));
  });

  afterAll(() => {
    delete global.document;
  });

  test('refreshColors updates the material tint along with the vertex colors', () => {
    const visualizer = new GCodeVisualizer();
    visualizer.render('G0 X5 Y5\nG1 X10 Y0\nG1 X10 Y10');
    const workpiece = visualizer.group.children[0];

    setToolpathColors({ rapid: '#00ff00', cut: '#ff0000', arc: '#0000ff', done: '#aaaaaa' });
    visualizer.refreshColors();

    expect(workpiece.material.color.getHexString()).toBe('aaaaaa');
    expect(workpiece.geometry.colors.some(c => c.getHexString() === 'ff0000')).toBe(true);
    expect(workpiece.geometry.colorsNeedUpdate).toBe(true);
  });

  test('refreshColors does nothing without a toolpath', () => {
    const visualizer = new GCodeVisualizer();
    expect(() => visualizer.refreshColors()).not.toThrow();
  });
});
