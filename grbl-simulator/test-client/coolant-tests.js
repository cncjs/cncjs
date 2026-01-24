#!/usr/bin/env node

/**
 * Coolant State Tests
 * Tests: M7 (mist), M8 (flood), M9 (off), simultaneous activation (M7 M8)
 */

const GrblTestClient = require('./GrblTestClient');

async function runCoolantTests(client) {
    client.printHeader('Coolant State Tests - M7/M8/M9 Commands');

    // Setup
    console.log('Setup: Ensure coolant is off');
    await client.send('M9');
    await client.send('$10=1'); // Enable MPos reporting
    await client.delay(200);

    // Test 1: M7 (Mist coolant)
    console.log('\nTest 1: M7 Command (Mist Coolant)');
    await client.send('M7');
    await client.delay(100);

    const m7Status = await client.sendRealtime('?');
    console.log('Response:', m7Status);

    if (m7Status.includes('|A:M')) {
        client.pass('Mist coolant (M) appears in accessory state');
    } else {
        client.fail('Mist coolant not found in status report');
    }

    // Test 2: M8 (Flood coolant)
    console.log('\nTest 2: M8 Command (Flood Coolant)');
    await client.send('M9'); // Turn off first
    await client.delay(100);
    await client.send('M8');
    await client.delay(100);

    const m8Status = await client.sendRealtime('?');
    console.log('Response:', m8Status);

    if (m8Status.includes('|A:F')) {
        client.pass('Flood coolant (F) appears in accessory state');
    } else {
        client.fail('Flood coolant not found in status report');
    }

    // Test 3: M7 and M8 simultaneously
    console.log('\nTest 3: M7 M8 Commands (Both Coolants Active)');
    await client.send('M9'); // Turn off first
    await client.delay(100);
    await client.send('M7 M8');
    await client.delay(100);

    const bothStatus = await client.sendRealtime('?');
    console.log('Response:', bothStatus);
    console.log('Expected format: |A:MF or |A:FM');

    // Check if both M and F are present in the accessory state (|A:)
    const accessoryMatch = bothStatus.match(/\|A:([A-Z]*)/);
    const hasM = accessoryMatch && accessoryMatch[1].includes('M');
    const hasF = accessoryMatch && accessoryMatch[1].includes('F');

    if (hasM && hasF) {
        client.pass('Both coolants active (M and F present)');
    } else {
        client.fail('Both coolants not found in status report');
    }

    // Test 4: M9 (Turn off coolant)
    console.log('\nTest 4: M9 Command (Coolant Off)');
    await client.send('M9');
    await client.delay(100);

    const m9Status = await client.sendRealtime('?');
    console.log('Response:', m9Status);

    if (!m9Status.includes('|A:M') && !m9Status.includes('|A:F')) {
        client.pass('Coolant state cleared (no M or F)');
    } else {
        client.fail('Coolant still active after M9');
    }

    // Test 5: Sequential coolant changes
    console.log('\nTest 5: Sequential Coolant State Changes');

    console.log('\nActivating M7 (Mist)...');
    await client.send('M7');
    await client.delay(100);
    await client.sendRealtime('?');

    console.log('\nSwitching to M8 (Flood)...');
    await client.send('M8');
    await client.delay(100);
    await client.sendRealtime('?');

    console.log('\nActivating both M7 M8...');
    await client.send('M7 M8');
    await client.delay(100);
    await client.sendRealtime('?');

    console.log('\nTurning off with M9...');
    await client.send('M9');
    await client.delay(100);
    await client.sendRealtime('?');

    // Test 6: Coolant with spindle
    console.log('\n\nTest 6: Coolant + Spindle State');

    console.log('Activating spindle (M3 S5000) and flood coolant (M8)...');
    await client.send('M3 S5000 M8');
    await client.delay(100);

    const spindleAndCoolant = await client.sendRealtime('?');
    console.log('Response:', spindleAndCoolant);
    console.log('Expected: Both spindle (S) and flood (F) in accessory state');

    if (spindleAndCoolant.includes('|A:S') && spindleAndCoolant.includes('F')) {
        client.pass('Spindle and coolant both active');
    } else {
        client.fail('Spindle or coolant not found in status report');
    }

    // Cleanup
    console.log('\nCleanup: Turning off spindle and coolant...');
    await client.send('M5 M9');
    await client.delay(100);

    // Test 7: Check parser state
    console.log('\nTest 7: View Parser State ($G)');
    await client.send('M7');
    await client.delay(100);
    await client.send('$G');

    client.printFooter('Coolant Tests Complete!');
}

// Run standalone
if (require.main === module) {
    const port = parseInt(process.argv[2], 10) || 5000;
    const client = new GrblTestClient(port);

    client.connect()
        .then(() => client.delay(500))
        .then(() => runCoolantTests(client))
        .then(() => client.delay(500))
        .then(() => client.close())
        .catch((err) => {
            console.error('Test failed:', err.message);
            client.close();
            process.exit(1);
        });
}

module.exports = runCoolantTests;
