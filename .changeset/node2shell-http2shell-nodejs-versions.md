---
"cncjs": patch
---

fix: require a Node.js version with the CVE-2026-111497 (Node2Shell / HTTP2Shell) fix

CVE-2026-111497 is reported as Node2Shell, HTTP2Shell, and Broccoli2Shell. They name the same defect: the Brotli decoder bundled with Node.js writes past the end of an eight-byte internal buffer, because an invalid block switch is reported as a temporary need for more input instead of a permanent format error. The write corrupts process memory and can run arbitrary code. "HTTP2Shell" describes how the stream arrives: a crafted compressed message body delivered over HTTP. Brotli 1.0.3 through 1.2.0 are affected. Node.js fixed it on 2026-10-21 in 22.23.4, 24.22.1, and 26.12.1. Release lines already past end of life on that date received no fix.

CNCjs is not a Brotli decoder. `yarn.lock` contains no Brotli package, and no CNCjs dependency decompresses an HTTP request body or response body. The exposure is the runtime the server runs inside: any code path in CNCjs, a plugin, or a dependency added later that calls the Brotli API in `node:zlib` reaches the flaw.

- `engines.node` is now `^22.23.4 || ^24.22.1 || >=26.12.1`. Each caret entry stops at its own major version, so 23.x and 25.x stay excluded. `grbl-simulator` uses the same range.
- The Docker image pinned an end-of-life Node.js build that shipped the unpatched decoder. Both stages now install v24.22.2.
- CI already resolves the newest patch release of a supported line (`node-version: 24.x` in `ci.yml`, `node-version: 24` in `ci-docker-hub.yml` and `ci-release.yml`), so no extra version gate is added.
- README lists the supported versions, the minimum patch release for each line, and the reason.

The desktop app keeps Electron 22 and the Node.js runtime bundled inside it. `engines.node` does not reach that runtime. Electron 45.2.3, 44.10.2, and 43.8.7 bundle a Node.js version with the fix. The upgrade, and the end of armv7l desktop packages that Electron 44 brings, are tracked in #1031.
