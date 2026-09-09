import { EventEmitter } from 'events';
import watch from 'watch';

class FSMonitor extends EventEmitter {
    root = '';

    monitor = null;

    files = {};

    watch(root) {
      watch.createMonitor(root, (monitor) => {
        this.unwatch();
        this.root = root;
        this.monitor = monitor;
        this.files = { ...monitor.files };

        monitor.on('created', (f, stat) => {
          this.files[f] = stat;
          this.emit('created', f);
        });
        monitor.on('changed', (f, curr, prev) => {
          this.files[f] = curr;
          this.emit('changed', f);
        });
        monitor.on('removed', (f, stat) => {
          delete this.files[f];
          this.emit('removed', f);
        });
      });
    }

    unwatch() {
      if (this.monitor) {
        this.monitor.stop(); // Stop watching
        this.monitor = null;
      }
      this.files = {};
    }
}

export default FSMonitor;
