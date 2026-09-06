---
"cncjs": patch
---

fix(autolevel): store probe measurements at the intended grid node's XY

Record every autolevel probe measurement at the intended grid node's XY instead of the machine-reported XY, which is quantised by the motor steps and splits grid lines into near-duplicates.
