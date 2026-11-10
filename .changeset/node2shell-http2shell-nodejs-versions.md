---
"cncjs": minor
---

fix: require a Node.js version with the CVE-2026-111497 (Node2Shell / HTTP2Shell) fix, and end 32-bit ARM packages

CVE-2026-111497 is reported as Node2Shell, HTTP2Shell, and Broccoli2Shell. They name the same defect: the Brotli decoder bundled with Node.js writes past the end of an eight-byte internal buffer, because an invalid block switch is reported as a temporary need for more input instead of a permanent format error. The write corrupts process memory and can run arbitrary code. "HTTP2Shell" describes how the stream arrives: a crafted compressed message body delivered over HTTP. Brotli 1.0.3 through 1.2.0 are affected. Node.js fixed it on 2026-10-21 in 24.22.1 and 26.12.1.

CNCjs is not a Brotli decoder. `yarn.lock` contains no Brotli package, and no CNCjs dependency decompresses an HTTP request body or response body. The exposure is the runtime the server runs inside: any code path in CNCjs, a plugin, or a dependency added later that calls the Brotli API in `node:zlib` reaches the flaw.

- `engines.node` is now `^24.22.1 || >=26.12.1`. `grbl-simulator` uses the same range.
- The Docker image pinned an end-of-life Node.js build that shipped the unpatched decoder. Both stages now install v24.22.2 on Debian 13 (trixie); Debian 11 left LTS on 2026-08-31.
- armv7l (32-bit ARM) is no longer a target, because 24 and 26 publish no armv7l binaries. `build:linux` builds x64 and ARM64, `build:linux-armv7l` is removed, CI no longer packages or checks armv7l output, and the `ARM_VERSION=7` workaround in `src/main.js` that only the 32-bit ARM desktop build needed is gone.
- CI already resolves the newest patch release of a supported line (`node-version: 24.x` in `ci.yml`, `node-version: 24` in `ci-docker-hub.yml` and `ci-release.yml`), so no extra version gate is added.
- README lists the supported versions, the minimum patch release for each line, and the reason.

The desktop app bundles its own Node.js runtime, and `engines.node` does not reach it. That runtime is still unpatched; its upgrade is tracked in #1031.
