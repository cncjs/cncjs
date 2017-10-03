import events from 'events';

// Workflow State
export const WORKFLOW_STATE_RUNNING = 'running';
export const WORKFLOW_STATE_PAUSED = 'paused';
export const WORKFLOW_STATE_IDLE = 'idle';

class Workflow extends events.EventEmitter {
    state = WORKFLOW_STATE_IDLE;
    context = {};

    isRunning() {
        return this.state === WORKFLOW_STATE_RUNNING;
    }
    isPaused() {
        return this.state === WORKFLOW_STATE_PAUSED;
    }
    isIdle() {
        return this.state === WORKFLOW_STATE_IDLE;
    }
    start(context) {
        if (this.state !== WORKFLOW_STATE_RUNNING) {
            this.state = WORKFLOW_STATE_RUNNING;
            this.context = { ...context };
            this.emit('start', this.context);
        }
    }
    stop(context) {
        if (this.state !== WORKFLOW_STATE_IDLE) {
            this.state = WORKFLOW_STATE_IDLE;
            this.context = { ...context };
            this.emit('stop', this.context);
        }
    }
    pause(context) {
        if (this.state === WORKFLOW_STATE_RUNNING) {
            this.state = WORKFLOW_STATE_PAUSED;
            this.context = { ...context };
            this.emit('pause', this.context);
        }
    }
    resume(context) {
        if (this.state === WORKFLOW_STATE_PAUSED) {
            this.state = WORKFLOW_STATE_RUNNING;
            this.context = { ...context };
            this.emit('resume', this.context);
        }
    }
}

export default Workflow;
