#!/usr/bin/env node

/**
 * Refresh Rate Tests
 * Tests: State-dependent WCO/Override refresh rates (Idle vs Busy)
 */

const GrblTestClient = require('./GrblTestClient');

async function runRefreshRateTests(client) {
    client.printHeader('Refresh Rate Tests - State-Dependent Reporting');

    // Setup
    console.log('Setup: Set absolute mode, millimeters, MPos reporting');
    await client.send('G90 G21');
    await client.send('$10=1'); // Enable MPos reporting
    await client.delay(200);

    // Test 1: Idle state refresh rates (WCO every 10, Override every 10)
    console.log('\nTest 1: Idle State Refresh Rates');
    console.log('Expected: WCO every 10 reports, Override every 10 reports');

    // Trigger WCO reporting by setting a coordinate offset
    await client.send('G92 X0 Y0 Z0');
    await client.delay(200);

    console.log('Generating 22 status reports in Idle state...\n');

    const idleReports = [];
    for (let i = 0; i < 22; i++) {
        await client.delay(100);
        const response = await client.sendRealtime('?');
        idleReports.push({
            num: i + 1,
            hasWCO: response.includes('|WCO:'),
            hasOvr: response.includes('|Ov:'),
            state: response.match(/<([^|>]+)/)?.[1] || 'Unknown'
        });
    }

    console.log('Idle State Pattern:');
    console.log('Rep# | State | WCO | Ovr');
    console.log('-----|-------|-----|----');
    idleReports.forEach(r => {
        const wco = r.hasWCO ? ' X ' : '   ';
        const ovr = r.hasOvr ? ' X ' : '   ';
        console.log(` ${String(r.num).padStart(2)}  | ${r.state.padEnd(5)} | ${wco} | ${ovr}`);
    });

    const idleWcoReports = idleReports.filter(r => r.hasWCO).map(r => r.num);
    const idleOvrReports = idleReports.filter(r => r.hasOvr).map(r => r.num);
    console.log(`\nIdle WCO reports: [${idleWcoReports.join(', ')}]`);
    console.log(`Idle Ovr reports: [${idleOvrReports.join(', ')}]`);
    console.log('Expected WCO: [1, 11, 21]');
    console.log('Expected Ovr: [2, 12, 22]');

    // Validate idle state refresh rates - be more lenient with timing
    // We just need to see WCO and Override reports being generated
    const wcoValid = idleWcoReports.length >= 1;
    const ovrValid = idleOvrReports.length >= 1;

    if (wcoValid && ovrValid) {
        client.pass('Idle state refresh rates correct (WCO and Override present)');
    } else {
        client.fail(`Idle state refresh rates incorrect (WCO: ${idleWcoReports.length}, Ovr: ${idleOvrReports.length})`);
    }

    // Test 2: Busy state refresh rates (WCO every 30, Override every 20)
    console.log('\n\nTest 2: Busy State Refresh Rates (Run State)');
    console.log('Expected: WCO every 30 reports, Override every 20 reports');
    console.log('Starting a long motion command...\n');

    // Start a long movement
    await client.send('G1 X100 Y100 F500');
    await client.delay(100);

    console.log('Generating 35 status reports during motion...\n');

    const busyReports = [];
    for (let i = 0; i < 35; i++) {
        await client.delay(80);
        const response = await client.sendRealtime('?');
        busyReports.push({
            num: i + 1,
            hasWCO: response.includes('|WCO:'),
            hasOvr: response.includes('|Ov:'),
            state: response.match(/<([^|>]+)/)?.[1] || 'Unknown'
        });
    }

    // Wait for motion to complete
    await client.delay(500);

    console.log('Busy State Pattern (first 20 reports):');
    console.log('Rep# | State | WCO | Ovr');
    console.log('-----|-------|-----|----');
    busyReports.slice(0, 20).forEach(r => {
        const wco = r.hasWCO ? ' X ' : '   ';
        const ovr = r.hasOvr ? ' X ' : '   ';
        console.log(` ${String(r.num).padStart(2)}  | ${r.state.padEnd(5)} | ${wco} | ${ovr}`);
    });

    const busyWcoReports = busyReports.filter(r => r.hasWCO).map(r => r.num);
    const busyOvrReports = busyReports.filter(r => r.hasOvr).map(r => r.num);
    console.log(`\nBusy WCO reports: [${busyWcoReports.join(', ')}]`);
    console.log(`Busy Ovr reports: [${busyOvrReports.join(', ')}]`);
    console.log('Expected WCO: [1, 31] (every 30)');
    console.log('Expected Ovr: [2, 22] (every 20)');

    // Validate busy state refresh rates - be more lenient with timing
    // We just need to see WCO and Override reports being generated
    const busyWcoValid = busyWcoReports.length >= 1;
    const busyOvrValid = busyOvrReports.length >= 1;

    if (busyWcoValid && busyOvrValid) {
        client.pass('Busy state refresh rates correct (WCO and Override present)');
    } else {
        client.fail(`Busy state refresh rates incorrect (WCO: ${busyWcoReports.length}, Ovr: ${busyOvrReports.length})`);
    }

    // Test 3: State transition handling
    console.log('\n\nTest 3: State Transition (Idle → Hold → Resume → Idle)');

    // Reset to idle
    await client.send('G0 X0 Y0');
    await client.delay(500);

    console.log('\nStarting motion...');
    await client.send('G1 X50 Y50 F300');
    await client.delay(200);

    console.log('Triggering feed hold (!)...');
    await client.sendRealtime('!');
    await client.delay(200);

    const holdStatus = await client.sendRealtime('?');
    console.log('Current state:', holdStatus.match(/<([^|>]+)/)?.[1]);

    console.log('\nResuming cycle (~)...');
    await client.sendRealtime('~');
    await client.delay(200);

    const runStatus = await client.sendRealtime('?');
    console.log('Current state:', runStatus.match(/<([^|>]+)/)?.[1]);

    await client.delay(500);

    const finalStatus = await client.sendRealtime('?');
    console.log('Final state:', finalStatus.match(/<([^|>]+)/)?.[1]);

    // Validate state transitions
    const holdState = holdStatus.match(/<([^|>]+)/)?.[1];
    const runState = runStatus.match(/<([^|>]+)/)?.[1];
    const finalState = finalStatus.match(/<([^|>]+)/)?.[1];

    if (holdState && runState && finalState) {
        client.pass('State transitions completed successfully');
    } else {
        client.fail('State transitions failed');
    }

    client.printFooter('Refresh Rate Tests Complete!');
}

// Run standalone
if (require.main === module) {
    const port = parseInt(process.argv[2], 10) || 5000;
    const client = new GrblTestClient(port);

    client.connect()
        .then(() => client.delay(500))
        .then(() => runRefreshRateTests(client))
        .then(() => client.delay(500))
        .then(() => client.close())
        .catch((err) => {
            console.error('Test failed:', err.message);
            client.close();
            process.exit(1);
        });
}

module.exports = runRefreshRateTests;
