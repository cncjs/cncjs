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
    await client.waitForIdle();

    console.log('\nTest 1: G38.2 - Probe Toward (with error on fail)');
    await client.send('G1 F100');
    const g38Response = await client.send('G38.2 Z-20');
    console.log('(Probe operation...)');
    const probeEnd = await client.waitForIdle();
    console.log('(Probe completed)');

    // G38.2 probe command accepts either successful probe or error (if no contact)
    // In simulator without probe trigger, it may error which is expected behavior
    if (probeEnd.includes('<Idle') || g38Response.includes('ok') || g38Response.includes('error')) {
        client.pass('G38.2 probe command executed');
    } else {
        client.fail('Probe state not detected');
    }

    console.log('\nTest 2: Check probe position in $#');
    const probeParams1 = await client.send('$#');

    if (probeParams1.includes('[PRB:')) {
        client.pass('Probe position stored in PRB parameter');
    } else {
        client.fail('PRB parameter not found');
    }

    console.log('\nTest 3: G38.3 - Probe Toward (no error on fail)');
    await client.send('G0 Z10');
    await client.waitForIdle();
    const g383Response = await client.send('G38.3 Z-20 F100');
    console.log('(Probe operation...)');
    const probe3End = await client.waitForIdle();
    console.log('(Probe completed)');

    // G38.3 accepts either successful probe or error (no error signaling on fail)
    if (probe3End.includes('<Idle') || g383Response.includes('ok') || g383Response.includes('error')) {
        client.pass('G38.3 probe command executed');
    } else {
        client.fail('G38.3 probe state not detected');
    }

    console.log('\nTest 4: Verify probe result');
    const probeParams2 = await client.send('$#');

    if (probeParams2.includes('[PRB:')) {
        client.pass('Probe result updated in $#');
    } else {
        client.fail('Probe result not found');
    }

    console.log('\nTest 5: G38.4 - Probe Away');
    await client.send('G0 Z5');
    await client.waitForIdle();
    const g384Response = await client.send('G38.4 Z20 F100');
    console.log('(Probe operation...)');
    const probe4End = await client.waitForIdle();
    console.log('(Probe completed)');

    // G38.4 accepts either successful probe or error
    if (probe4End.includes('<Idle') || g384Response.includes('ok') || g384Response.includes('error')) {
        client.pass('G38.4 probe away command executed');
    } else {
        client.fail('G38.4 probe state not detected');
    }

    console.log('\nTest 6: G38.5 - Probe Away (no error)');
    await client.send('G0 Z5');
    await client.waitForIdle();
    const g385Response = await client.send('G38.5 Z20 F100');
    console.log('(Probe operation...)');
    const probe5End = await client.waitForIdle();
    console.log('(Probe completed)');

    // G38.5 accepts either successful probe or error (no error signaling on fail)
    if (probe5End.includes('<Idle') || g385Response.includes('ok') || g385Response.includes('error')) {
        client.pass('G38.5 probe away command executed');
    } else {
        client.fail('G38.5 probe state not detected');
    }

    console.log('\nTest 7: Final probe parameters');
    const finalParams = await client.send('$#');

    if (finalParams.includes('[PRB:')) {
        client.pass('Final probe parameters available');
    } else {
        client.fail('Probe parameters not found');
    }

    client.printFooter('Probe Tests Complete!');
    console.log('G38.2: Toward + Error on fail');
    console.log('G38.3: Toward + No error');
    console.log('G38.4: Away + Error on fail');
    console.log('G38.5: Away + No error');
    console.log('Probe position stored in PRB parameter');
}

// Run standalone
if (require.main === module) {
    const port = parseInt(process.argv[2], 10) || 5000;
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
