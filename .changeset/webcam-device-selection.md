---
"cncjs": patch
---

fix(webcam): use the selected camera and switch cameras without remounting

Fix Webcam camera selection and switch cameras without restarting the widget. Each Webcam instance releases its own stream when its device changes or it closes, discards outdated requests, and tries video without audio when a microphone is unavailable.
