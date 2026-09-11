---
"cncjs": patch
---

fix(grbl): populate and clear the `Pn:` input pin state

The Grbl status parser never populated `pinState`, so probe and limit pin state was unavailable to clients. Two defects, both fixed here:

- The status tokenizer only accepted numeric values after `:`, so letter-valued fields such as `Pn:X` / `Pn:PZ` (and `A:SFM`) never matched and `result.Pn` was never set — leaving the existing `if (_.has(result, 'Pn'))` branch unreachable.
- Grbl omits `Pn:` entirely when no pin is active, so merging the payload over the previous state inherited the old value and a pin latched on forever after a single trigger.
