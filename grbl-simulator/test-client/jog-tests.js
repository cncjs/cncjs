#!/usr/bin/env node

/**
 * Jogging Command Tests
 * Tests: $J= jog commands, jog cancel, parser state preservation
 */

const GrblTestClient = require('./GrblTestClient');

async function runJogTests(client) {
    client.printHeader('Grbl Jogging Test');

    console.log('Test 1: Check parser state before jogging');
    await client.send('$G');

    console.log('\nTest 2: Jog in absolute mode (G90)');
    await client.send('$J=G90 X10 F600');
    await client.delay(200);
    await client.sendRealtime('?');
    await client.delay(800);
    await client.sendRealtime('?');

    console.log('\nTest 3: Check parser state after jogging (should be unchanged)');
    await client.send('$G');

    console.log('\nTest 4: Jog in incremental mode (G91)');
    await client.send('$J=G91 X5 Y10 F1000');
    await client.delay(200);
    await client.sendRealtime('?');
    await client.delay(600);
    await client.sendRealtime('?');

    console.log('\nTest 5: Verify parser state still unchanged');
    await client.send('$G');

    console.log('\nTest 6: Jog with unit override');
    await client.send('$J=G20 X1 F100');
    await client.delay(200);
    console.log('(jogging 1 inch = 25.4mm)');
    await client.sendRealtime('?');
    await client.delay(2000);
    await client.sendRealtime('?');

    console.log('\nTest 7: Test jog cancel');
    await client.send('$J=X50 F200');
    await client.delay(200);
    await client.sendRealtime('?');
    await client.delay(500);
    console.log('\n> Jog Cancel (0x85)');
    client.sendRaw(String.fromCharCode(0x85));
    await client.delay(100);
    console.log('> ? (should show Idle)');
    await client.sendRealtime('?');

    console.log('\nTest 8: Error - jog without F word');
    await client.send('$J=X10');

    console.log('\nTest 9: Error - jog without axis words');
    await client.send('$J=F100');

    client.printFooter('Jogging Tests Complete!');
}

// Run standalone
if (require.main === module) {
    const port = parseInt(process.argv[2]) || 5000;
    const client = new GrblTestClient(port);

    client.connect()
        .then(() => client.delay(300))
        .then(() => runJogTests(client))
        .then(() => client.close())
        .catch((err) => {
            console.error('Test failed:', err.message);
            client.close();
            process.exit(1);
        });
}

module.exports = runJogTests;
