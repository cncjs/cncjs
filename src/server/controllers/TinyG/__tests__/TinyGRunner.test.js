/* eslint-env jest */
import TinyGRunner from '../TinyGRunner';

describe('TinyGRunner', () => {
  describe('motor timeout', () => {
    test('should parse motor timeout response', () => {
      return new Promise((resolve) => {
        const runner = new TinyGRunner();
        runner.on('mt', (mt) => {
          expect(mt).toEqual(2);
          resolve();
        });

        runner.parse('{"r":{"mt":2},"f":[1,0,8]}');
      });
    });
  });

  describe('power management', () => {
    test('should parse power management response', () => {
      return new Promise((resolve) => {
        const runner = new TinyGRunner();
        runner.on('pwr', (pwr) => {
          expect(pwr).toEqual({ '1': 0, '2': 0, '3': 0, '4': 0 });
          resolve();
        });

        runner.parse('{"r":{"pwr":{"1":0,"2":0,"3":0,"4":0}},"f":[1,0,9]}');
      });
    });
  });

  describe('queue reports', () => {
    test('should parse simple queue report', () => {
      return new Promise((resolve) => {
        const runner = new TinyGRunner();

        runner.on('qr', ({ qr, qi, qo }) => {
          expect(qr).toEqual(48);
          expect(qi).toEqual(0);
          expect(qo).toEqual(0);
          resolve();
        });

        runner.parse('{"qr":48}');
      });
    });

    test('should parse detailed queue report', () => {
      return new Promise((resolve) => {
        const runner = new TinyGRunner();

        runner.on('qr', ({ qr, qi, qo }) => {
          expect(qr).toEqual(32);
          expect(qi).toEqual(0);
          expect(qo).toEqual(1);
          resolve();
        });

        runner.parse('{"r":{"qr":32,"qi":0,"qo":1},"f":[1,0,8]}');
      });
    });
  });

  describe('status reports', () => {
    test('should parse status report with line and state', () => {
      return new Promise((resolve) => {
        const runner = new TinyGRunner();
        runner.on('sr', ({ line, stat, cycs, mots }) => {
          expect(line).toEqual(8);
          expect(stat).toEqual(5);
          expect(cycs).toEqual(1);
          expect(mots).toEqual(1);
          resolve();
        });

        runner.parse('{"sr":{"line":8,"stat":5,"cycs":1,"mots":1}}');
      });
    });

    test('should parse status report with position data', () => {
      return new Promise((resolve) => {
        const runner = new TinyGRunner();
        runner.on('sr', ({ line, vel, mots, dist, posx, posy, mpox, mpoy }) => {
          expect(line).toEqual(0);
          expect(vel).toEqual(688.81);
          expect(mots).toEqual(2);
          expect(dist).toEqual(1);
          expect(posx).toEqual(0.248);
          expect(posy).toEqual(0.248);
          expect(mpox).toEqual(0.248);
          expect(mpoy).toEqual(0.248);
          resolve();
        });

        runner.parse('{"sr":{"line":0,"vel":688.81,"mots":2,"dist":1,"posx":0.248,"posy":0.248,"mpox":0.248,"mpoy":0.248}}');
      });
    });

    test('should parse active tool number', () => {
      return new Promise((resolve) => {
        const runner = new TinyGRunner();
        runner.on('sr', ({ tool }) => {
          expect(tool).toEqual(3);
          resolve();
        });

        runner.parse('{"sr":{"stat":4,"tool":3}}');
      });
    });
  });

  describe('system settings', () => {
    test('should parse comprehensive system settings', () => {
      return new Promise((resolve) => {
        const runner = new TinyGRunner();
        runner.on('sys', ({ fv, fb, fbs, fbc, hp, hv, id, mfo, mto, sso }) => {
          expect(fv).toEqual(0.99);
          expect(fb).toEqual(100.19);
          expect(fbs).toEqual('100.19-17-g129b');
          expect(fbc).toEqual('settings_othermill.h');
          expect(hp).toEqual(3);
          expect(hv).toEqual(0);
          expect(id).toEqual('0084-7bd6-29c6-7bd');
          expect(mfo).toEqual(1);
          expect(mto).toEqual(1);
          expect(sso).toEqual(1);
          resolve();
        });

        runner.parse('{"r":{"sys":{"fb":100.19,"fbs":"100.19-17-g129b","fbc":"settings_othermill.h","fv":0.99,"hp":3,"hv":0,"id":"0084-7bd6-29c6-7bd","jt":0.75,"ct":0.01,"sl":0,"lim":1,"saf":1,"m48e":1,"mfoe":0,"mfo":1,"mtoe":0,"mto":1,"mt":2,"spep":1,"spdp":0,"spph":1,"spdw":1.5,"ssoe":0,"sso":1,"cofp":1,"comp":1,"coph":1,"tv":1,"ej":1,"jv":4,"qv":1,"sv":1,"si":100,"gpl":0,"gun":1,"gco":2,"gpa":2,"gdi":0}},"f":[1,0,9]}');
      });
    });
  });

  describe('overrides', () => {
    test('should parse override values', () => {
      return new Promise((resolve) => {
        const runner = new TinyGRunner();
        runner.on('ov', ({ mfo, mto, sso }) => {
          expect(mfo).toEqual(1.0);
          expect(mto).toEqual(1.0);
          expect(sso).toEqual(1.0);
          resolve();
        });

        runner.parse('{"r":{"mfo":1.0,"mto":1.0,"sso":1.0},"f":[1,0,21]}');
      });
    });
  });

  describe('receive reports', () => {
    test('should parse receive report with footer', () => {
      return new Promise((resolve) => {
        const runner = new TinyGRunner();
        runner.on('r', (r) => {
          expect(r).toEqual({});
        });
        runner.on('f', (f) => {
          const [revision, statusCode, rxBufferInfo] = f;
          expect(revision).toEqual(1);
          expect(statusCode).toEqual(0);
          expect(rxBufferInfo).toEqual(4);
          resolve();
        });

        runner.parse('{"r":{},"f":[1,0,4]}');
      });
    });
  });
});
