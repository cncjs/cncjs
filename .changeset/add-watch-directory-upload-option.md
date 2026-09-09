---
"cncjs": patch
---

feat: add support for uploading files to the watch directory

Rework the Watch Directory modal: add an "Add" button and a dropzone to upload files to the configured watch directory, with an upload progress indicator. The file tree updates in real time via server push events and also provides a Refresh button.
