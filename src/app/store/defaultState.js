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
                    'gcode', 'connection', 'console', 'tinyg'
                ]
            },
            secondary: {
                show: true,
                widgets: [
                    'axes', 'spindle', 'probe', 'macro'
                ]
            }
        },
        machineProfile: {
            id: '2e113b35-1073-4de4-b564-b807b945d80d',
            name: 'ideas-3040',
            limits: {
                xmin: 0,
                xmax: 299,
                ymin: 0,
                ymax: 399,
                zmin: 1,
                zmax: 80
            }
        }
    },
    widgets: {
        axes: {
            minimized: false,
            axes: ['x', 'y', 'z', 'a'],
            jog: {
                keypad: false,
                imperial: {
                    step: IMPERIAL_STEPS.indexOf(1), // Defaults to 1 inch
                    distances: []
                },
                metric: {
                    step: METRIC_STEPS.indexOf(1), // Defaults to 1 mm
                    distances: [
                        0.01,
                        0.1,
                        1,
                        10
                    ]
                }
            },
            mdi: {
                disabled: false
            },
            shuttle: {
                feedrateMin: 500,
                feedrateMax: 2500,
                hertz: 10,
                overshoot: 1
            }
        },
        connection: {
            minimized: true,
            controller: {
                type: 'TinyG' // Grbl|Marlin|Smoothie|TinyG
            },
            port: '/dev/ttyACM0', // will be deprecated in v2
            baudrate: 115200, // will be deprecated in v2
            connection: {
                type: 'serial',
                serial: {
                    // Hardware flow control (RTS/CTS)
                    rtscts: false
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
            speed: 10000
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
            cameraMode: 'rotate', // 'pan' or 'rotate'
            gcode: {
                displayName: true
            },
            objects: {
                limits: {
                    visible: true
                },
                coordinateSystem: {
                    visible: true
                },
                gridLineNumbers: {
                    visible: true
                },
                cuttingTool: {
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

            // The device id
            deviceId: '',

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
