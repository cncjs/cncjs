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

  // `command` <string>: The command to be executed.
  // `context` <object>: The relevant information related to the command.
  // `options` <object>: For available options, refer to the [child_process documentation](https://nodejs.org/api/child_process.html#child_process_child_process_spawn_command_args_options).
  spawn(command, context, options) {
    const taskId = shortid.generate(); // task id
    const child = defaultShell.spawn(command, {
      detached: true,
      ...options,
    });
    child.unref();

    this.tasks.push(taskId);
    this.emitter.emit('start', taskId, context);

    child.stdout.on('data', (data) => {
      // Sending the `\x1b%G` escape sequence to the terminal directs it to change from ISO 2022 encoding to UTF-8.
      const utf8SwitchEscapeSequence = Buffer.from('\x1b%G');
      if (Buffer.compare(data, utf8SwitchEscapeSequence) === 0) {
        return;
      }

      process.stdout.write(`[PID:${child.pid}][stdout] ${data}`);
      this.emitter.emit('data', taskId, data);
    });
    child.stderr.on('data', (data) => {
      process.stderr.write(`[PID:${child.pid}][stderr] ${data}`);
      this.emitter.emit('data', taskId, data);
    });
    // The 'exit' event is emitted after the child process ends.
    // Note that the 'exit' event may or may not fire after an error has occurred.
    // It is important to guard against accidentally invoking handler functions multiple times.
    child.on('exit', (code) => {
      if (this.tasks.indexOf(taskId) >= 0) {
        this.tasks = _without(this.tasks, taskId);
        this.emitter.emit('end', taskId, code);
      }
    });
    child.on('error', (err) => {
      // Listen for error event can prevent from throwing an unhandled exception
      log.error(`Failed to start a child process: err=${JSON.stringify(err)}`);

      this.tasks = _without(this.tasks, taskId);
      this.emitter.emit('error', taskId, err);
    });

    return taskId;
  }
}

export default ShellCommandService;
