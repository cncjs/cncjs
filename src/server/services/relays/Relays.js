import clientIO from 'socket.io-client';
import settings from '../../config/settings';
import logger from '../../lib/logger';

const log = logger('service:relays');

class Relay {
    io = null;

    currentState = null;

    init(controller) {
        if (!this.io || !this.io.connected) {
            this.io = clientIO(settings.backend.relayWS);
            log.debug('Connecting to relay service: ' + settings.backend.relayWS);
            this.io.emit('status');

            this.io.on('connect', () => {
                log.debug('Connected to relay service');
            });

            this.io.on('connect_error', (error) => {
                log.error(error);
            });

            this.io.on('relay:response', (data) => {
                this.currentState = data;
                controller.emit('relay:response', data);
            });

            this.io.on('relay:status', (data) => {
                this.currentState = data;
                controller.emit('relay:status', data);
            });
        }
        this.emit('status');
    }

    emit(eventName, options) {
        this.io.emit(eventName, options);
    }

    get status() {
        return this.currentState;
    }

    stop() {
        if (this.io) {
            this.io.close();
            this.io = null;
        }
    }

    toJson() {
        return {
            relays: this.currentState
        };
    }
}

export default Relay;
