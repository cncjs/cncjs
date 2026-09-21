---
"cncjs": patch
---

feat(watch): stream raw uploads to the watch directory instead of buffering them

`PUT /api/watch/file` now accepts a raw request body and streams it straight to disk, so large G-code programs no longer have to be held in memory as a JSON string. Sending a JSON body is unchanged; when the body is not JSON the file name is taken from the `file` query parameter. The streamed write goes to a temporary name and is renamed into place on completion, so a partially written file never appears under its final name inside the watched directory. Streamed uploads are bounded by a new `middleware.upload.maxFileSize` setting (256MB, matching the JSON body limit) and answer 413 when exceeded.
