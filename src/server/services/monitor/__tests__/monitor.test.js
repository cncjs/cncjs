import fs from 'fs';
import os from 'os';
import path from 'path';
import monitor from '..';

const sleep = (ms) => new Promise(resolve => {
  setTimeout(resolve, ms);
});

describe('monitor', () => {
  let root = '';

  beforeAll(async () => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'cncjs-monitor-'));
    fs.writeFileSync(path.join(root, 'a.gcode'), 'G0 X0\n');
    fs.writeFileSync(path.join(root, 'b.nc'), 'G0 X0\n');
    fs.mkdirSync(path.join(root, 'sub'));
    fs.writeFileSync(path.join(root, 'sub', 'c.gcode'), 'G0 X0\n');

    monitor.start({ watchDirectory: root });

    // `watch` picks up the root asynchronously and reports it through no event
    while (!monitor.isConfigured()) {
      await sleep(50);
    }
  });

  afterAll(() => {
    monitor.stop();
    fs.rmSync(root, { recursive: true, force: true });
  });

  describe('getFiles', () => {
    it('lists what sits directly under the watch directory', () => {
      const entries = monitor.getFiles('').sort((a, b) => a.name.localeCompare(b.name));

      expect(entries.map(entry => entry.name)).toEqual(['a.gcode', 'b.nc', 'sub']);
      expect(entries.map(entry => entry.type)).toEqual(['f', 'f', 'd']);
    });

    it('lists a subdirectory', () => {
      expect(monitor.getFiles('sub').map(entry => entry.name)).toEqual(['c.gcode']);
    });

    it('refuses to escape the watch directory', () => {
      expect(monitor.getFiles('..')).toEqual([]);
    });
  });
});
