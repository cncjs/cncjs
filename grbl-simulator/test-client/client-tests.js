#!/usr/bin/env node

/**
 * Basic Client Tests
 * Tests: status query, settings, parser state, build info, parameters
 */

const GrblTestClient = require('./GrblTestClient');

async function runClientTests(client) {
    client.printHeader('Basic Client Tests');

    // Test 1: Status query
    console.log('Test 1: Status Report Query');
    await client.sendRealtime('?');
    await client.delay(200);

    // Test 2: List settings
    console.log('\nTest 2: List Settings');
    await client.send('$$');
    await client.delay(500);

    // Test 3: Parser state
    console.log('\nTest 3: Get Parser State');
    await client.send('$G');
    await client.delay(200);

    // Test 4: Build info
    console.log('\nTest 4: Get Build Info');
    await client.send('$I');
    await client.delay(200);

    // Test 5: G-code parameters
    console.log('\nTest 5: Get G-code Parameters');
    await client.send('$#');
    await client.delay(300);

    // Test 6: Change setting
    console.log('\nTest 6: Change Setting');
    await client.send('$100=300');
    await client.delay(200);

    // Test 7: Feed hold
    console.log('\nTest 7: Feed Hold (!)');
    await client.sendRealtime('!');
    await client.delay(200);
    await client.sendRealtime('?');
    await client.delay(200);

    // Test 8: Cycle start
    console.log('\nTest 8: Cycle Start (~)');
    await client.sendRealtime('~');
    await client.delay(200);
    await client.sendRealtime('?');
    await client.delay(200);

    // Test 9: Check mode
    console.log('\nTest 9: Toggle Check Mode');
    await client.send('$C');
    await client.delay(200);
    await client.sendRealtime('?');
    await client.delay(200);
    await client.send('$C');
    await client.delay(200);

    client.printFooter('Basic Client Tests Complete!');
}

// Run standalone
if (require.main === module) {
    const port = parseInt(process.argv[2]) || 3000;
    const client = new GrblTestClient(port);

    client.connect()
        .then(() => client.delay(500))
        .then(() => runClientTests(client))
        .then(() => client.delay(500))
        .then(() => client.close())
        .catch((err) => {
            console.error('Test failed:', err.message);
            client.close();
            process.exit(1);
        });
}

module.exports = runClientTests;
