; Screenshot fixture for the visualizer.
;
; Deliberately exercises every branch of the toolpath geometry builder, so a
; single baseline image covers rapids, cuts, arc interpolation on all three
; planes and more than one depth. Kept small enough to stay legible at the
; default zoom: everything lives inside 80 x 60 mm.
G21 G90 G17
G0 Z5

; --- Rapid out to the start, then a closed rectangle at the first depth ---
G0 X10 Y10
G1 Z-1 F200
G1 X70 Y10 F600
G1 X70 Y50
G1 X10 Y50
G1 X10 Y10
G0 Z5

; --- Rapid across the middle, then a full circle (start angle = end angle) ---
G0 X40 Y30
G1 Z-2 F200
G2 X40 Y30 I10 J0 F600
G0 Z5

; --- Two clockwise/counter-clockwise quarter arcs at a third depth ---
G0 X20 Y20
G1 Z-3 F200
G3 X30 Y30 I10 J0 F600
G2 X40 Y40 I10 J0
G1 X60 Y40
G0 Z5

; --- One arc out of the XY plane, so the G18 branch is drawn too ---
G18
G0 X20 Y45
G1 Z-1 F200
G2 X40 Z-1 I10 K0 F600
G17
G0 Z5

G0 X0 Y0
