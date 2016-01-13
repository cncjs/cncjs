// https://github.com/grbl/grbl/wiki/Configuring-Grbl-v0.9
// http://linuxcnc.org/docs/html/gcode/overview.html#cap:modal-groups
export const GRBL_MODAL_GROUPS = [
    { // Motion Mode (Defaults to G0)
        group: 'motion',
        modes: ['G0', 'G1', 'G2', 'G3', 'G38.2', 'G38.3', 'G38.4', 'G38.5', 'G80']
    },
    { // Coordinate System Select (Defaults to G54)
        group: 'coordinate',
        modes: ['G54', 'G55', 'G56', 'G57', 'G58', 'G59']
    },
    { // Plane Select (Defaults to G17)
        group: 'plane',
        modes: ['G17', 'G18', 'G19']
    },
    { // Units Mode (Defaults to G21)
        group: 'units',
        modes: ['G20', 'G21']
    },
    { // Distance Mode (Defaults to G90)
        group: 'distance',
        modes: ['G90', 'G91']
    },
    { // Feed Rate Mode (Defaults to G94)
        group: 'feedrate',
        modes: ['G93', 'G94']
    },
    { // Program Mode (Defaults to M0)
        group: 'program',
        modes: ['M0', 'M1', 'M2', 'M30']
    },
    { // Spindle State (Defaults to M5)
        group: 'spindle',
        modes: ['M3', 'M4', 'M5']
    },
    { // Coolant State (Defaults to M9)
        group: 'coolant',
        modes: ['M7', 'M8', 'M9']
    }
];
