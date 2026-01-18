#!/usr/bin/env node

/**
 * Integration Test Runner
 * Run all or specific test suites against the Grbl simulator
 *
 * Usage:
 *   node run-all.js              # Run all tests
 *   node run-all.js client       # Run only client tests
 *   node run-all.js motion jog   # Run motion and jog tests
 *   node run-all.js 8888         # Run all tests on port 8888
 */

const GrblTestClient = require('./GrblTestClient');
const runClientTests = require('./client-tests');
const runMotionTests = require('./motion-tests');
const runStreamingTests = require('./streaming-tests');
const runProbeTests = require('./probe-tests');
const runJogTests = require('./jog-tests');

const testSuites = {
    client: { name: 'Basic Client', fn: runClientTests },
    motion: { name: 'Motion Commands', fn: runMotionTests },
    streaming: { name: 'Streaming/Buffer', fn: runStreamingTests },
    probe: { name: 'Probe Commands', fn: runProbeTests },
    jog: { name: 'Jogging Commands', fn: runJogTests }
};

function printUsage() {
    console.log('Grbl Simulator Integration Test Runner\n');
    console.log('Usage: node run-all.js [port] [suite1] [suite2] ...\n');
    console.log('Available test suites:');
    Object.keys(testSuites).forEach(key => {
        console.log(`  ${key.padEnd(12)} - ${testSuites[key].name}`);
    });
    console.log('\nExamples:');
    console.log('  node run-all.js              # Run all tests on port 3000');
    console.log('  node run-all.js 8888         # Run all tests on port 8888');
    console.log('  node run-all.js client       # Run only client tests');
    console.log('  node run-all.js motion jog   # Run motion and jog tests');
}

async function runTests() {
    const args = process.argv.slice(2);

    // Check for help
    if (args.includes('--help') || args.includes('-h')) {
        printUsage();
        process.exit(0);
    }

    // Parse port (first numeric argument)
    let port = 3000;
    const portIndex = args.findIndex(arg => /^\d+$/.test(arg));
    if (portIndex !== -1) {
        port = parseInt(args[portIndex]);
        args.splice(portIndex, 1);
    }

    // Determine which suites to run
    let suitesToRun = args.filter(arg => testSuites[arg]);
    if (suitesToRun.length === 0) {
        suitesToRun = Object.keys(testSuites);
    }

    console.log('='.repeat(70));
    console.log('Grbl Simulator Integration Tests');
    console.log('='.repeat(70));
    console.log(`Port: ${port}`);
    console.log(`Suites: ${suitesToRun.join(', ')}`);
    console.log('='.repeat(70));
    console.log();

    const client = new GrblTestClient(port);

    try {
        await client.connect();
        await client.delay(500);

        for (const suiteName of suitesToRun) {
            const suite = testSuites[suiteName];
            console.log(`\n${'#'.repeat(70)}`);
            console.log(`# Running: ${suite.name}`);
            console.log(`${'#'.repeat(70)}\n`);

            await suite.fn(client);
            await client.delay(500);

            // Reset position between suites
            await client.send('G90 G21');
            await client.send('G0 X0 Y0 Z0');
            await client.delay(200);
        }

        console.log('\n' + '='.repeat(70));
        console.log('All Integration Tests Completed Successfully!');
        console.log('='.repeat(70));

        client.close();
        process.exit(0);

    } catch (err) {
        console.error('\nTest failed:', err.message);
        client.close();
        process.exit(1);
    }
}

if (require.main === module) {
    runTests();
}

module.exports = { testSuites, GrblTestClient };
