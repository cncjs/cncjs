import { test } from 'tap';
import TinyGRunner from '../src/server/controllers/TinyG/TinyGRunner';

test('TinyGParserResultMotorTimeout', (t) => {
    t.test('{"r":{"mt":2},"f":[1,0,8]}', (t) => {
        const runner = new TinyGRunner();
        runner.on('mt', (mt) => {
            t.equal(mt, 2);
            t.end();
        });

        const line = '{"r":{"mt":2},"f":[1,0,8]}';
        runner.parse(line);
    });

    t.end();
});

test('TinyGParserResultPowerManagement', (t) => {
    t.test('{"r":{"pwr":{"1":0,"2":0,"3":0,"4":0}},"f":[1,0,9]}', (t) => {
        const runner = new TinyGRunner();
        runner.on('pwr', (pwr) => {
            t.same(pwr, { '1': 0, '2': 0, '3': 0, '4': 0 });
            t.end();
        });

        const line = '{"r":{"pwr":{"1":0,"2":0,"3":0,"4":0}},"f":[1,0,9]}';
        runner.parse(line);
    });

    t.end();
});

test('TinyGParserResultQueueReports', (t) => {
    t.test('{"qr":48}', (t) => {
        const runner = new TinyGRunner();

        runner.on('qr', ({ qr, qi, qo }) => {
            t.equal(qr, 48);
            t.equal(qi, 0);
            t.equal(qo, 0);
            t.end();
        });

        runner.parse('{"qr":48}');
    });

    t.test('{"r":{"qr":32,"qi":0,"qo":1},"f":[1,0,8]}', (t) => {
        const runner = new TinyGRunner();

        runner.on('qr', ({ qr, qi, qo }) => {
            t.equal(qr, 32);
            t.equal(qi, 0);
            t.equal(qo, 1);
            t.end();
        });

        runner.parse('{"r":{"qr":32,"qi":0,"qo":1},"f":[1,0,8]}');
    });

    t.end();
});

test('TinyGParserResultStatusReports', (t) => {
    t.test('{"sr":{"line":8,"stat":5,"cycs":1,"mots":1}}', (t) => {
        const runner = new TinyGRunner();
        runner.on('sr', ({ line, stat, cycs, mots }) => {
            t.equal(line, 8);
            t.equal(stat, 5);
            t.equal(cycs, 1);
            t.equal(mots, 1);
            t.end();
        });

        const line = '{"sr":{"line":8,"stat":5,"cycs":1,"mots":1}}';
        runner.parse(line);
    });

    t.test('{"sr":{"line":0,"vel":688.81,"mots":2,"dist":1,"posx":0.248,"posy":0.248,"mpox":0.248,"mpoy":0.248}}', (t) => {
        const runner = new TinyGRunner();
        runner.on('sr', ({ line, vel, mots, dist, posx, posy, mpox, mpoy }) => {
            t.equal(line, 0);
            t.equal(vel, 688.81);
            t.equal(mots, 2);
            t.equal(dist, 1);
            t.equal(posx, 0.248);
            t.equal(posy, 0.248);
            t.equal(mpox, 0.248);
            t.equal(mpoy, 0.248);
            t.end();
        });

        const line = '{"sr":{"line":0,"vel":688.81,"mots":2,"dist":1,"posx":0.248,"posy":0.248,"mpox":0.248,"mpoy":0.248}}';
        runner.parse(line);
    });

    // active tool number
    t.test('{"sr":{"stat":4,"tool":3}}', (t) => {
        const runner = new TinyGRunner();
        runner.on('sr', ({ stat, tool }) => {
            t.equal(tool, 3);
            t.end();
        });

        const line = '{"sr":{"stat":4,"tool":3}}';
        runner.parse(line);
    });

    t.end();
});

test('TinyGParserResultSystemSettings', (t) => {
    t.test('{"r":{"sys":{"fb":100.19,"fbs":"100.19-17-g129b","fbc":"settings_othermill.h","fv":0.99,"hp":3,"hv":0,"id":"0084-7bd6-29c6-7bd","jt":0.75,"ct":0.01,"sl":0,"lim":1,"saf":1,"m48e":1,"mfoe":0,"mfo":1,"mtoe":0,"mto":1,"mt":2,"spep":1,"spdp":0,"spph":1,"spdw":1.5,"ssoe":0,"sso":1,"cofp":1,"comp":1,"coph":1,"tv":1,"ej":1,"jv":4,"qv":1,"sv":1,"si":100,"gpl":0,"gun":1,"gco":2,"gpa":2,"gdi":0}},"f":[1,0,9]}', (t) => {
        const runner = new TinyGRunner();
        runner.on('sys', ({ fv, fb, fbs, fbc, hp, hv, id, mfo, mto, sso }) => {
            t.equal(fv, 0.99);
            t.equal(fb, 100.19);
            t.equal(fbs, '100.19-17-g129b');
            t.equal(fbc, 'settings_othermill.h');
            t.equal(hp, 3);
            t.equal(hv, 0);
            t.equal(id, '0084-7bd6-29c6-7bd');
            t.equal(mfo, 1);
            t.equal(mto, 1);
            t.equal(sso, 1);
            t.end();
        });

        const line = '{"r":{"sys":{"fb":100.19,"fbs":"100.19-17-g129b","fbc":"settings_othermill.h","fv":0.99,"hp":3,"hv":0,"id":"0084-7bd6-29c6-7bd","jt":0.75,"ct":0.01,"sl":0,"lim":1,"saf":1,"m48e":1,"mfoe":0,"mfo":1,"mtoe":0,"mto":1,"mt":2,"spep":1,"spdp":0,"spph":1,"spdw":1.5,"ssoe":0,"sso":1,"cofp":1,"comp":1,"coph":1,"tv":1,"ej":1,"jv":4,"qv":1,"sv":1,"si":100,"gpl":0,"gun":1,"gco":2,"gpa":2,"gdi":0}},"f":[1,0,9]}';
        runner.parse(line);
    });

    t.end();
});

test('TinyGParserResultOverrides', (t) => {
    t.test('{"r":{"mfo":1.0,"mto":1.0,"sso":1.0},"f":[1,0,21]}', (t) => {
        const runner = new TinyGRunner();
        runner.on('ov', ({ mfo, mto, sso }) => {
            t.assert(mfo, 1.0);
            t.assert(mto, 1.0);
            t.assert(sso, 1.0);
            t.end();
        });

        const line = '{"r":{"mfo":1.0,"mto":1.0,"sso":1.0},"f":[1,0,21]}';
        runner.parse(line);
    });

    t.end();
});

test('TinyGParserResultReceiveReports', (t) => {
    t.test('{"r":{},"f":[1,0,4]}', (t) => {
        const runner = new TinyGRunner();
        runner.on('r', (r) => {
            t.same(r, {});
        });
        runner.on('f', (f) => {
            const [revision, statusCode, rxBufferInfo] = f;
            t.equal(revision, 1);
            t.equal(statusCode, 0);
            t.equal(rxBufferInfo, 4);
            t.end();
        });

        const line = '{"r":{},"f":[1,0,4]}';
        runner.parse(line);
    });

    t.end();
});
