---
"cncjs": patch
---

Console widget: do not echo commands that a client marks with `echo: false`. Any client that sends a command with `{ echo: false }` in its context (for example a pendant or macro bridge that sends many small jogs) can keep it out of the Console. The command is still sent to the controller and still logged by the server. Commands without the flag are echoed as before.
