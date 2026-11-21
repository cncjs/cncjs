/* eslint-env jest */
// stubs for anything Visualizer.jsx touches at import time, as in GCodeVisualizer.test.js
global.document = global.document || {
    createElement: () => ({ getContext: () => ({}) }),
    documentElement: { getAttribute: () => null },
};
global.localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
};

const Visualizer = require('../Visualizer').default;

describe('Visualizer.clearScene', () => {
    it('disposes the scene without throwing', () => {
        const disposed = [];
        const mesh = {
            geometry: { dispose: () => disposed.push('geometry') },
            material: { dispose: () => disposed.push('material') },
        };
        const self = {
            scene: { children: [], remove: jest.fn() },
            group: { traverse: (fn) => fn(mesh), remove: jest.fn(), children: [] },
            updateScene: jest.fn(),
            // plus whatever else clearScene touches, e.g. renderer, controls
        };

        expect(() => Visualizer.prototype.clearScene.call(self)).not.toThrow();
        expect(disposed).toEqual(['geometry', 'material']);
        expect(self.updateScene).toHaveBeenCalled();
    });
});
