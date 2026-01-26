#!/usr/bin/env node

/**
 * Serial Port Bridge for Grbl Simulator
 * Creates a virtual serial port and bridges it to the TCP socket
 * This allows cncjs and other serial-based software to connect to the simulator
 */

const net = require('net');
const { spawn } = require('child_process');

class SerialBridge {
    constructor(tcpPort = 8888, serialPath = '/tmp/ttyGRBL') {
        this.tcpPort = tcpPort;
        this.serialPath = serialPath;
        this.socatProcess = null;
        this.bridgeActive = false;
    }

    async start() {
        console.log('Grbl Simulator - Serial Bridge');

        // Check if socat is installed
        try {
            await this.checkSocat();
        } catch (err) {
            console.error('Error: socat is not installed');
            console.error('Install with: sudo apt-get install socat');
            process.exit(1);
        }

        // Create virtual serial port with socat
        console.log(`Creating virtual serial device at "${this.serialPath}"`);
        console.log(`Bridging to TCP port ${this.tcpPort}`);

        this.socatProcess = spawn('socat', [
            `-d`, `-d`,
            `pty,raw,echo=0,link=${this.serialPath}`,
            `tcp:localhost:${this.tcpPort}`
        ], {
            stdio: ['ignore', 'pipe', 'pipe']
        });

        this.socatProcess.stdout.on('data', (data) => {
            const msg = data.toString();
            if (msg.includes('starting data transfer')) {
                this.bridgeActive = true;
                console.log(`Connected virtual serial path "${this.serialPath}" to localhost:${this.tcpPort}`);
            }
        });

        this.socatProcess.stderr.on('data', (data) => {
            const msg = data.toString();
            // socat sends logs to stderr
            if (process.env.DEBUG) {
                console.log('[socat]', msg.trim());
            }
        });

        this.socatProcess.on('error', (err) => {
            console.error('socat error:', err.message);
            process.exit(1);
        });

        this.socatProcess.on('exit', (code) => {
            if (code !== 0 && code !== null) {
                console.error(`socat exited with code ${code}`);
            }
            process.exit(code || 0);
        });

        // Handle graceful shutdown
        process.on('SIGINT', () => {
            console.log('\n\nShutting down serial bridge...');
            this.stop();
        });

        process.on('SIGTERM', () => {
            this.stop();
        });
    }

    checkSocat() {
        return new Promise((resolve, reject) => {
            const proc = spawn('which', ['socat']);
            proc.on('exit', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error('socat not found'));
                }
            });
        });
    }

    stop() {
        if (this.socatProcess) {
            this.socatProcess.kill();
        }
        process.exit(0);
    }
}

if (require.main === module) {
    const tcpPort = parseInt(process.argv[2]) || 8888;
    const serialPath = process.argv[3] || '/tmp/ttyGRBL';

    const bridge = new SerialBridge(tcpPort, serialPath);
    bridge.start().catch((err) => {
        console.error('Failed to start bridge:', err.message);
        process.exit(1);
    });
}

module.exports = SerialBridge;
