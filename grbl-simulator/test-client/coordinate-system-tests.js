#!/usr/bin/env node

/**
 * Coordinate System Tests
 * Tests: Immediate WCO reporting after G92, G54-G59, G10 L2 commands
 */

const GrblTestClient = require('./GrblTestClient');

async function runCoordinateSystemTests(client) {
    client.printHeader('Coordinate System Tests - Immediate WCO Reporting');

    // Setup
    console.log('Setup: Reset offsets and set absolute mode');
    await client.send('G21 G90');
    await client.send('G10 L2 P1 X0 Y0 Z0'); // Clear G54
    await client.send('G92 X0 Y0 Z0'); // Clear G92
    await client.send('$10=1'); // Enable MPos reporting
    await client.delay(200);

    // Test 1: G92 triggers immediate WCO report
    console.log('\nTest 1: G92 Command Triggers Immediate WCO Report');
    console.log('Moving to X10 Y20 Z5...');
    await client.send('G0 X10 Y20 Z5');
    await client.delay(100);

    console.log('Setting G92 offset X5 Y10 Z2...');
    const g92Response = await client.send('G92 X5 Y10 Z2');
    console.log('Expected: Next status report should contain |WCO: immediately\n');

    await client.delay(100);
    const afterG92 = await client.sendRealtime('?');
    if (afterG92.includes('|WCO:')) {
        client.pass('WCO reported immediately after G92');
    } else {
        client.fail('WCO not reported after G92');
    }

    // Test 2: G10 L2 triggers immediate WCO report
    console.log('\nTest 2: G10 L2 Command Triggers Immediate WCO Report');
    console.log('Clearing G92 offset...');
    await client.send('G92.1');
    await client.delay(100);

    console.log('Setting G54 offset X10 Y20 Z5...');
    const g10Response = await client.send('G10 L2 P1 X10 Y20 Z5');
    await client.delay(100);

    const afterG10 = await client.sendRealtime('?');
    if (afterG10.includes('|WCO:')) {
        client.pass('WCO reported immediately after G10 L2');
    } else {
        client.fail('WCO not reported after G10 L2');
    }

    // Test 3: Switching coordinate systems (G54-G59)
    console.log('\nTest 3: Switching Between Coordinate Systems');
    console.log('Setting up different offsets for G54, G55, G56...');
    await client.send('G10 L2 P1 X0 Y0 Z0');   // G54
    await client.send('G10 L2 P2 X10 Y10 Z10'); // G55
    await client.send('G10 L2 P3 X20 Y20 Z20'); // G56
    await client.delay(200);

    console.log('\nSwitching to G55...');
    await client.send('G55');
    await client.delay(100);
    const afterG55 = await client.sendRealtime('?');

    console.log('\nSwitching to G56...');
    await client.send('G56');
    await client.delay(100);
    const afterG56 = await client.sendRealtime('?');

    console.log('\nSwitching back to G54...');
    await client.send('G54');
    await client.delay(100);
    const afterG54 = await client.sendRealtime('?');

    if (afterG55.includes('|WCO:') && afterG56.includes('|WCO:') && afterG54.includes('|WCO:')) {
        client.pass('WCO reported immediately after each coordinate system switch');
    } else {
        client.fail('WCO not reported after all coordinate system switches');
    }

    // Test 4: G92.1 (clear G92) triggers immediate WCO report
    console.log('\nTest 4: G92.1 Command Triggers Immediate WCO Report');
    await client.send('G92 X5 Y5 Z5');
    await client.delay(100);

    console.log('Clearing G92 offset with G92.1...');
    await client.send('G92.1');
    await client.delay(100);

    const afterG92Clear = await client.sendRealtime('?');
    if (afterG92Clear.includes('|WCO:')) {
        client.pass('WCO reported immediately after G92.1');
    } else {
        client.fail('WCO not reported after G92.1');
    }

    // Test 5: View all coordinate systems
    console.log('\nTest 5: View Coordinate System Parameters');
    await client.send('$#');

    client.printFooter('Coordinate System Tests Complete!');
}

// Run standalone
if (require.main === module) {
    const port = parseInt(process.argv[2], 10) || 5000;
    const client = new GrblTestClient(port);

    client.connect()
        .then(() => client.delay(500))
        .then(() => runCoordinateSystemTests(client))
        .then(() => client.delay(500))
        .then(() => client.close())
        .catch((err) => {
            console.error('Test failed:', err.message);
            client.close();
            process.exit(1);
        });
}

module.exports = runCoordinateSystemTests;
