---
"cncjs": patch
---

feat(autolevel): add scan pattern and scan direction options

The scan pattern (Raster, Zigzag, Spiral In, Spiral Out) and scan direction (Along X Axis, Along Y Axis) set the order in which probe points are visited. The grid, point count and probing remain unchanged, and the defaults retain the previous row-by-row order. The probe area diagram and 3D overlay mark the first and last point of the selected path.
