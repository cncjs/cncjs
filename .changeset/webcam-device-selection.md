---
"cncjs": patch
---

fix(webcam): use the selected camera and switch cameras without remounting

Fix Webcam camera selection and switch cameras without restarting the widget. Release shared streams when the last widget closes, discard outdated requests, and try video without audio when a microphone is unavailable.
