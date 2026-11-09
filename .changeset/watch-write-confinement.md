---
"cncjs": patch
---

fix(watch): keep watch-directory writes inside the directory and stop restreamed uploads from stalling

Writing a file now stages inside the watched directory and renames into place, so a destination that is a symbolic link or a hard link is replaced rather than written through: the bytes can no longer land in a file outside the directory. The staging name is random and claimed exclusively, so a staging path prepared in advance is refused instead of redirecting the write.

Raw uploads are no longer re-streamed by `connect-restreamer`: re-emitting the empty body of a request the parsers never read appended a literal `{}` to the upload and ended its stream early, which corrupted the file and left the upload unfinished. Only bodies a parser consumed are re-streamed now.

The minimum supported Node.js version is now 22.23.4, 24.22.1 or 26.12.1, the first releases of each line with the fix for CVE-2026-111497 (Node2Shell, an out-of-bounds write in the bundled Brotli decoder). Node.js 20 and older lines do not receive that fix.
