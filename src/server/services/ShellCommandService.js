import { EventEmitter } from 'events';
import _without from 'lodash/without';
import defaultShell from 'spawn-default-shell';
import shortid from 'shortid';
import logger from '../lib/logger';

const log = logger('shell-command-service');

class ShellCommandService {
    tasks = [];

    emitter = new EventEmitter({ captureRejections: true });

    on(eventName, listener) {
      this.emitter.on(eventName, listener);
    }

    off(eventName, listener) {
      this.emitter.off(eventName, listener);
    }

    spawn(command, options) {
      const taskId = shortid.generate(); // task id
      const child = defaultShell.spawn(command, {
        detached: true,
        ...options
      });
      child.unref();

      this.tasks.push(taskId);
      this.emitter.emit('start', taskId);

      child.stdout.on('data', (data) => {
        process.stdout.write(`PID:${child.pid}> ${data}`);
      });
      child.stderr.on('data', (data) => {
        process.stderr.write(`PID:${child.pid}> ${data}`);
      });
      child.on('error', (err) => {
        // Listen for error event can prevent from throwing an unhandled exception
        log.error(`Failed to start a child process: err=${JSON.stringify(err)}`);

        this.tasks = _without(this.tasks, taskId);
        this.emitter.emit('error', taskId, err);
      });
      // The 'exit' event is emitted after the child process ends.
      // Note that the 'exit' event may or may not fire after an error has occurred.
      // It is important to guard against accidentally invoking handler functions multiple times.
      child.on('exit', (code) => {
        if (this.tasks.indexOf(taskId) >= 0) {
          this.tasks = _without(this.tasks, taskId);
          this.emitter.emit('finish', taskId, code);
        }
      });

      return taskId;
    }
}

export default ShellCommandService;
