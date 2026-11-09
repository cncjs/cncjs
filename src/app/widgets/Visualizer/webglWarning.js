export const isWebGLWarningSuppressed = () => (
  process.env.SUPPRESS_WEBGL_WARNING === '1'
);
