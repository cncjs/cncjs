---
"cncjs": patch
---

feat(watch): add rename and delete for files in the watch directory

`DELETE /api/watch/file` removes a file from the watched directory and `POST /api/watch/file/rename` renames one within it. Both act on plain files only and refuse a name containing directory components rather than stripping it, so they cannot act on a file outside the watched directory. Renaming refuses to overwrite an existing target and answers 409 instead. Symbolic links are refused rather than followed, and renaming falls back to an exclusive copy on filesystems without hard-link support.
