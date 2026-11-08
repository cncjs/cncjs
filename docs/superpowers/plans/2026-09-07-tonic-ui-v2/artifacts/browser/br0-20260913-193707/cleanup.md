# Cleanup evidence

- The `yarn dev` process started for this attempt was interrupted with Ctrl-C.
- Its shutdown output reported graceful webpack shutdown, simulator stop, serial bridge shutdown, and server shutdown.
- Post-cleanup check: TCP ports 8000 and 8080 had no listening processes.
- Post-cleanup check: `/tmp/ttyGRBL` was absent.
- No source, status, handoff, execution-log, package, or commit files were modified.
