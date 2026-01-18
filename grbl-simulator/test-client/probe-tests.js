#!/usr/bin/env node

/**
 * Probe Command Tests
 * Tests: G38.2, G38.3, G38.4, G38.5 probing commands
 */

const GrblTestClient = require('./GrblTestClient');

async function runProbeTests(client) {
    client.printHeader('G38.x Probing Commands Test');

    console.log('G38.2: Probe toward workpiece, stop on contact, signal error if failure');
    console.log('G38.3: Probe toward workpiece, stop on contact');
    console.log('G38.4: Probe away from workpiece, stop on loss of contact, signal error');
    console.log('G38.5: Probe away from workpiece, stop on loss of contact\n');

    // Setup
    await client.send('G21');
    await client.send('G90');
    await client.send('G0 X0 Y0 Z10');
    await client.delay(200);

    console.log('\nTest 1: G38.2 - Probe Toward (with error on fail)');
    await client.send('G1 F100');
    await client.send('G38.2 Z-20');
    await client.delay(100);
    await client.sendRealtime('?');
    console.log('(Probe moving toward workpiece...)');
    await client.delay(1000);
    await client.sendRealtime('?');
    console.log('(Probe should stop at contact)\n');
    await client.delay(2000);
    await client.sendRealtime('?');

    console.log('\nTest 2: Check probe position in $#');
    await client.send('$#');

    console.log('\nTest 3: G38.3 - Probe Toward (no error on fail)');
    await client.send('G0 Z10');
    await client.delay(200);
    await client.send('G38.3 Z-20 F100');
    await client.delay(100);
    await client.sendRealtime('?');
    await client.delay(2000);
    await client.sendRealtime('?');

    console.log('\nTest 4: Verify probe result');
    await client.send('$#');

    console.log('\nTest 5: G38.4 - Probe Away');
    await client.send('G0 Z5');
    await client.delay(200);
    await client.send('G38.4 Z20 F100');
    await client.delay(100);
    await client.sendRealtime('?');
    await client.delay(1500);
    await client.sendRealtime('?');

    console.log('\nTest 6: G38.5 - Probe Away (no error)');
    await client.send('G0 Z5');
    await client.delay(200);
    await client.send('G38.5 Z20 F100');
    await client.delay(100);
    await client.sendRealtime('?');
    await client.delay(1500);
    await client.sendRealtime('?');

    console.log('\nTest 7: Final probe parameters');
    await client.send('$#');

    client.printFooter('Probe Tests Complete!');
    console.log('G38.2: Toward + Error on fail');
    console.log('G38.3: Toward + No error');
    console.log('G38.4: Away + Error on fail');
    console.log('G38.5: Away + No error');
    console.log('Probe position stored in PRB parameter');
}

// Run standalone
if (require.main === module) {
    const port = parseInt(process.argv[2]) || 3000;
    const client = new GrblTestClient(port);

    client.connect()
        .then(() => client.delay(300))
        .then(() => runProbeTests(client))
        .then(() => client.close())
        .catch((err) => {
            console.error('Test failed:', err.message);
            client.close();
            process.exit(1);
        });
}

module.exports = runProbeTests;
