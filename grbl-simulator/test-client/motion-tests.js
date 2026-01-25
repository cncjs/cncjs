#!/usr/bin/env node

/**
 * Motion Command Tests
 * Tests: G0/G1 linear moves, G90/G91 modes, WCS offsets, units
 */

const GrblTestClient = require('./GrblTestClient');

async function runMotionTests(client) {
    client.printHeader('Motion Command Tests - Position Tracking');

    // Test 1: Initial status
    console.log('Test 1: Initial Position');
    const initialStatus = await client.sendRealtime('?');
    if (initialStatus.includes('MPos:0.000,0.000,0.000')) {
        client.pass('Initial position at origin');
    } else {
        client.fail('Unexpected initial position');
    }

    // Test 2: Absolute positioning (G90 is default)
    console.log('\nTest 2: G0 Rapid Move - Absolute Mode (G90)');
    await client.send('G0 X10 Y20 Z5');
    const g0Status = await client.waitForIdle();
    console.log('Expected: MPos:10.000,20.000,5.000');

    if (g0Status.includes('MPos:10.000,20.000,5.000')) {
        client.pass('G0 absolute move to correct position');
    } else {
        client.fail('Position mismatch after G0');
    }

    // Test 3: G1 Linear move
    console.log('\nTest 3: G1 Linear Move with Feed Rate');
    await client.send('G1 X15 Y25 Z10 F500');
    const g1Status = await client.waitForIdle();
    console.log('Expected: MPos:15.000,25.000,10.000, FS:500.0');

    if (g1Status.includes('MPos:15.000,25.000,10.000') && g1Status.includes('FS:500')) {
        client.pass('G1 linear move with correct feed rate');
    } else {
        client.fail('Position or feed rate mismatch');
    }

    // Test 4: Switch to incremental mode
    console.log('\nTest 4: Incremental Mode (G91)');
    await client.send('G91');
    await client.send('G0 X5 Y-5 Z2');
    const g91Status = await client.waitForIdle();
    console.log('Expected: MPos:20.000,20.000,12.000 (15+5, 25-5, 10+2)');

    if (g91Status.includes('MPos:20.000,20.000,12.000')) {
        client.pass('G91 incremental mode working correctly');
    } else {
        client.fail('Incremental position mismatch');
    }

    // Test 5: Back to absolute mode
    console.log('\nTest 5: Back to Absolute Mode (G90)');
    await client.send('G90');
    await client.send('G0 X0 Y0 Z0');
    const g90Status = await client.waitForIdle();
    console.log('Expected: MPos:0.000,0.000,0.000');

    if (g90Status.includes('MPos:0.000,0.000,0.000')) {
        client.pass('G90 absolute mode, returned to origin');
    } else {
        client.fail('Failed to return to origin');
    }

    // Test 6: Work coordinate offset (G54 default)
    console.log('\nTest 6: Work Coordinate System');
    await client.send('G10 L2 P1 X10 Y10 Z5');
    await client.send('G0 X0 Y0 Z0');
    const wcsStatus = await client.waitForIdle();
    console.log('Expected: MPos:10.000,10.000,5.000 (WPos 0,0,0 + WCS offset 10,10,5)');

    if (wcsStatus.includes('MPos:10.000,10.000,5.000')) {
        client.pass('Work coordinate system offset applied correctly');
    } else {
        client.fail('WCS offset not applied correctly');
    }

    // Test 7: Check parameters
    console.log('Test 7: View G-code Parameters');
    await client.send('$#');

    // Test 8: Units (inches to mm)
    console.log('\nTest 8: Units - Inches (G20)');
    await client.send('G20');
    await client.send('G0 X1 Y1 Z0.5');
    const inchStatus = await client.waitForIdle();
    console.log('Expected: MPos:35.400,35.400,17.700 (1*25.4+10, 1*25.4+10, 0.5*25.4+5)');

    if (inchStatus.includes('MPos:35.400,35.400,17.700')) {
        client.pass('G20 inch mode conversion correct');
    } else {
        client.fail('Inch to mm conversion incorrect');
    }

    // Test 9: Back to mm
    console.log('\nTest 9: Back to Millimeters (G21)');
    await client.send('G21');
    await client.send('G0 X50 Y50 Z20');
    const mmStatus = await client.waitForIdle();
    console.log('Expected: MPos:60.000,60.000,25.000');

    if (mmStatus.includes('MPos:60.000,60.000,25.000')) {
        client.pass('G21 millimeter mode working correctly');
    } else {
        client.fail('Millimeter mode position incorrect');
    }

    client.printFooter('Motion Tests Complete!');
}

// Run standalone
if (require.main === module) {
    const port = parseInt(process.argv[2], 10) || 5000;
    const client = new GrblTestClient(port);

    client.connect()
        .then(() => client.delay(300))
        .then(() => runMotionTests(client))
        .then(() => client.close())
        .catch((err) => {
            console.error('Test failed:', err.message);
            client.close();
            process.exit(1);
        });
}

module.exports = runMotionTests;
