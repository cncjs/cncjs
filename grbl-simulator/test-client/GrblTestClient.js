#!/usr/bin/env node

/**
 * Grbl Test Client - Base class for integration tests
 * Provides TCP connection and helper methods for all test suites
 */

const net = require('net');
const chalk = require('chalk');

class GrblTestClient {
    constructor(port = 5000, host = 'localhost') {
        this.port = port;
        this.host = host;
        this.client = null;
        this.connected = false;
        this.buffer = '';
        this.testResults = {
            passed: [],
            failed: []
        };
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

    // Wait for machine to reach Idle state
    async waitForIdle(maxWait = 10000, pollInterval = 100) {
        const startTime = Date.now();
        while (Date.now() - startTime < maxWait) {
            const status = await this.sendRealtime('?');
            if (status.includes('<Idle')) {
                return status;
            }
            await this.delay(pollInterval);
        }
        return await this.sendRealtime('?'); // Return final status even if not idle
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

    // Track test results
    pass(testName) {
        this.testResults.passed.push(testName);
        console.log(chalk.green('✓ PASS:'), testName);
    }

    fail(testName) {
        this.testResults.failed.push(testName);
        console.log(chalk.red('✗ FAIL:'), testName);
    }

    notice(message) {
        console.log(chalk.yellow('⚠ NOTICE:'), message);
    }

    // Print test summary
    printSummary(suiteName) {
        const total = this.testResults.passed.length + this.testResults.failed.length;
        const passRate = total > 0 ? ((this.testResults.passed.length / total) * 100).toFixed(1) : 0;

        console.log('\n' + '='.repeat(70));
        console.log(`${suiteName} - Test Summary`);
        console.log('='.repeat(70));
        console.log(chalk.green(`Passed: ${this.testResults.passed.length}/${total} (${passRate}%)`));

        if (this.testResults.failed.length > 0) {
            console.log(chalk.red(`Failed: ${this.testResults.failed.length}/${total}`));
            console.log('\n' + chalk.red.bold('Failed Tests:'));
            this.testResults.failed.forEach((test, index) => {
                console.log(chalk.red(`  ${index + 1}. ${test}`));
            });
        }
        console.log('='.repeat(70));
    }

    // Reset results for next suite
    resetResults() {
        this.testResults.passed = [];
        this.testResults.failed = [];
    }

    // Get results for overall summary
    getResults() {
        return {
            passed: this.testResults.passed.length,
            failed: this.testResults.failed.length,
            failedTests: [...this.testResults.failed]
        };
    }
}

module.exports = GrblTestClient;
