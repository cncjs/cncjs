#!/usr/bin/env node

/**
 * Grbl Simulator TCP Server
 * A TCP socket server that simulates a Grbl CNC controller
 * Usage: node grbl-server.js [port]
 */

const net = require('net');
const GrblSimulator = require('./grbl-simulator');

const defaultPort = 3000;

class GrblServer {
    constructor(port = defaultPort) {
        this.port = port;
        this.server = null;
        this.clients = new Map();
        // IMPORTANT: Single shared simulator for all clients
        // This ensures position and state persist across connections
        this.simulator = new GrblSimulator();
    }

    start() {
        this.server = net.createServer((socket) => {
            this.handleConnection(socket);
        });

        this.server.listen(this.port, () => {
            console.log(`Listening on port ${this.port}...`);
        });

        this.server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.error(`Error: Port ${this.port} is already in use`);
                process.exit(1);
            } else {
                console.error('Server error:', err);
            }
        });

        // Handle graceful shutdown
        process.on('SIGINT', () => {
            console.log('\nShutting down server...');
            this.stop();
        });
    }

    handleConnection(socket) {
        const clientId = `${socket.remoteAddress}:${socket.remotePort}`;
        console.log(`[${new Date().toISOString()}] Client connected: ${clientId}`);

        // Use the shared simulator instance (not a new one per client!)
        // This ensures position and state persist across connections
        const simulator = this.simulator;

        // Store client info
        this.clients.set(socket, {
            id: clientId,
            simulator: simulator,
            buffer: ''
        });

        // Send startup message
        socket.write(simulator.getStartupMessage());

        // Handle incoming data
        socket.on('data', (data) => {
            this.handleData(socket, data);
        });

        // Handle client disconnect
        socket.on('close', () => {
            console.log(`[${new Date().toISOString()}] Client disconnected: ${clientId}`);
            this.clients.delete(socket);
        });

        // Handle errors
        socket.on('error', (err) => {
            console.error(`[${new Date().toISOString()}] Socket error for ${clientId}:`, err.message);
            this.clients.delete(socket);
        });
    }

    handleData(socket, data) {
        const client = this.clients.get(socket);
        if (!client) return;

        const { simulator } = client;
        const input = data.toString();

        // Process character by character for real-time commands
        for (let i = 0; i < input.length; i++) {
            const char = input[i];

            // Check for real-time commands (?, !, ~, Ctrl-X, 0x85)
            if (char === '?' || char === '!' || char === '~' || char === '\x18' || char.charCodeAt(0) === 0x85) {
                const response = simulator.processRealtimeCommand(char);
                if (response) {
                    socket.write(response);
                    console.log(`[${client.id}] RT: ${this.escapeChar(char)} -> ${this.escapeString(response)}`);
                }
                continue;
            }

            // Accumulate line-based commands
            if (char === '\n' || char === '\r') {
                if (client.buffer.length > 0) {
                    // Process complete line
                    const line = client.buffer.trim();
                    if (line) {
                        // Process line and wait for completion (simple send-response protocol)
                        simulator.processLineAsync(line, (response) => {
                            socket.write(response);
                            console.log(`[${client.id}] CMD: ${line} -> ${this.escapeString(response)}`);
                        });
                    }
                    client.buffer = '';
                }
            } else {
                client.buffer += char;
            }
        }
    }

    escapeChar(char) {
        const code = char.charCodeAt(0);
        if (code === 0x18) return 'Ctrl-X';
        if (code < 32) return `\\x${code.toString(16).padStart(2, '0')}`;
        return char;
    }

    escapeString(str) {
        return str
            .replace(/\r/g, '\\r')
            .replace(/\n/g, '\\n')
            .trim()
            .substring(0, 100); // Limit length for logging
    }

    stop() {
        if (this.server) {
            // Close all client connections
            for (const [socket, client] of this.clients.entries()) {
                console.log(`Closing connection to ${client.id}`);
                socket.end();
            }

            // Close server
            this.server.close(() => {
                console.log('Server stopped');
                process.exit(0);
            });

            // Force exit after 2 seconds
            setTimeout(() => {
                console.log('Forcing exit');
                process.exit(0);
            }, 2000);
        } else {
            process.exit(0);
        }
    }
}

// CLI entry point
if (require.main === module) {
    const port = parseInt(process.argv[2]) || defaultPort;

    console.log('');
    console.log('Grbl simulator - TCP server');
    console.log('');

    const server = new GrblServer(port);
    server.start();
}

module.exports = GrblServer;
