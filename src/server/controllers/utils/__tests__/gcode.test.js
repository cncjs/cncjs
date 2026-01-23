/* eslint-env jest */
import { replaceM6 } from '../gcode';

describe('replaceM6Commands', () => {
  test('replaces M6 commands with parentheses', () => {
    const gcode = `
      m6
      m06
      m006
      M6
      M06
      M006
      M60
      M060
      M6T1
      M6 T1
      M6 T1 ; comment
      M6T1(tool change)
      T1M6
      T1 M6
      T1M6T2
      M61Q1
      M61Q1T2M6
      M61Q1M6T2
      MM66
    `;

    const expectedOutput = `
      (m6)
      (m06)
      (m006)
      (M6)
      (M06)
      (M006)
      M60
      M060
      (M6)T1
      (M6) T1
      (M6) T1 ; comment
      (M6)T1(tool change)
      T1(M6)
      T1 (M6)
      T1(M6)T2
      M61Q1
      M61Q1T2(M6)
      M61Q1(M6)T2
      MM66
    `;

    const result = replaceM6(gcode, (x) => `(${x})`);
    expect(result).toEqual(expectedOutput);
  });
});
