import fs from 'fs';
import path from 'path';
import { test } from 'tap';
import ProgressBar from 'progress';
import Sender, { SP_TYPE_SEND_RESPONSE, SP_TYPE_CHAR_COUNTING } from '../src/app/lib/sender';

test('null streaming protocol', (t) => {
    const sender = new Sender(null);
    t.equal(sender.sp, null);
    t.end();
});

test('send-response streaming protocol', (t) => {
    const sender = new Sender(SP_TYPE_SEND_RESPONSE);
    t.equal(sender.sp.type, SP_TYPE_SEND_RESPONSE, 'send-response streaming protocol');

    const file = path.resolve(__dirname, 'fixtures/jsdc.gcode');
    const content = fs.readFileSync(file, 'utf8');
    const ok = sender.load(path.basename(file), content);
    t.equal(ok, true, `Failed to load "${file}".`);

    const total = content.split('\n').filter(line => line.trim().length > 0).length;
    t.same(sender.toJSON(), {
        sp: SP_TYPE_SEND_RESPONSE,
        name: path.basename(file),
        size: content.length,
        total: total,
        sent: 0,
        received: 0,
        createdTime: sender.state.createdTime,
        startedTime: sender.state.startedTime,
        finishedTime: sender.state.finishedTime
    });

    sender.on('data', () => {
        sender.ack();
    });
    sender.on('start', () => {
    });
    sender.on('end', () => {
        t.same(sender.toJSON(), {
            sp: SP_TYPE_SEND_RESPONSE,
            name: path.basename(file),
            size: content.length,
            total: total,
            sent: total,
            received: total,
            createdTime: sender.state.createdTime,
            startedTime: sender.state.startedTime,
            finishedTime: sender.state.finishedTime
        });

        sender.unload();

        t.equal(sender.sp.type, SP_TYPE_SEND_RESPONSE);
        t.same(sender.state, {
            name: '',
            gcode: '',
            lines: [],
            total: 0,
            sent: 0,
            received: 0,
            createdTime: 0,
            startedTime: 0,
            finishedTime: 0,
            changed: true
        });
        t.same(sender.toJSON(), {
            sp: SP_TYPE_SEND_RESPONSE,
            name: '',
            size: 0,
            total: 0,
            sent: 0,
            received: 0,
            createdTime: 0,
            startedTime: 0,
            finishedTime: 0
        });
        t.end();
    });

    const bar = new ProgressBar('processing [:bar] :percent :etas', {
        stream: process.stderr,
        total: sender.state.total
    });
    const timer = setInterval(() => {
        bar.tick();

        if (bar.complete) {
            clearInterval(timer);
            return;
        }

        if (sender.state.sent < sender.state.total) {
            sender.next();
        }

        if (sender.peek()) {
            // Nothing
        }
    }, 0);
});

test('character-counting streaming protocol', (t) => {
    const sender = new Sender(SP_TYPE_CHAR_COUNTING, {
        bufferSize: 256
    });
    t.equal(sender.sp.type, SP_TYPE_CHAR_COUNTING, 'character-counting streaming protocol');

    // Validation
    sender.sp.bufferSize = 0;
    t.equal(sender.sp.bufferSize, 256);
    sender.sp.bufferSize = 128;
    t.equal(sender.sp.bufferSize, 128);
    sender.sp.dataLength = 120;
    sender.sp.bufferSize = 100;
    t.equal(sender.sp.bufferSize, 120, 'The buffer size cannot be reduced below the size of the data within the buffer.');
    sender.sp.clear();
    sender.sp.bufferSize = 256;
    t.equal(sender.sp.bufferSize, 256);
    t.equal(sender.sp.dataLength, 0);
    t.equal(sender.sp.queue.length, 0);
    t.equal(sender.sp.line, '');

    const file = path.resolve(__dirname, 'fixtures/jsdc.gcode');
    const content = fs.readFileSync(file, 'utf8');
    const ok = sender.load(path.basename(file), content);
    t.equal(ok, true, `Failed to load "${file}".`);

    const total = content.split('\n').filter(line => line.trim().length > 0).length;
    t.same(sender.toJSON(), {
        sp: SP_TYPE_CHAR_COUNTING,
        name: path.basename(file),
        size: content.length,
        total: total,
        sent: 0,
        received: 0,
        createdTime: sender.state.createdTime,
        startedTime: sender.state.startedTime,
        finishedTime: sender.state.finishedTime
    });

    sender.on('data', () => {
        sender.ack();
    });
    sender.on('start', () => {
    });
    sender.on('end', () => {
        t.same(sender.toJSON(), {
            sp: SP_TYPE_CHAR_COUNTING,
            name: path.basename(file),
            size: content.length,
            total: total,
            sent: total,
            received: total,
            createdTime: sender.state.createdTime,
            startedTime: sender.state.startedTime,
            finishedTime: sender.state.finishedTime
        });

        sender.unload();

        t.equal(sender.sp.type, SP_TYPE_CHAR_COUNTING);
        t.same(sender.state, {
            name: '',
            gcode: '',
            lines: [],
            total: 0,
            sent: 0,
            received: 0,
            createdTime: 0,
            startedTime: 0,
            finishedTime: 0,
            changed: true
        });
        t.same(sender.toJSON(), {
            sp: SP_TYPE_CHAR_COUNTING,
            name: '',
            size: 0,
            total: 0,
            sent: 0,
            received: 0,
            createdTime: 0,
            startedTime: 0,
            finishedTime: 0
        });
        t.end();
    });

    const bar = new ProgressBar('processing [:bar] :percent :etas', {
        stream: process.stderr,
        total: sender.state.total
    });
    const timer = setInterval(() => {
        bar.tick();

        if (bar.complete) {
            clearInterval(timer);
            return;
        }

        if (sender.state.sent < sender.state.total) {
            sender.next();
        }

        if (sender.peek()) {
            // Nothing
        }
    }, 0);
});
