#!/usr/bin/env node

/**
 * Settings Tests
 * Tests: $$ command, $x=value updates, $10 position reporting modes
 */

const GrblTestClient = require('./GrblTestClient');

async function runSettingsTests(client) {
    client.printHeader('Settings Tests - Configuration Management');

    // Test 1: View all settings
    console.log('Test 1: View All Settings ($$)');
    await client.send('$$');
    console.log();

    // Test 2: $10 position reporting modes
    console.log('\nTest 2: $10 Position Reporting Modes');

    console.log('\n$10=0 (WPos only)');
    await client.send('$10=0');
    await client.delay(100);
    const wposOnly = await client.sendRealtime('?');
    console.log('Response:', wposOnly);

    if (wposOnly.includes('WPos:') && !wposOnly.includes('MPos:')) {
        client.pass('WPos reporting enabled');
    } else {
        client.fail('Expected WPos only');
    }

    console.log('\n$10=1 (MPos only)');
    await client.send('$10=1');
    await client.delay(100);
    const mposOnly = await client.sendRealtime('?');
    console.log('Response:', mposOnly);

    if (mposOnly.includes('MPos:') && !mposOnly.includes('WPos:')) {
        client.pass('MPos reporting enabled');
    } else {
        client.fail('Expected MPos only');
    }

    console.log('\n$10=2 (WPos + Buffer state)');
    await client.send('$10=2');
    await client.delay(100);
    const wposBuffer = await client.sendRealtime('?');
    console.log('Response:', wposBuffer);

    if (wposBuffer.includes('WPos:') && wposBuffer.includes('|Bf:')) {
        client.pass('WPos and buffer state enabled');
    } else {
        client.fail('Expected WPos and buffer state');
    }

    console.log('\n$10=3 (MPos + Buffer state)');
    await client.send('$10=3');
    await client.delay(100);
    const mposBuffer = await client.sendRealtime('?');
    console.log('Response:', mposBuffer);

    if (mposBuffer.includes('MPos:') && mposBuffer.includes('|Bf:')) {
        client.pass('MPos and buffer state enabled');
    } else {
        client.fail('Expected MPos and buffer state');
    }

    // Test 3: Feed rate and rapid rate settings
    console.log('\n\nTest 3: Feed Rate and Rapid Rate Settings');

    console.log('\nSetting $110=500 (X-axis max rate)');
    await client.send('$110=500');
    await client.delay(100);

    console.log('Setting $111=500 (Y-axis max rate)');
    await client.send('$111=500');
    await client.delay(100);

    console.log('Setting $112=500 (Z-axis max rate)');
    await client.send('$112=500');
    await client.delay(100);

    console.log('\nVerifying settings:');
    await client.send('$$');

    // Test 4: Homing settings
    console.log('\n\nTest 4: Homing Settings ($22)');

    console.log('\nDisabling homing ($22=0)');
    await client.send('$22=0');
    await client.delay(100);

    console.log('Enabling homing ($22=1)');
    await client.send('$22=1');
    await client.delay(100);

    console.log('\nVerifying $22 setting:');
    await client.send('$$');

    // Test 5: Step pulse settings
    console.log('\n\nTest 5: Step Pulse Settings');

    console.log('Setting $0=10 (step pulse microseconds)');
    await client.send('$0=10');
    await client.delay(100);

    console.log('Setting $1=25 (step idle delay milliseconds)');
    await client.send('$1=25');
    await client.delay(100);

    console.log('\nVerifying pulse settings:');
    await client.send('$$');

    // Test 6: Invalid setting value
    console.log('\n\nTest 6: Invalid Setting Value');

    console.log('Attempting invalid setting ($999=100)');
    await client.send('$999=100');
    await client.delay(100);
    console.log('Expected: error:3 (Invalid statement)');

    // Test 7: Direction port invert mask
    console.log('\n\nTest 7: Direction Port Invert Mask ($3)');

    console.log('Setting $3=0 (no axis inversion)');
    await client.send('$3=0');
    await client.delay(100);

    console.log('Setting $3=1 (invert X-axis direction)');
    await client.send('$3=1');
    await client.delay(100);

    console.log('Setting $3=7 (invert X, Y, Z axes)');
    await client.send('$3=7');
    await client.delay(100);

    console.log('\nVerifying $3 setting:');
    await client.send('$$');

    // Test 8: Restore defaults
    console.log('\n\nTest 8: Settings Persistence');
    console.log('Note: Settings should persist across connections');
    console.log('Setting $10=1 to restore MPos reporting for other tests');
    await client.send('$10=1');
    await client.delay(100);

    // Test 9: View settings summary
    console.log('\n\nTest 9: Final Settings Summary');
    await client.send('$$');

    client.printFooter('Settings Tests Complete!');
}

// Run standalone
if (require.main === module) {
    const port = parseInt(process.argv[2], 10) || 5000;
    const client = new GrblTestClient(port);

    client.connect()
        .then(() => client.delay(500))
        .then(() => runSettingsTests(client))
        .then(() => client.delay(500))
        .then(() => client.close())
        .catch((err) => {
            console.error('Test failed:', err.message);
            client.close();
            process.exit(1);
        });
}

module.exports = runSettingsTests;
