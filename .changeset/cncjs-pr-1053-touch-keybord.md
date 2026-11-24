---
"cncjs": patch
---

Console: add an optional command input field, switched on and off with the keyboard button in the widget toolbar. The setting is off by default and saved per device, so it can be on for a tablet and off for a desktop.

- With the field shown (intended for tablets and phones): commands are typed into a single-line field below the terminal and sent with Send or Enter, and they are echoed in the terminal. The terminal shows output only, without a prompt or cursor, and does not open the on-screen keyboard when it is tapped or when a connection is made.
- With the field hidden (the default, e.g. on desktops): the terminal works as before, with commands typed directly at the prompt, including history and keyboard shortcuts. However, if desired the input field can be toggled also. 

