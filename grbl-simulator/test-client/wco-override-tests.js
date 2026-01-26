#!/usr/bin/env node

/**
 * WCO and Override Reporting Pattern Tests
 * Tests: Counter-based reporting, alternating pattern, state-dependent refresh rates
 */

const GrblTestClient = require('./GrblTestClient');

async function runWcoOverrideTests(client) {
    client.printHeader('WCO and Override Reporting Pattern Tests');

    // Setup
    console.log('Setup: Set absolute mode, millimeters, MPos reporting');
    await client.send('G90 G21');
    await client.send('$10=1'); // Enable MPos reporting
    await client.delay(200);

    // Test 1: Verify alternating pattern in Idle state
    console.log('\nTest 1: WCO/Override Alternating Pattern (Idle State)');
    console.log('Expected: WCO every 10 reports, Override every 10 reports (alternating)');
    console.log('Generating 25 status reports...\n');

    const reports = [];
    for (let i = 0; i < 25; i++) {
        await client.delay(80);
        const response = await client.sendRealtime('?');
        reports.push({
            num: i + 1,
            hasWCO: response.includes('|WCO:'),
            hasOvr: response.includes('|Ov:')
        });
    }

    console.log('\nReport Pattern:');
    console.log('Rep# | WCO | Ovr');
    console.log('-----|-----|----');
    reports.forEach(r => {
        const wco = r.hasWCO ? ' X ' : '   ';
        const ovr = r.hasOvr ? ' X ' : '   ';
        console.log(` ${String(r.num).padStart(2)}  | ${wco} | ${ovr}`);
    });

    console.log('\nExpected pattern:');
    console.log('  WCO on: #1, #11, #21');
    console.log('  Ovr on: #2, #12, #22');

    const wcoReports = reports.filter(r => r.hasWCO).map(r => r.num);
    const ovrReports = reports.filter(r => r.hasOvr).map(r => r.num);
    console.log(`\nActual WCO reports: [${wcoReports.join(', ')}]`);
    console.log(`Actual Ovr reports: [${ovrReports.join(', ')}]`);

    // Test 2: Verify no simultaneous WCO and Override
    console.log('\nTest 2: Verify WCO and Override Never Appear Together');
    const simultaneous = reports.filter(r => r.hasWCO && r.hasOvr);
    if (simultaneous.length === 0) {
        client.pass('WCO and Override never reported together');
    } else {
        console.log('✗ FAIL: Found simultaneous reports at:', simultaneous.map(r => r.num));
    }

    client.printFooter('WCO/Override Tests Complete!');
}

// Run standalone
if (require.main === module) {
    const port = parseInt(process.argv[2], 10) || 5000;
    const client = new GrblTestClient(port);

    client.connect()
        .then(() => client.delay(500))
        .then(() => runWcoOverrideTests(client))
        .then(() => client.delay(500))
        .then(() => client.close())
        .catch((err) => {
            console.error('Test failed:', err.message);
            client.close();
            process.exit(1);
        });
}

module.exports = runWcoOverrideTests;
