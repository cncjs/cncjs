import fs from 'fs';
import path from 'path';
import { test } from 'tap';
import ProgressBar from 'progress';
import Sender, {
  SP_TYPE_SEND_RESPONSE,
  SP_TYPE_CHAR_COUNTING
} from '../src/server/lib/Sender';

test('null streaming protocol', (t) => {
  t.plan(1);

  const sender = new Sender(null);
  t.equal(sender.sp, null);
});

test('send-response streaming protocol', (t) => {
  t.plan(6);

  const sender = new Sender(SP_TYPE_SEND_RESPONSE);
  t.equal(sender.sp.type, SP_TYPE_SEND_RESPONSE, 'send-response streaming protocol');

  sender.on('load', () => {
    t.same(sender.toJSON(), {
      sp: SP_TYPE_SEND_RESPONSE,
      loaded: true,
      hold: false,
      holdReason: null,
      name: path.basename(file),
      context: context,
      size: sender.state.content.length,
      total: sender.state.total,
      sent: 0,
      received: 0,
      startTime: sender.state.startTime,
      finishTime: sender.state.finishTime,
      elapsedTime: sender.state.elapsedTime,
      remainingTime: sender.state.remainingTime,
    });
  });

  sender.on('data', () => {
    sender.ack();
  });

  sender.on('start', () => {
  });

  sender.on('end', () => {
    t.same(sender.toJSON(), {
      sp: SP_TYPE_SEND_RESPONSE,
      loaded: true,
      hold: false,
      holdReason: null,
      name: path.basename(file),
      context: context,
      size: sender.state.content.length,
      total: sender.state.total,
      sent: sender.state.sent,
      received: sender.state.received,
      startTime: sender.state.startTime,
      finishTime: sender.state.finishTime,
      elapsedTime: sender.state.elapsedTime,
      remainingTime: sender.state.remainingTime,
    });
  });

  sender.on('rewind', () => {
    t.same(sender.toJSON(), {
      sp: SP_TYPE_SEND_RESPONSE,
      loaded: true,
      hold: false,
      holdReason: null,
      name: path.basename(file),
      context: context,
      size: sender.state.content.length,
      total: sender.state.total,
      sent: 0,
      received: 0,
      startTime: sender.state.startTime,
      finishTime: sender.state.finishTime,
      elapsedTime: sender.state.elapsedTime,
      remainingTime: sender.state.remainingTime,
    });
  });

  sender.on('unload', () => {
    t.same(sender.toJSON(), {
      sp: SP_TYPE_SEND_RESPONSE,
      loaded: false,
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
    });
  });

  const file = path.resolve(__dirname, 'fixtures/jsdc.gcode');
  const content = fs.readFileSync(file, 'utf8');
  const context = {
    xmin: 0,
    xmax: 100,
    ymin: 0,
    ymax: 100,
    zmin: -2,
    zmax: 50,
  };
  const meta = {
    name: path.basename(file),
    content,
  };
  const ok = sender.load(meta, context);
  t.equal(ok, true, `Failed to load "${file}".`);

  const bar = new ProgressBar('processing [:bar] :percent :etas', {
    total: sender.state.total,
  });
  const timer = setInterval(() => {
    bar.tick();

    sender.next();

    if (bar.complete) {
      sender.rewind();
      sender.unload();

      clearInterval(timer);
      return;
    }

    if (sender.peek()) {
      // Nothing
    }
  }, 0);
});

test('character-counting streaming protocol', (t) => {
  t.plan(13);

  const sender = new Sender(SP_TYPE_CHAR_COUNTING, {
    bufferSize: 256,
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

  sender.on('load', () => {
    t.same(sender.toJSON(), {
      sp: SP_TYPE_CHAR_COUNTING,
      loaded: true,
      hold: false,
      holdReason: null,
      name: path.basename(file),
      context: context,
      size: sender.state.content.length,
      total: sender.state.total,
      sent: 0,
      received: 0,
      startTime: sender.state.startTime,
      finishTime: sender.state.finishTime,
      elapsedTime: sender.state.elapsedTime,
      remainingTime: sender.state.remainingTime,
    });
  });

  sender.on('data', () => {
    sender.ack();
  });

  sender.on('start', () => {
  });

  sender.on('end', () => {
    t.same(sender.toJSON(), {
      sp: SP_TYPE_CHAR_COUNTING,
      loaded: true,
      hold: false,
      holdReason: null,
      name: path.basename(file),
      context: context,
      size: sender.state.content.length,
      total: sender.state.total,
      sent: sender.state.sent,
      received: sender.state.received,
      startTime: sender.state.startTime,
      finishTime: sender.state.finishTime,
      elapsedTime: sender.state.elapsedTime,
      remainingTime: sender.state.remainingTime,
    });
  });

  sender.on('rewind', () => {
    t.same(sender.toJSON(), {
      sp: SP_TYPE_CHAR_COUNTING,
      loaded: true,
      hold: false,
      holdReason: null,
      name: path.basename(file),
      context: context,
      size: sender.state.content.length,
      total: sender.state.total,
      sent: 0,
      received: 0,
      startTime: sender.state.startTime,
      finishTime: sender.state.finishTime,
      elapsedTime: sender.state.elapsedTime,
      remainingTime: sender.state.remainingTime,
    });
  });

  sender.on('unload', () => {
    t.same(sender.toJSON(), {
      sp: SP_TYPE_CHAR_COUNTING,
      loaded: false,
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
    });
  });

  const file = path.resolve(__dirname, 'fixtures/jsdc.gcode');
  const content = fs.readFileSync(file, 'utf8');
  const context = {
    xmin: 0,
    xmax: 100,
    ymin: 0,
    ymax: 100,
    zmin: -2,
    zmax: 50,
  };
  const meta = {
    name: path.basename(file),
    content,
  };
  const ok = sender.load(meta, context);
  t.equal(ok, true, `Failed to load "${file}".`);

  const bar = new ProgressBar('processing [:bar] :percent :etas', {
    total: sender.state.total,
  });
  const timer = setInterval(() => {
    bar.tick();

    sender.next();

    if (bar.complete) {
      sender.rewind();
      sender.unload();

      clearInterval(timer);
      return;
    }

    if (sender.peek()) {
      // Nothing
    }
  }, 0);
});
