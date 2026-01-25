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

const chalk = require('chalk');
const GrblTestClient = require('./GrblTestClient');
const runClientTests = require('./client-tests');
const runMotionTests = require('./motion-tests');
const runStreamingTests = require('./streaming-tests');
const runProbeTests = require('./probe-tests');
const runJogTests = require('./jog-tests');
const runWcoOverrideTests = require('./wco-override-tests');
const runCoordinateSystemTests = require('./coordinate-system-tests');
const runRefreshRateTests = require('./refresh-rate-tests');
const runCoolantTests = require('./coolant-tests');
const runSettingsTests = require('./settings-tests');

const testSuites = {
    client: { name: 'Basic Client', fn: runClientTests },
    motion: { name: 'Motion Commands', fn: runMotionTests },
    streaming: { name: 'Streaming/Buffer', fn: runStreamingTests },
    probe: { name: 'Probe Commands', fn: runProbeTests },
    jog: { name: 'Jogging Commands', fn: runJogTests },
    wco: { name: 'WCO/Override Reporting', fn: runWcoOverrideTests },
    coordinate: { name: 'Coordinate Systems', fn: runCoordinateSystemTests },
    refresh: { name: 'Refresh Rates', fn: runRefreshRateTests },
    coolant: { name: 'Coolant State', fn: runCoolantTests },
    settings: { name: 'Settings Management', fn: runSettingsTests }
};

function printUsage() {
    console.log('Grbl Simulator Integration Test Runner\n');
    console.log('Usage: node run-all.js [port] [suite1] [suite2] ...\n');
    console.log('Available test suites:');
    Object.keys(testSuites).forEach(key => {
        console.log(`  ${key.padEnd(12)} - ${testSuites[key].name}`);
    });
    console.log('\nExamples:');
    console.log('  node run-all.js              # Run all tests on port 5000');
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
    let port = 5000;
    const portIndex = args.findIndex(arg => /^\d+$/.test(arg));
    if (portIndex !== -1) {
        port = parseInt(args[portIndex], 10);
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
    const overallResults = {
        suites: [],
        totalPassed: 0,
        totalFailed: 0,
        allFailedTests: []
    };

    try {
        await client.connect();
        await client.delay(500);

        for (const suiteName of suitesToRun) {
            const suite = testSuites[suiteName];
            console.log(`\n${'#'.repeat(70)}`);
            console.log(`# Running: ${suite.name}`);
            console.log(`${'#'.repeat(70)}\n`);

            client.resetResults();
            await suite.fn(client);

            const results = client.getResults();
            client.printSummary(suite.name);

            overallResults.suites.push({
                name: suite.name,
                passed: results.passed,
                failed: results.failed,
                failedTests: results.failedTests
            });
            overallResults.totalPassed += results.passed;
            overallResults.totalFailed += results.failed;
            overallResults.allFailedTests.push(...results.failedTests.map(test => `[${suite.name}] ${test}`));

            await client.delay(500);

            // Reset position between suites
            await client.send('G90 G21');
            await client.send('G0 X0 Y0 Z0');
            await client.delay(200);
        }

        // Print overall summary
        console.log('\n' + '='.repeat(70));
        console.log(chalk.bold.cyan('OVERALL TEST SUMMARY'));
        console.log('='.repeat(70));

        const totalTests = overallResults.totalPassed + overallResults.totalFailed;
        const passRate = totalTests > 0 ? ((overallResults.totalPassed / totalTests) * 100).toFixed(1) : 0;

        console.log(chalk.green(`Total Passed: ${overallResults.totalPassed}/${totalTests} (${passRate}%)`));
        console.log(chalk.red(`Total Failed: ${overallResults.totalFailed}/${totalTests}`));

        if (overallResults.totalFailed > 0) {
            console.log('\n' + chalk.red.bold('All Failed Tests:'));
            overallResults.allFailedTests.forEach((test, index) => {
                console.log(chalk.red(`  ${index + 1}. ${test}`));
            });
        }

        console.log('\n' + chalk.bold('Suite Breakdown:'));
        overallResults.suites.forEach(suite => {
            const suiteTotal = suite.passed + suite.failed;
            const suitePassRate = suiteTotal > 0 ? ((suite.passed / suiteTotal) * 100).toFixed(1) : 0;
            const status = suite.failed === 0 ? chalk.green('✓') : chalk.red('✗');
            console.log(`  ${status} ${suite.name}: ${chalk.green(suite.passed)}/${suiteTotal} passed (${suitePassRate}%)`);
        });

        console.log('='.repeat(70));

        client.close();
        process.exit(overallResults.totalFailed > 0 ? 1 : 0);
    } catch (err) {
        console.error('\n' + chalk.red.bold('Test failed:'), err.message);
        client.close();
        process.exit(1);
    }
}

if (require.main === module) {
    runTests();
}

module.exports = { testSuites, GrblTestClient };
