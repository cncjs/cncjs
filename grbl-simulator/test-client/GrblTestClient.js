#!/usr/bin/env node

/**
 * Grbl Test Client - Base class for integration tests
 * Provides TCP connection and helper methods for all test suites
 */

const net = require('net');

class GrblTestClient {
    constructor(port = 5000, host = 'localhost') {
        this.port = port;
        this.host = host;
        this.client = null;
        this.connected = false;
        this.buffer = '';
    }

    connect() {
        return new Promise((resolve, reject) => {
            console.log(`Connecting to Grbl simulator at ${this.host}:${this.port}...`);

            this.client = net.createConnection({ port: this.port, host: this.host }, () => {
                console.log('Connected!\n');
                this.connected = true;
                resolve();
            });

            this.client.on('data', (data) => {
                const response = data.toString();
                this.buffer += response;
                process.stdout.write(response);
            });

            this.client.on('close', () => {
                console.log('\nConnection closed');
                this.connected = false;
            });

            this.client.on('error', (err) => {
                console.error('Connection error:', err.message);
                reject(err);
            });
        });
    }

    send(command) {
        return new Promise((resolve) => {
            if (!this.connected) {
                console.error('Not connected');
                resolve('');
                return;
            }

            this.buffer = '';
            console.log(`> ${command}`);
            this.client.write(command + '\n');
            setTimeout(() => resolve(this.buffer), 150);
        });
    }

    sendRealtime(char) {
        return new Promise((resolve) => {
            if (!this.connected) {
                console.error('Not connected');
                resolve('');
                return;
            }

            this.buffer = '';
            console.log(`> ${char} (realtime)`);
            this.client.write(char);
            setTimeout(() => resolve(this.buffer), 100);
        });
    }

    sendRaw(data) {
        if (this.connected) {
            this.client.write(data);
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    close() {
        if (this.client) {
            this.client.end();
        }
    }

    printHeader(title) {
        console.log('='.repeat(70));
        console.log(title);
        console.log('='.repeat(70));
        console.log();
    }

    printFooter(title) {
        console.log('\n' + '='.repeat(70));
        console.log(title);
        console.log('='.repeat(70));
    }
}

module.exports = GrblTestClient;
