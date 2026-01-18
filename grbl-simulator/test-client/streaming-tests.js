#!/usr/bin/env node

/**
 * Streaming and Buffer Management Tests
 * Tests: character-counting protocol, buffer overflow protection
 */

const GrblTestClient = require('./GrblTestClient');

async function runStreamingTests(client) {
    client.printHeader('Streaming Protocol Test - Buffer Management');

    console.log('Grbl RX Buffer: 128 characters');
    console.log('Strategy: Character-counting protocol\n');

    // Setup
    console.log('Setup:');
    await client.send('G21 G90');
    await client.send('G1 F2000');

    console.log('\nTest 1: Stream many small G-code commands');
    console.log('Sending 20 lines of G-code...\n');

    // Generate 20 short lines of G-code
    let totalChars = 0;
    for (let i = 0; i < 20; i++) {
        const x = i * 5;
        const y = (i % 2) * 10;
        const line = `G1 X${x} Y${y}`;
        const lineWithNewline = line + '\n';
        totalChars += lineWithNewline.length;
        console.log(`Sending: ${line} (${lineWithNewline.length} chars, total: ${totalChars})`);
        client.sendRaw(lineWithNewline);
        await client.delay(10);
    }

    console.log(`\nTotal sent: ${totalChars} characters`);
    console.log(`Buffer size: 128 characters`);
    console.log(`Lines fit in buffer: ~${Math.floor(128 / 12)} lines (avg 12 chars/line)`);

    console.log('\nQuerying status during execution:');
    for (let i = 0; i < 5; i++) {
        await client.delay(200);
        console.log(`\n[Query ${i + 1}]`);
        client.sendRaw('?');
        await client.delay(50);
    }

    console.log('\n\nTest 2: Buffer overflow protection');
    console.log('Sending very long line (>80 chars)...');
    const longLine = 'G1 X' + '1.234567890'.repeat(10);
    console.log(`Line length: ${longLine.length} chars`);
    client.sendRaw(longLine + '\n');
    await client.delay(200);

    console.log('\nTest 3: Multiple rapid commands');
    console.log('Sending 5 commands rapidly...');
    for (let i = 0; i < 5; i++) {
        client.sendRaw(`G0 X${i * 20}\n`);
    }
    await client.delay(500);

    client.printFooter('Streaming Tests Complete!');
}

// Run standalone
if (require.main === module) {
    const port = parseInt(process.argv[2]) || 3000;
    const client = new GrblTestClient(port);

    client.connect()
        .then(() => client.delay(500))
        .then(() => runStreamingTests(client))
        .then(() => client.delay(500))
        .then(() => client.close())
        .catch((err) => {
            console.error('Test failed:', err.message);
            client.close();
            process.exit(1);
        });
}

module.exports = runStreamingTests;
