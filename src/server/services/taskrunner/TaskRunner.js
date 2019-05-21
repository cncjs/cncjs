import events from 'events';
import defaultShell from 'spawn-default-shell';
import without from 'lodash/without';
import shortid from 'shortid';
import logger from '../../lib/logger';

const log = logger('service:taskrunner');

class TaskRunner extends events.EventEmitter {
    tasks = [];

    run(command, title, options) {
        if (options === undefined && typeof title === 'object') {
            options = title;
            title = '';
        }

        const taskId = shortid.generate(); // task id
        const child = defaultShell.spawn(command, {
            detached: true,
            ...options
        });
        child.unref();

        this.tasks.push(taskId);
        this.emit('start', taskId);

        child.stdout.on('data', (data) => {
            process.stdout.write(`PID:${child.pid}> ${data}`);
        });
        child.stderr.on('data', (data) => {
            process.stderr.write(`PID:${child.pid}> ${data}`);
        });
        child.on('error', (err) => {
            // Listen for error event can prevent from throwing an unhandled exception
            log.error(`Failed to start a child process: err=${JSON.stringify(err)}`);

            this.tasks = without(this.tasks, taskId);
            this.emit('error', taskId, err);
        });
        // The 'exit' event is emitted after the child process ends.
        // Note that the 'exit' event may or may not fire after an error has occurred.
        // It is important to guard against accidentally invoking handler functions multiple times.
        child.on('exit', (code) => {
            if (this.contains(taskId)) {
                this.tasks = without(this.tasks, taskId);
                this.emit('finish', taskId, code);
            }
        });

        return taskId;
    }

    contains(taskId) {
        return this.tasks.indexOf(taskId) >= 0;
    }
}

export default TaskRunner;
