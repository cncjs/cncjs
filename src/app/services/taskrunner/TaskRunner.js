import childProcess from 'child_process';
import events from 'events';
import without from 'lodash/without';
import shortid from 'shortid';
import log from '../../lib/log';

const PREFIX = '[taskrunner]';

class TaskRunner extends events.EventEmitter {
    tasks = [];

    run(command, args = [], options = {}) {
        const id = shortid.generate(); // task id
        const child = childProcess.spawn(command, args, {
            detached: true,
            ...options
        });
        child.unref();

        this.tasks.push(id);
        this.emit('run', id);

        child.stdout.on('data', (data) => {
            process.stdout.write(`PID:${child.pid}> ${data}`);
        });
        child.stderr.on('data', (data) => {
            process.stderr.write(`PID:${child.pid}> ${data}`);
        });
        child.on('error', (err) => {
            // Listen for error event can prevent from throwing an unhandled exception
            log.error(`${PREFIX} Failed to start child process: err=${JSON.stringify(err)}`);
            this.emit('error', id, err);
        });
        child.on('close', (code) => {
            this.tasks = without(this.tasks, id);
        });
        child.on('exit', (code) => {
            this.tasks = without(this.tasks, id);
            this.emit('complete', id, code);
        });

        return id;
    }
    contains(id) {
        return this.tasks.indexOf(id) >= 0;
    }
}

export default TaskRunner;
