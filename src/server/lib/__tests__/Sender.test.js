/* eslint-env jest */
import fs from 'fs';
import path from 'path';
import Sender, {
  SP_TYPE_SEND_RESPONSE,
  SP_TYPE_CHAR_COUNTING
} from '../Sender';

describe('Sender', () => {
  describe('null streaming protocol', () => {
    test('should create sender with null protocol', () => {
      const sender = new Sender(null);
      expect(sender.sp).toEqual(null);
    });
  });

  describe('send-response streaming protocol', () => {
    test('should process G-code file', () => {
      return new Promise((resolve) => {
        const sender = new Sender(SP_TYPE_SEND_RESPONSE);
        expect(sender.sp.type).toEqual(SP_TYPE_SEND_RESPONSE);

        const file = path.resolve(__dirname, '__fixtures__/jsdc.gcode');
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
        expect(ok).toEqual(true);

        expect(sender.toJSON()).toEqual({
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
          remainingTime: sender.state.remainingTime
        });

        sender.on('data', () => {
          sender.ack();
        });

        sender.on('end', () => {
          expect(sender.toJSON()).toEqual({
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
            remainingTime: sender.state.remainingTime
          });

          sender.unload();

          expect(sender.sp.type).toEqual(SP_TYPE_SEND_RESPONSE);
          expect(sender.state).toEqual({
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
            remainingTime: 0
          });
          expect(sender.toJSON()).toEqual({
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
            remainingTime: 0
          });

          resolve();
        });

        const timer = setInterval(() => {
          sender.next();

          if (sender.state.sent >= sender.state.total) {
            clearInterval(timer);
          }
        }, 0);
      });
    });
  });

  describe('character-counting streaming protocol', () => {
    test('should process G-code file with buffer management', () => {
      return new Promise((resolve) => {
        const sender = new Sender(SP_TYPE_CHAR_COUNTING, {
        bufferSize: 256
      });
      expect(sender.sp.type).toEqual(SP_TYPE_CHAR_COUNTING);

      // Validation
      sender.sp.bufferSize = 0;
      expect(sender.sp.bufferSize).toEqual(256);
      sender.sp.bufferSize = 128;
      expect(sender.sp.bufferSize).toEqual(128);
      sender.sp.dataLength = 120;
      sender.sp.bufferSize = 100;
      expect(sender.sp.bufferSize).toEqual(120); // Cannot reduce below data length
      sender.sp.clear();
      sender.sp.bufferSize = 256;
      expect(sender.sp.bufferSize).toEqual(256);
      expect(sender.sp.dataLength).toEqual(0);
      expect(sender.sp.queue.length).toEqual(0);
      expect(sender.sp.line).toEqual('');

      const file = path.resolve(__dirname, '__fixtures__/jsdc.gcode');
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
      expect(ok).toEqual(true);

      expect(sender.toJSON()).toEqual({
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
        remainingTime: sender.state.remainingTime
      });

      sender.on('data', () => {
        sender.ack();
      });

      sender.on('end', () => {
        expect(sender.toJSON()).toEqual({
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
          remainingTime: sender.state.remainingTime
        });

        sender.unload();

        expect(sender.sp.type).toEqual(SP_TYPE_CHAR_COUNTING);
        expect(sender.state).toEqual({
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
          remainingTime: 0
        });
        expect(sender.toJSON()).toEqual({
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
          remainingTime: 0
        });

        resolve();
      });

        const timer = setInterval(() => {
          sender.next();

          if (sender.state.sent >= sender.state.total) {
            clearInterval(timer);
          }
        }, 0);
      });
    });
  });
});
