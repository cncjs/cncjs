---
"cncjs": patch
---

fix(grbl): parse and maintain `Pn:` and `A:` status fields

The Grbl status parser now supports the letter-valued status fields introduced in Grbl v1.1 while preserving legacy Grbl 0.9 parsing:

- `Pn:<letters>` input pin states and `A:<letters>` accessory states are parsed without broadening comma-separated numeric fields, so v0.9 field boundaries remain unchanged.
- When Grbl omits `Pn:`, `pinState` is cleared because no input pin is active.
- `A:` is treated as a snapshot only when Grbl reports `Ov:`. It is preserved between override refreshes, and cleared when the next `Ov:` report omits `A:` because all accessories are off.
