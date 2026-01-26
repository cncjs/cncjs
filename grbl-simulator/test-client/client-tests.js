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
    const statusResp = await client.sendRealtime('?');
    await client.delay(200);
    if (statusResp.includes('<') && statusResp.includes('>')) {
        client.pass('Status report received');
    } else {
        client.fail('Invalid status report format');
    }

    // Test 2: List settings
    console.log('\nTest 2: List Settings');
    const settingsResp = await client.send('$$');
    await client.delay(500);
    if (settingsResp.includes('$0=') && settingsResp.includes('ok')) {
        client.pass('Settings list retrieved');
    } else {
        client.fail('Settings list not retrieved');
    }

    // Test 3: Parser state
    console.log('\nTest 3: Get Parser State');
    const parserResp = await client.send('$G');
    await client.delay(200);
    if (parserResp.includes('[GC:') && parserResp.includes('ok')) {
        client.pass('Parser state retrieved');
    } else {
        client.fail('Parser state not retrieved');
    }

    // Test 4: Build info
    console.log('\nTest 4: Get Build Info');
    const buildResp = await client.send('$I');
    await client.delay(200);
    if (buildResp.includes('[') && buildResp.includes('ok')) {
        client.pass('Build info retrieved');
    } else {
        client.fail('Build info not retrieved');
    }

    // Test 5: G-code parameters
    console.log('\nTest 5: Get G-code Parameters');
    const paramsResp = await client.send('$#');
    await client.delay(300);
    if (paramsResp.includes('[G54:') && paramsResp.includes('ok')) {
        client.pass('G-code parameters retrieved');
    } else {
        client.fail('G-code parameters not retrieved');
    }

    // Test 6: Change setting
    console.log('\nTest 6: Change Setting');
    const setResp = await client.send('$100=300');
    await client.delay(200);
    if (setResp.includes('ok')) {
        client.pass('Setting updated successfully');
    } else {
        client.fail('Setting update failed');
    }

    // Test 7: Feed hold
    console.log('\nTest 7: Feed Hold (!)');
    await client.sendRealtime('!');
    await client.delay(200);
    const holdResp = await client.sendRealtime('?');
    await client.delay(200);
    if (holdResp.includes('<')) {
        client.pass('Feed hold command accepted');
    } else {
        client.fail('Feed hold command failed');
    }

    // Test 8: Cycle start
    console.log('\nTest 8: Cycle Start (~)');
    await client.sendRealtime('~');
    await client.delay(200);
    const resumeResp = await client.sendRealtime('?');
    await client.delay(200);
    if (resumeResp.includes('<')) {
        client.pass('Cycle start command accepted');
    } else {
        client.fail('Cycle start command failed');
    }

    // Test 9: Check mode
    console.log('\nTest 9: Toggle Check Mode');
    const checkOnResp = await client.send('$C');
    await client.delay(200);
    const checkStatus = await client.sendRealtime('?');
    await client.delay(200);
    const checkOffResp = await client.send('$C');
    await client.delay(200);
    if (checkOnResp.includes('ok') && checkOffResp.includes('ok')) {
        client.pass('Check mode toggle successful');
    } else {
        client.fail('Check mode toggle failed');
    }

    client.printFooter('Basic Client Tests Complete!');
}

// Run standalone
if (require.main === module) {
    const port = parseInt(process.argv[2]) || 5000;
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
