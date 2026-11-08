import { isWebGLWarningSuppressed } from '../webglWarning';

describe('WebGL warning visibility', () => {
  const originalValue = process.env.SUPPRESS_WEBGL_WARNING;

  afterEach(() => {
    if (originalValue === undefined) {
      delete process.env.SUPPRESS_WEBGL_WARNING;
    } else {
      process.env.SUPPRESS_WEBGL_WARNING = originalValue;
    }
  });

  test('suppresses the warning only when explicitly enabled', () => {
    process.env.SUPPRESS_WEBGL_WARNING = '1';
    expect(isWebGLWarningSuppressed()).toBe(true);

    process.env.SUPPRESS_WEBGL_WARNING = '0';
    expect(isWebGLWarningSuppressed()).toBe(false);
  });
});
