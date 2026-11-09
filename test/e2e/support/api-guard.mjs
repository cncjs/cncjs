// Page-specific routes may fulfill mocks before this context-level policy runs.
export async function installApiGuard(context, baseURL, gcodeUploadPolicy) {
  const forbiddenWrites = [];
  const origin = new URL(baseURL).origin;
  await context.route('**/api/**', route => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    if (['GET', 'HEAD', 'OPTIONS'].includes(method) ||
        (url.origin === origin && method === 'POST' &&
        ['/api/signin', '/api/watch/files', '/api/watch/file'].includes(url.pathname))) {
      return route.continue();
    }
    if (method === 'POST' && url.pathname === '/api/gcode' &&
        url.origin === origin && gcodeUploadPolicy.ident) {
      try {
        if (request.postDataJSON()?.ident === gcodeUploadPolicy.ident) {
          return route.continue();
        }
      } catch {
        // Malformed or missing request bodies are forbidden writes.
      }
    }
    forbiddenWrites.push(`${method} ${url.pathname}`);
    return route.abort('blockedbyclient');
  });
  return forbiddenWrites;
}
