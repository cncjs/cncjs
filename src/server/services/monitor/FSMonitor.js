import watch from 'watch';

class FSMonitor {
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
            });
            monitor.on('changed', (f, curr, prev) => {
                this.files[f] = curr;
            });
            monitor.on('removed', (f, stat) => {
                delete this.files[f];
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
