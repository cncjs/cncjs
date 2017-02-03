import events from 'events';

// Workflow State
export const WORKFLOW_STATE_RUNNING = 'running';
export const WORKFLOW_STATE_PAUSED = 'paused';
export const WORKFLOW_STATE_IDLE = 'idle';

class Workflow extends events.EventEmitter {
    state = WORKFLOW_STATE_IDLE;

    start() {
        this.state = WORKFLOW_STATE_RUNNING;
        this.emit('start');
    }
    stop() {
        this.state = WORKFLOW_STATE_IDLE;
        this.emit('stop');
    }
    pause() {
        if (this.state === WORKFLOW_STATE_RUNNING) {
            this.state = WORKFLOW_STATE_PAUSED;
            this.emit('pause');
        }
    }
    resume() {
        if (this.workflowState === WORKFLOW_STATE_PAUSED) {
            this.workflowState = WORKFLOW_STATE_RUNNING;
            this.emit('resume');
        }
    }
}

export default Workflow;
