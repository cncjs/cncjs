import fs from 'fs';
import path from 'path';
import { test } from 'tap';
import ProgressBar from 'progress';
import Sender, {
    SP_TYPE_SEND_RESPONSE,
    SP_TYPE_CHAR_COUNTING
} from '../src/server/lib/Sender';

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
    const context = {
        xmin: 0,
        xmax: 100,
        ymin: 0,
        ymax: 100,
        zmin: -2,
        zmax: 50
    };
    const ok = sender.load(path.basename(file), content, context);
    t.equal(ok, true, `Failed to load "${file}".`);

    t.same(sender.toJSON(), {
        sp: SP_TYPE_SEND_RESPONSE,
        hold: false,
        holdReason: null,
        name: path.basename(file),
        context: context,
        size: sender.state.gcode.length,
        total: sender.state.total,
        sent: 0,
        received: 0,
        startTime: sender.state.startTime,
        finishTime: sender.state.finishTime,
        elapsedTime: sender.state.elapsedTime,
        remainingTime: sender.state.remainingTime,
        message: ''
    });

    sender.on('data', () => {
        sender.ack();
    });
    sender.on('start', () => {
    });
    sender.on('end', () => {
        t.same(sender.toJSON(), {
            sp: SP_TYPE_SEND_RESPONSE,
            hold: false,
            holdReason: null,
            name: path.basename(file),
            context: context,
            size: sender.state.gcode.length,
            total: sender.state.total,
            sent: sender.state.sent,
            received: sender.state.received,
            startTime: sender.state.startTime,
            finishTime: sender.state.finishTime,
            elapsedTime: sender.state.elapsedTime,
            remainingTime: sender.state.remainingTime,
            message: 'jsdc.gcode Program Start'
        });

        sender.unload();

        t.equal(sender.sp.type, SP_TYPE_SEND_RESPONSE);
        t.same(sender.state, {
            name: '',
            hold: false,
            holdReason: null,
            context: {},
            gcode: '',
            lines: [],
            total: 0,
            sent: 0,
            received: 0,
            startTime: 0,
            finishTime: 0,
            elapsedTime: 0,
            remainingTime: 0,
            message: ''
        });
        t.same(sender.toJSON(), {
            sp: SP_TYPE_SEND_RESPONSE,
            hold: false,
            holdReason: null,
            name: '',
            context: {},
            size: 0,
            total: 0,
            sent: 0,
            received: 0,
            startTime: 0,
            finishTime: 0,
            elapsedTime: 0,
            remainingTime: 0,
            message: ''
        });

        t.end();
    });

    const bar = new ProgressBar('processing [:bar] :percent :etas', {
        total: sender.state.total
    });
    const timer = setInterval(() => {
        bar.tick();

        sender.next();

        if (bar.complete) {
            clearInterval(timer);
            return;
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
    const context = {
        xmin: 0,
        xmax: 100,
        ymin: 0,
        ymax: 100,
        zmin: -2,
        zmax: 50
    };
    const ok = sender.load(path.basename(file), content, context);
    t.equal(ok, true, `Failed to load "${file}".`);

    t.same(sender.toJSON(), {
        sp: SP_TYPE_CHAR_COUNTING,
        hold: false,
        holdReason: null,
        name: path.basename(file),
        context: context,
        size: sender.state.gcode.length,
        total: sender.state.total,
        sent: 0,
        received: 0,
        startTime: sender.state.startTime,
        finishTime: sender.state.finishTime,
        elapsedTime: sender.state.elapsedTime,
        remainingTime: sender.state.remainingTime,
        message: ''
    });

    sender.on('data', () => {
        sender.ack();
    });
    sender.on('start', () => {
    });
    sender.on('end', () => {
        t.same(sender.toJSON(), {
            sp: SP_TYPE_CHAR_COUNTING,
            hold: false,
            holdReason: null,
            name: path.basename(file),
            context: context,
            size: sender.state.gcode.length,
            total: sender.state.total,
            sent: sender.state.sent,
            received: sender.state.received,
            startTime: sender.state.startTime,
            finishTime: sender.state.finishTime,
            elapsedTime: sender.state.elapsedTime,
            remainingTime: sender.state.remainingTime,
            message: 'jsdc.gcode Program Start'
        });

        sender.unload();

        t.equal(sender.sp.type, SP_TYPE_CHAR_COUNTING);
        t.same(sender.state, {
            hold: false,
            holdReason: null,
            name: '',
            gcode: '',
            context: {},
            lines: [],
            total: 0,
            sent: 0,
            received: 0,
            startTime: 0,
            finishTime: 0,
            elapsedTime: 0,
            remainingTime: 0,
            message: ''
        });
        t.same(sender.toJSON(), {
            sp: SP_TYPE_CHAR_COUNTING,
            hold: false,
            holdReason: null,
            name: '',
            context: {},
            size: 0,
            total: 0,
            sent: 0,
            received: 0,
            startTime: 0,
            finishTime: 0,
            elapsedTime: 0,
            remainingTime: 0,
            message: ''
        });

        t.end();
    });

    const bar = new ProgressBar('processing [:bar] :percent :etas', {
        total: sender.state.total
    });
    const timer = setInterval(() => {
        bar.tick();

        sender.next();

        if (bar.complete) {
            clearInterval(timer);
            return;
        }

        if (sender.peek()) {
            // Nothing
        }
    }, 0);
});
