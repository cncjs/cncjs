import {
    IMPERIAL_STEPS,
    METRIC_STEPS
} from '../constants';

const defaultState = {
    session: {
        name: '',
        token: ''
    },
    workspace: {
        container: {
            default: {
                widgets: ['visualizer']
            },
            primary: {
                show: true,
                widgets: [
                    'connection', 'console', 'grbl', 'marlin', 'smoothie', 'tinyg', 'webcam'
                ]
            },
            secondary: {
                show: true,
                widgets: [
                    'axes', 'gcode', 'macro', 'probe', 'spindle', 'laser'
                ]
            }
        }
    },
    widgets: {
        axes: {
            minimized: false,
            axes: ['x', 'y', 'z'],
            jog: {
                keypad: false,
                step: {
                    imperial: IMPERIAL_STEPS.indexOf((1 / 8)), // Defaults to 1/8 inches
                    metric: METRIC_STEPS.indexOf(1) // Defaults to 1 mm
                }
            },
            mdi: {
                disabled: false
            },
            shuttle: {
                feedrateMin: 500,
                feedrateMax: 2000,
                hertz: 10,
                overshoot: 1
            }
        },
        connection: {
            minimized: false,
            controller: {
                type: 'Grbl' // Grbl|Smoothie|TinyG
            },
            connection: {
                type: 'serial', // serial|socket
                serial: {
                    path: '',
                    baudRate: 115200,
                    // Hardware flow control (RTS/CTS)
                    rtscts: false
                },
                socket: {
                    host: '',
                    port: 23
                }
            },
            autoReconnect: true
        },
        console: {
            minimized: false
        },
        custom: {
            disabled: true,
            minimized: false,
            title: '',
            url: ''
        },
        gcode: {
            minimized: false
        },
        grbl: {
            minimized: false,
            panel: {
                queueReports: {
                    expanded: true
                },
                statusReports: {
                    expanded: true
                },
                modalGroups: {
                    expanded: true
                }
            }
        },
        laser: {
            minimized: false,
            panel: {
                laserTest: {
                    expanded: true
                }
            },
            test: {
                power: 0,
                duration: 0,
                maxS: 1000
            }
        },
        macro: {
            minimized: false
        },
        marlin: {
            minimized: false,
            panel: {
                heaterControl: {
                    expanded: true
                },
                statusReports: {
                    expanded: false
                },
                modalGroups: {
                    expanded: false
                }
            },
            heater: {
                // Filament          | PLA                | ABS
                // ----------------- | ------------------ | --------------------
                // Uses              | Consumer Products  | Functional Parts
                // Strength          | Medium             | Medium
                // Flexibility       | Low                | Medium
                // Durability        | Medium             | High
                // Print Temperature | 180-230°C          | 210-250°C
                // Bed Temperature   | 20-60°C (optional) | 80-110°C (mandatory)
                extruder: 180,
                heatedBed: 60
            }
        },
        probe: {
            minimized: false,
            probeCommand: 'G38.2',
            useTLO: false,
            probeDepth: 10,
            probeFeedrate: 20,
            touchPlateHeight: 10,
            retractionDistance: 4
        },
        smoothie: {
            minimized: false,
            panel: {
                statusReports: {
                    expanded: true
                },
                modalGroups: {
                    expanded: true
                }
            }
        },
        spindle: {
            minimized: false,
            speed: 1000
        },
        tinyg: {
            minimized: false,
            panel: {
                powerManagement: {
                    expanded: false
                },
                queueReports: {
                    expanded: true
                },
                statusReports: {
                    expanded: true
                },
                modalGroups: {
                    expanded: true
                }
            }
        },
        visualizer: {
            minimized: false,

            // 3D View
            disabled: false,
            projection: 'orthographic', // 'perspective' or 'orthographic'
            cameraMode: 'pan', // 'pan' or 'rotate'
            gcode: {
                displayName: true
            },
            objects: {
                coordinateSystem: {
                    visible: true
                },
                gridLineNumbers: {
                    visible: true
                },
                toolhead: {
                    visible: true
                }
            }
        },
        webcam: {
            disabled: true,
            minimized: false,

            // local - Use a built-in camera or a connected webcam
            // mjpeg - M-JPEG stream over HTTP
            mediaSource: 'local',

            // The URL field is required for the M-JPEG stream
            url: '',

            geometry: {
                scale: 1.0,
                rotation: 0, // 0: 0, 1: 90, 2: 180, 3: 270
                flipHorizontally: false,
                flipVertically: false
            },
            crosshair: false,
            muted: false
        }
    }
};

export default defaultState;
