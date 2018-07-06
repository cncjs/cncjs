import { test } from 'tap';
import TinyG from '../src/app/controllers/TinyG/TinyG';

test('TinyGParserResultMotorTimeout', (t) => {
    t.test('{"r":{"mt":300},"f":[0,0,0]}', (t) => {
        const tinyg = new TinyG();
        tinyg.on('mt', (mt) => {
            t.equal(mt, 300);
            t.end();
        });

        const line = '{"r":{"mt":300},"f":[0,0,0]}';
        tinyg.parse(line);
    });

    t.end();
});

test('TinyGParserResultPowerManagement', (t) => {
    t.test('{"r":{"pwr":{"1":0,"2":0,"3":0,"4":0}},"f":[0,0,0]}', (t) => {
        const tinyg = new TinyG();
        tinyg.on('pwr', (pwr) => {
            t.same(pwr, {"1":0,"2":0,"3":0,"4":0});
            t.end();
        });

        const line = '{"r":{"pwr":{"1":0,"2":0,"3":0,"4":0}},"f":[0,0,0]}';
        tinyg.parse(line);
    });

    t.end();
});

test('TinyGParserResultQueueReports', (t) => {
    t.test('{"qr":31,"qi":1,"qo":0}', (t) => {
        const tinyg = new TinyG();

        tinyg.on('qr', ({ qr, qi, qo }) => {
            t.equal(qr, 31);
            t.equal(qi, 1);
            t.equal(qo, 0);

            t.end();
        });

        tinyg.parse('{"qr":31,"qi":1,"qo":0}');
    });

    t.test('{"r":{"qr":32,"qi":0,"qo":1},"f":[0,0,0]}', (t) => {
        const tinyg = new TinyG();

        tinyg.on('qr', ({ qr, qi, qo }) => {
            t.equal(qr, 32);
            t.equal(qi, 0);
            t.equal(qo, 1);

            t.end();
        });

        tinyg.parse('{"r":{"qr":32,"qi":0,"qo":1},"f":[0,0,0]}');
    });

    t.end();
});

/*
test('TinyGParserResultStatusReports', (t) => {
});
*/

test('TinyGParserResultSystemSettings', (t) => {
    t.test('{"r":{"sys":{"fv":0.99,"fb":100.12,"fbs":"100.12-14-g375c-dirty","fbc":"settings_makeblock.h","hp":3,"hv":0,"id":"0084-7bd6-29c6-8ce"}},"f":[0,0,0]}', (t) => {
        const tinyg = new TinyG();
        tinyg.on('sys', ({ fv, fb, fbs, fbc, hp, hv, id }) => {
            t.equal(fv, 0.99);
            t.equal(fb, 100.12);
            t.equal(fbs, '100.12-14-g375c-dirty');
            t.equal(fbc, 'settings_makeblock.h');
            t.equal(hp, 3);
            t.equal(hv, 0);
            t.equal(id, '0084-7bd6-29c6-8ce');

            t.end();
        });

        const line = '{"r":{"sys":{"fv":0.99,"fb":100.12,"fbs":"100.12-14-g375c-dirty","fbc":"settings_makeblock.h","hp":3,"hv":0,"id":"0084-7bd6-29c6-8ce"}},"f":[0,0,0]}';
        tinyg.parse(line);
    });

    t.end();
});

test('TinyGParserResultOverrides', (t) => {
    t.test('{"r":{"mfo":1.0,"mto":1.0,"sso":1.0},"f":[0,0,0]}', (t) => {
        const tinyg = new TinyG();
        tinyg.on('ov', ({ mfo, mto, sso }) => {
            t.assert(mfo, 1.0);
            t.assert(mto, 1.0);
            t.assert(sso, 1.0);

            t.end();
        });

        const line = '{"r":{"mfo":1.0,"mto":1.0,"sso":1.0},"f":[0,0,0]}';
        tinyg.parse(line);
    });

    t.end();
});

/*
test('TinyGParserResultReceiveReports', (t) => {
});
*/
