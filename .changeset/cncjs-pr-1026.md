---
"cncjs": patch
---

fix(visualizer): preserve and remember the selected camera view

Loading a G-code file or closing it resets the 3D camera to the default top-down view through the trackball controls, but the toolbar selection did not change, so the highlighted button (for example 3D View) no longer matched the scene and the view had to be re-selected by clicking another view first. The Visualizer now re-applies the view selected in the toolbar after a load, an unload and when the widget mounts, so the scene follows the selection.

The selected view (Top, Front, Right, Left or 3D) is now saved in the widget settings and restored when the app is opened again, instead of always starting on Top View. Unknown saved values fall back to Top View. Closing the serial port no longer switches the view back to Top.
