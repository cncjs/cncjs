/**
 * Grbl v1.1 Simulator
 * Simulates a Grbl CNC controller for testing and development
 * Based on https://github.com/gnea/grbl
 */

// Grbl Settings Constants
const SETTINGS = {
    STEP_PULSE_TIME: 0,
    STEP_IDLE_DELAY: 1,
    STEP_PULSE_INVERT: 2,
    STEP_DIR_INVERT: 3,
    STEP_ENABLE_INVERT: 4,
    LIMIT_PINS_INVERT: 5,
    PROBE_PIN_INVERT: 6,
    STATUS_REPORT_MASK: 10,
    JUNCTION_DEVIATION: 11,
    ARC_TOLERANCE: 12,
    REPORT_INCHES: 13,
    SOFT_LIMITS_ENABLE: 20,
    HARD_LIMITS_ENABLE: 21,
    HOMING_ENABLE: 22,
    HOMING_DIR_INVERT: 23,
    HOMING_FEED: 24,
    HOMING_SEEK: 25,
    HOMING_DEBOUNCE: 26,
    HOMING_PULLOFF: 27,
    SPINDLE_RPM_MAX: 30,
    SPINDLE_RPM_MIN: 31,
    LASER_MODE: 32,
    X_STEPS_PER_MM: 100,
    Y_STEPS_PER_MM: 101,
    Z_STEPS_PER_MM: 102,
    X_MAX_RATE: 110,
    Y_MAX_RATE: 111,
    Z_MAX_RATE: 112,
    X_ACCELERATION: 120,
    Y_ACCELERATION: 121,
    Z_ACCELERATION: 122,
    X_MAX_TRAVEL: 130,
    Y_MAX_TRAVEL: 131,
    Z_MAX_TRAVEL: 132
};

/**
 * Get default motion state
 * @returns {object} New motion state object
 */
function getDefaultMotionState() {
    return {
        active: false,
        type: 'linear',
        startTime: 0,
        endTime: 0,
        startPosition: { x: 0, y: 0, z: 0 },
        endPosition: { x: 0, y: 0, z: 0 },
        currentFeedRate: 0,
        data: null,
    };
}

class GrblSimulator {
    // Constants
    static VERSION = '1.1h';
    static BUILD_DATE = '20180617';

    // Private fields
    #machineState = 'Idle'; // Idle, Run, Hold, Jog, Alarm, Door, Check, Home, Sleep

    #motionState = getDefaultMotionState();

    #receiveBuffer = {
        size: 128, // RX buffer size in characters
        used: 0, // Current buffer usage
        queue: [] // Queue of received lines awaiting acknowledgment [{line, length}]
    };

    #plannerBuffer = {
        size: 15, // Number of planner blocks
        queue: [], // Commands queued for execution
        executing: null // Currently executing command
    };

    #waitingQueue = [];

    constructor() {
        // System state
        this.alarmCode = 0;

        // Machine position (absolute machine coordinates)
        this.machinePosition = { x: 0, y: 0, z: 0 };
        this.workPosition = { x: 0, y: 0, z: 0 };

        // Work coordinate systems (G54-G59)
        // WCS offsets: MPos = WPos + WCS + G92
        this.workCoordinateOffsets = {
            'G54': { x: 0, y: 0, z: 0 },
            'G55': { x: 0, y: 0, z: 0 },
            'G56': { x: 0, y: 0, z: 0 },
            'G57': { x: 0, y: 0, z: 0 },
            'G58': { x: 0, y: 0, z: 0 },
            'G59': { x: 0, y: 0, z: 0 }
        };
        this.activeWCS = 'G54';

        // G92 coordinate offset
        this.g92Offset = { x: 0, y: 0, z: 0 };

        // Parser state (modal groups)
        this.parserState = {
            motion: 'G0', // G0, G1, G2, G3, G38.2, G38.3, G38.4, G38.5, G80
            coordinate: 'G54', // G54, G55, G56, G57, G58, G59
            plane: 'G17', // G17, G18, G19
            distance: 'G90', // G90, G91
            feedRate: 'G94', // G93, G94
            units: 'G21', // G20, G21
            cutterComp: 'G40', // G40
            toolLength: 'G49', // G43.1, G49
            program: 'M0', // M0, M1, M2, M30
            spindle: 'M5', // M3, M4, M5
            coolant: 'M9', // M7, M8, M9
        };

        // Settings (default generic values from Grbl)
        // Using named constants for better readability
        this.settings = {
            [SETTINGS.STEP_PULSE_TIME]: 10,
            [SETTINGS.STEP_IDLE_DELAY]: 25,
            [SETTINGS.STEP_PULSE_INVERT]: 0,
            [SETTINGS.STEP_DIR_INVERT]: 0,
            [SETTINGS.STEP_ENABLE_INVERT]: 0,
            [SETTINGS.LIMIT_PINS_INVERT]: 0,
            [SETTINGS.PROBE_PIN_INVERT]: 0,
            [SETTINGS.STATUS_REPORT_MASK]: 1,
            [SETTINGS.JUNCTION_DEVIATION]: 0.010,
            [SETTINGS.ARC_TOLERANCE]: 0.002,
            [SETTINGS.REPORT_INCHES]: 0,
            [SETTINGS.SOFT_LIMITS_ENABLE]: 0,
            [SETTINGS.HARD_LIMITS_ENABLE]: 0,
            [SETTINGS.HOMING_ENABLE]: 0,
            [SETTINGS.HOMING_DIR_INVERT]: 0,
            [SETTINGS.HOMING_FEED]: 25.0,
            [SETTINGS.HOMING_SEEK]: 500.0,
            [SETTINGS.HOMING_DEBOUNCE]: 250,
            [SETTINGS.HOMING_PULLOFF]: 1.0,
            [SETTINGS.SPINDLE_RPM_MAX]: 1000,
            [SETTINGS.SPINDLE_RPM_MIN]: 0,
            [SETTINGS.LASER_MODE]: 0,
            [SETTINGS.X_STEPS_PER_MM]: 250.0,
            [SETTINGS.Y_STEPS_PER_MM]: 250.0,
            [SETTINGS.Z_STEPS_PER_MM]: 250.0,
            [SETTINGS.X_MAX_RATE]: 500.0,
            [SETTINGS.Y_MAX_RATE]: 500.0,
            [SETTINGS.Z_MAX_RATE]: 500.0,
            [SETTINGS.X_ACCELERATION]: 10.0,
            [SETTINGS.Y_ACCELERATION]: 10.0,
            [SETTINGS.Z_ACCELERATION]: 10.0,
            [SETTINGS.X_MAX_TRAVEL]: 200.0,
            [SETTINGS.Y_MAX_TRAVEL]: 200.0,
            [SETTINGS.Z_MAX_TRAVEL]: 200.0
        };

        // Runtime state
        this.feedRate = 0;
        this.spindleSpeed = 0;
        this.laserPower = 0; // Current laser power output (0-100%)

        // Overrides
        this.feedOverride = 100;
        this.rapidOverride = 100;
        this.spindleOverride = 100;

        // Probe state
        this.probePosition = { x: 0, y: 0, z: 0 };
        this.probeSuccess = false;
        this.probeTriggered = false; // Simulated probe pin state (can be set for testing)

        // Start planner executor
        this.startPlannerExecutor();
    }

    /**
     * Get machine state
     * @returns {string} Current machine state
     */
    get machineState() {
        return this.#machineState;
    }

    /**
     * Set machine state
     * @param {string} state - New machine state
     */
    set machineState(state) {
        this.#machineState = state;

        // Update laser power when machine state changes (for Hold/Door safety shutoff)
        this.updateLaserPower();
    }

    /**
     * Get motion state
     * @returns {object} Current motion state
     */
    get motionState() {
        return this.#motionState;
    }

    /**
     * Get receive buffer
     * @returns {object} Receive buffer state
     */
    get receiveBuffer() {
        return this.#receiveBuffer;
    }

    /**
     * Get planner buffer
     * @returns {object} Planner buffer state
     */
    get plannerBuffer() {
        return this.#plannerBuffer;
    }

    /**
     * Get waiting queue
     * @returns {Array} Waiting queue
     */
    get waitingQueue() {
        return this.#waitingQueue;
    }

    /**
     * Set motion state (React-like setState pattern)
     * Automatically updates motion-dependent state (laser power, etc.)
     * @param {object} updates - Properties to update
     */
    setMotionState(updates) {
        Object.assign(this.#motionState, updates);

        // Update laser power based on new motion state
        this.updateLaserPower();
    }

    /**
     * Reset motion to default state
     */
    resetMotionState() {
        this.#motionState = getDefaultMotionState();

        // Update laser power after motion reset
        this.updateLaserPower();
    }

    /**
     * Implements Grbl v1.1 laser mode behavior:
     * - $32=0: Laser mode disabled (spindle behaves normally)
     * - $32=1: Laser mode enabled with special behaviors:
     *   - G0 rapid moves turn laser off
     *   - G1/G2/G3 feed moves: M3 = constant power, M4 = dynamic power
     *   - Feed hold/Door state turns laser off immediately
     *   - S0 turns laser off without stopping motion
     */
    updateLaserPower() {
        const laserMode = this.settings[SETTINGS.LASER_MODE] === 1;
        const spindleOn = this.parserState.spindle === 'M3' || this.parserState.spindle === 'M4';

        // Turn off laser if not in laser mode or spindle is off (M5)
        if (!laserMode || !spindleOn) {
            this.laserPower = 0;
            return;
        }

        // S0 turns off laser (even if M3/M4 is active)
        if (this.spindleSpeed === 0) {
            this.laserPower = 0;
            return;
        }

        // Turn off laser during Hold or Door states (immediate safety shutoff)
        if (this.machineState === 'Hold' || this.machineState === 'Door') {
            this.laserPower = 0;
            return;
        }

        // Turn off laser if no motion is active
        if (!this.#motionState.active) {
            this.laserPower = 0;
            return;
        }

        // Determine if motion is laser-enabled (G1, G2, G3)
        const laserEnabledMotion = ['G1', 'G2', 'G3'].includes(this.parserState.motion);

        if (!laserEnabledMotion) {
            // G0 (rapid), G80 (cancel), G38.x (probe) disable laser
            this.laserPower = 0;
        } else if (this.parserState.spindle === 'M3') {
            // M3: Constant power mode - laser at programmed S-value
            this.laserPower = this.spindleSpeed;
        } else if (this.parserState.spindle === 'M4') {
            // M4: Dynamic power mode - laser power scales with actual speed
            // In M4, laser turns off when not moving
            // For the simulator, we approximate this with motion state
            this.laserPower = this.spindleSpeed;
        }
    }

    /**
     * Start the planner executor loop
     * This runs continuously to execute queued commands
     */
    startPlannerExecutor() {
        setInterval(() => {
            this.executePlannerQueue();
        }, 10); // Check every 10ms
    }

    /**
     * Execute commands from the planner queue
     */
    executePlannerQueue() {
        // Debug logging (can be enabled with DEBUG_PLANNER env var)
        const debug = process.env.DEBUG_PLANNER === '1';

        // Update current motion state
        if (this.#motionState.active) {
            const now = Date.now();

            // Check soft limits during execution (only if enabled)
            if (this.settings[SETTINGS.SOFT_LIMITS_ENABLE] === 1) {
                const currentPos = this.getCurrentPosition();
                const softLimitCheck = this.checkSoftLimits(currentPos);

                if (softLimitCheck.exceeded) {
                    // Soft limit hit during motion - trigger alarm!
                    if (debug) {
                        console.log('[PLANNER] SOFT LIMIT EXCEEDED on axis:', softLimitCheck.axis);
                    }
                    this.machineState = 'Alarm';
                    this.alarmCode = 2;
                    this.setMotionState({ active: false });
                    this.#plannerBuffer.queue = []; // Clear remaining commands
                    this.#plannerBuffer.executing = null;
                    // Note: In real scenario, server should send ALARM:2 message
                    return;
                }
            }

            if (now >= this.#motionState.endTime) {
                // Current motion complete
                if (debug) {
                    console.log('[PLANNER] Motion complete, updating position to:', this.#motionState.endPosition);
                }
                this.machineState = 'Idle';
                this.machinePosition = { ...this.#motionState.endPosition };
                this.updateWorkPosition();
                this.resetMotionState();

                // Free planner block
                if (this.#plannerBuffer.executing) {
                    this.#plannerBuffer.executing = null;
                }
            }
        }

        // Start next command if nothing is executing
        if (!this.#motionState.active && this.#plannerBuffer.queue.length > 0) {
            const nextCommand = this.#plannerBuffer.queue.shift();
            this.#plannerBuffer.executing = nextCommand;

            // Execute the command
            nextCommand.execute();
        }

        // Process waiting commands if planner has space
        while (this.#waitingQueue.length > 0) {
            const plannerUsed = this.#plannerBuffer.queue.length + (this.#plannerBuffer.executing ? 1 : 0);
            if (plannerUsed < this.#plannerBuffer.size) {
                // Space available - process next waiting command
                const waiting = this.#waitingQueue.shift();
                if (debug) {
                    console.log('[PLANNER] Processing waiting command:', waiting.line.substring(0, 40));
                }

                // Process the line (will add to planner queue)
                const result = this.processLine(waiting.line);

                // Send response
                if (typeof result === 'string') {
                    waiting.callback(result);
                } else if (result && result.waitForPlannerEmpty) {
                    // Handle dwell
                    const waitForPlannerEmpty = () => {
                        const plannerEmpty = this.#plannerBuffer.queue.length === 0 && !this.#motionState.active;
                        if (plannerEmpty) {
                            setTimeout(() => waiting.callback('ok\r\n'), result.duration);
                        } else {
                            setTimeout(waitForPlannerEmpty, 10);
                        }
                    };
                    waitForPlannerEmpty();
                } else if (result && result.waitForCompletion) {
                    waiting.callback('ok\r\n');
                } else if (result && result.error) {
                    waiting.callback(result.error);
                } else {
                    waiting.callback('ok\r\n');
                }
            } else {
                // Still full - stop processing waiting queue
                break;
            }
        }
    }

    /**
     * Process a line asynchronously (Real Grbl behavior)
     * Waits for planner buffer space, then sends 'ok' after queueing
     * @param {string} line - Input command line
     * @param {function} callback - Called with response (must be string)
     */
    processLineAsync(line, callback) {
        // Detect if this is a motion command that uses planner buffer
        // From Grbl source (motion_control.c), only these call mc_line() and use planner:
        // - G0, G1, G2, G3 WITH axis words (X, Y, or Z)
        // - G28, G30 (pre-defined position moves)
        // - G38.x (probing)
        // - $J (jogging)
        const upperLine = line.trim().toUpperCase();

        // Check for jogging
        const isJogCmd = line.startsWith('$J');

        // Check for G28/G30 (always use planner)
        const isG2830 = /\b(G28|G30)\b/.test(upperLine);

        // Check for G38.x probing (always use planner)
        const isG38 = /\bG38\.[2-5]\b/.test(upperLine);

        // Check for G0/G1/G2/G3 WITH axis words
        const hasAxisWords = /[XYZ]-?[\d.]+/.test(upperLine);
        const isG0123WithAxis = /\b(G0+[0-3]|G[0-3])\b/.test(upperLine) && hasAxisWords;

        // Command uses planner buffer if it's one of these
        const isMotionCmd = isJogCmd || isG2830 || isG38 || isG0123WithAxis;

        if (isMotionCmd) {
            const plannerUsed = this.#plannerBuffer.queue.length + (this.#plannerBuffer.executing ? 1 : 0);
            if (plannerUsed >= this.#plannerBuffer.size) {
                // Buffer full - add to waiting queue to maintain FIFO order
                this.#waitingQueue.push({ line: line, callback: callback });
                return; // Don't process yet - will be processed when space available
            }
        }

        // Process the command now (buffer has space or non-motion command)
        const result = this.processLine(line);

        // Handle different result types
        if (typeof result === 'string') {
            // String response (ok, error, feedback message)
            callback(result);
        } else if (result && result.isDwell) {
            // G4 Dwell: Wait for planner to empty, then delay, then send ok
            const waitForPlannerEmpty = () => {
                const plannerEmpty = this.#plannerBuffer.queue.length === 0 && !this.#motionState.active;
                if (plannerEmpty) {
                    // Planner empty - now dwell for specified duration
                    setTimeout(() => {
                        callback('ok\r\n');
                    }, result.duration);
                } else {
                    // Planner still has commands - wait and check again
                    setTimeout(waitForPlannerEmpty, 10);
                }
            };
            waitForPlannerEmpty();
        } else if (result && result.waitForCompletion) {
            // Motion command queued - send ok after adding to planner
            callback('ok\r\n');
        } else if (result && result.error) {
            // Error object
            callback(result.error);
        } else {
            // Fallback - shouldn't happen, but just in case
            callback('ok\r\n');
        }
    }

    /**
     * Process a line of input with buffer management
     * @param {string} line - Input command line (with \r\n)
     * @returns {string|object} Response string or object with {error, waitForCompletion, duration}
     */
    processLine(line) {
        line = line.trim();

        // Ignore empty lines
        if (!line) {
            return '';
        }

        // Check line length (Grbl has a limit of 80 characters for line, but buffer includes \n)
        if (line.length > 80) {
            return 'error:14\r\n'; // Line length exceeded
        }

        // Calculate line length including newline character for buffer counting
        const lineLength = line.length + 1; // +1 for \n character

        // Check if buffer has space (only for G-code, not system commands)
        if (!line.startsWith('$') && this.#receiveBuffer.used + lineLength > this.#receiveBuffer.size) {
            // Buffer overflow - this shouldn't happen in normal operation
            // In real Grbl, this would be prevented by the serial communication layer
            return 'error:11\r\n'; // Overflow
        }

        // Add to buffer queue for character counting
        if (!line.startsWith('$')) {
            this.#receiveBuffer.queue.push({
                line: line,
                length: lineLength
            });
            this.#receiveBuffer.used += lineLength;
        }

        // Process the command immediately
        let response;

        // System commands (start with $)
        if (line.startsWith('$')) {
            response = this.processSystemCommand(line);
        } else if (line.length === 1) {
            // Real-time commands are processed separately
            // but if they come in as a line, handle them here
            response = this.processRealtimeCommand(line[0]);
            if (!response) {
                response = '';
            }
        } else {
            // G-code commands
            response = this.processGCode(line);
        }

        // After processing, dequeue and free buffer space
        if (!line.startsWith('$') && this.#receiveBuffer.queue.length > 0) {
            const completed = this.#receiveBuffer.queue.shift();
            this.#receiveBuffer.used -= completed.length;
        }

        return response;
    }

    /**
     * Get buffer availability
     * In character-counting protocol, RX buffer holds bytes received but not yet acknowledged with 'ok'
     * Commands in waitingQueue are waiting for planner space - they occupy RX buffer until 'ok' sent
     * @returns {number} Available buffer space in characters
     */
    getBufferAvailable() {
        // Calculate bytes used by commands in waitingQueue (haven't received 'ok' yet)
        let waitingBytes = 0;
        for (const waiting of this.#waitingQueue) {
            waitingBytes += waiting.line.length + 1; // +1 for newline
        }

        // Total RX buffer used = current buffer + waiting queue bytes
        const totalUsed = this.#receiveBuffer.used + waitingBytes;
        return Math.max(0, this.#receiveBuffer.size - totalUsed);
    }

    /**
     * Get buffer state for status reports
     * @returns {object} Buffer state
     */
    getBufferState() {
        return {
            available: this.getBufferAvailable(),
            used: this.#receiveBuffer.used,
            size: this.#receiveBuffer.size,
            plannerBlocks: this.#receiveBuffer.plannerBlocks
        };
    }

    /**
     * Process real-time commands (single character, no line feed)
     * @param {string} char - Single character command
     * @returns {string} Response (if any)
     */
    processRealtimeCommand(char) {
        const code = char.charCodeAt(0);

        switch (char) {
            case '?':
                // Status report query
                return this.generateStatusReport();

            case '!':
                // Feed hold
                if (this.machineState === 'Run' || this.machineState === 'Jog') {
                    this.machineState = 'Hold';
                }
                return '';

            case '~':
                // Cycle start / resume
                if (this.machineState === 'Hold') {
                    this.machineState = 'Idle';
                }
                return '';

            case '\x18': // Ctrl-X (0x18)
                // Soft reset - returns startup message
                return this.reset();

            default:
                // Extended real-time commands (0x80-0xFF)
                if (code === 0x85) {
                    // Jog cancel
                    if (this.machineState === 'Jog') {
                        this.cancelJog();
                    }
                }
                return '';
        }
    }

    /**
     * Cancel active jog motion
     */
    cancelJog() {
        this.resetMotionState();
        this.machineState = 'Idle';
        // In real Grbl, this would flush the planner buffer
    }

    /**
     * Process system commands ($ commands)
     * @param {string} line - System command line
     * @returns {string} Response
     */
    processSystemCommand(line) {
        // View Grbl settings
        if (line === '$$') {
            return this.listSettings();
        }

        // View G-code parameters
        if (line === '$#') {
            return this.listParameters();
        }

        // View G-code parser state
        if (line === '$G') {
            return this.listParserState();
        }

        // View build info
        if (line === '$I') {
            return this.getBuildInfo();
        }

        // View startup blocks
        if (line === '$N') {
            return this.listStartupBlocks();
        }

        // Run homing cycle
        if (line === '$H') {
            return this.runHomingCycle();
        }

        // Check mode toggle
        if (line === '$C') {
            if (this.machineState === 'Check') {
                this.machineState = 'Idle';
                return '[MSG:Check mode disabled]\r\nok\r\n';
            } else if (this.machineState === 'Idle') {
                this.machineState = 'Check';
                return '[MSG:Check mode enabled]\r\nok\r\n';
            }
            return 'error:8\r\n'; // Not idle
        }

        // Kill alarm lock
        if (line === '$X') {
            if (this.machineState === 'Alarm') {
                this.machineState = 'Idle';
                this.alarmCode = 0;
                return '[MSG:Caution: Unlocked]\r\nok\r\n';
            }
            return 'ok\r\n';
        }

        // Sleep mode
        if (line === '$SLP') {
            this.machineState = 'Sleep';
            return '[MSG:Sleeping]\r\nok\r\n';
        }

        // Set setting value: $x=val
        const settingMatch = line.match(/^\$(\d+)=([0-9.-]+)$/);
        if (settingMatch) {
            const settingNum = parseInt(settingMatch[1]);
            const value = parseFloat(settingMatch[2]);

            if (this.settings.hasOwnProperty(settingNum)) {
                this.settings[settingNum] = value;
                return 'ok\r\n';
            } else {
                return 'error:5\r\n'; // Setting disabled
            }
        }

        // Jog command: $J=<gcode>
        if (line.startsWith('$J=')) {
            return this.processJogCommand(line.substring(3));
        }

        // Reset settings
        if (line === '$RST=$') {
            return '[MSG:Restoring defaults]\r\nok\r\n';
        }

        if (line === '$RST=#') {
            return '[MSG:Clearing coordinate offsets]\r\nok\r\n';
        }

        if (line === '$RST=*') {
            return '[MSG:Restoring defaults]\r\n[MSG:Clearing coordinate offsets]\r\nok\r\n';
        }

        // Unknown system command
        return 'error:3\r\n'; // Invalid statement
    }

    /**
     * Process G-code command
     * @param {string} line - G-code line
     * @returns {string} Response
     */
    processGCode(line) {
        // Check if in alarm state
        if (this.machineState === 'Alarm') {
            return 'error:8\r\n'; // Alarm lock
        }

        // Parse G-code line
        const upperLine = line.toUpperCase();
        const parsed = this.parseGCodeLine(upperLine);

        // Update feed rate and spindle speed if present (before motion)
        if (parsed.words.F !== null) {
            this.feedRate = parsed.words.F;
        }
        if (parsed.words.S !== null) {
            this.spindleSpeed = parsed.words.S;
        }

        // Update modal states first
        const modalCommands = {
            motion: ['G0', 'G1', 'G2', 'G3', 'G80'],
            coordinate: ['G54', 'G55', 'G56', 'G57', 'G58', 'G59'],
            plane: ['G17', 'G18', 'G19'],
            distance: ['G90', 'G91'],
            units: ['G20', 'G21'],
            spindle: ['M3', 'M4', 'M5'],
            coolant: ['M7', 'M8', 'M9']
        };

        for (const [group, commands] of Object.entries(modalCommands)) {
            for (const cmd of commands) {
                if (parsed.commands.includes(cmd)) {
                    this.parserState[group] = cmd;

                    // Update active WCS if coordinate system changed
                    if (group === 'coordinate') {
                        this.activeWCS = cmd;
                    }
                }
            }
        }

        // Handle G10 L2 (Set Work Coordinate System)
        if (parsed.commands.includes('G10')) {
            const lMatch = upperLine.match(/L(\d+)/);
            const pMatch = upperLine.match(/P(\d+)/);

            if (lMatch && pMatch) {
                const l = parseInt(lMatch[1], 10);
                const p = parseInt(pMatch[1], 10);

                if (l === 2 && p >= 1 && p <= 6) {
                    // G10 L2 P1-6: Set WCS offset
                    const wcsNames = ['G54', 'G55', 'G56', 'G57', 'G58', 'G59'];
                    const wcsName = wcsNames[p - 1];

                    if (parsed.coords.x !== null) {
                        this.workCoordinateOffsets[wcsName].x = parsed.coords.x;
                    }
                    if (parsed.coords.y !== null) {
                        this.workCoordinateOffsets[wcsName].y = parsed.coords.y;
                    }
                    if (parsed.coords.z !== null) {
                        this.workCoordinateOffsets[wcsName].z = parsed.coords.z;
                    }

                    this.updateWorkPosition();
                    return 'ok\r\n';
                }
            }
        }

        // Handle G92 (Set Position / Coordinate Offset)
        if (parsed.commands.includes('G92')) {
            // G92: Sets G92 offset so that current position becomes the specified value
            // Formula: G92_offset = MPos - WCS - WPos_desired
            const wcsOffset = this.workCoordinateOffsets[this.activeWCS];

            for (const axis of ['x', 'y', 'z']) {
                if (parsed.coords[axis] !== null) {
                    const desiredWPos = parsed.coords[axis];
                    // MPos = WPos + WCS + G92, so: G92 = MPos - WCS - WPos
                    this.g92Offset[axis] = this.machinePosition[axis] - wcsOffset[axis] - desiredWPos;
                }
            }

            this.updateWorkPosition();
            return 'ok\r\n';
        }

        // Handle G92.1 (Cancel G92 Offset)
        if (parsed.commands.includes('G92.1')) {
            this.g92Offset = { x: 0, y: 0, z: 0 };
            this.updateWorkPosition();
            return 'ok\r\n';
        }

        // Handle G4 (Dwell)
        if (parsed.commands.includes('G4')) {
            // Parse P value (dwell time in seconds)
            const pMatch = upperLine.match(/P([0-9.]+)/);
            if (!pMatch) {
                return 'error:27\r\n'; // P word missing
            }

            const dwellSeconds = parseFloat(pMatch[1]);
            const dwellMs = dwellSeconds * 1000;

            // G4 is special: waits for planner to empty, then delays
            // Return special marker for processLineAsync to handle blocking
            return {
                isDwell: true,
                duration: dwellMs,
            };
        }

        // Handle G38.x probing commands
        const probeCommands = ['G38.2', 'G38.3', 'G38.4', 'G38.5'];
        const hasProbe = probeCommands.some(cmd => parsed.commands.includes(cmd));

        if (hasProbe && (parsed.coords.x !== null || parsed.coords.y !== null || parsed.coords.z !== null)) {
            const probeCmd = probeCommands.find(cmd => parsed.commands.includes(cmd));
            const isToward = probeCmd === 'G38.2' || probeCmd === 'G38.3';
            const signalError = probeCmd === 'G38.2' || probeCmd === 'G38.4';

            const result = this.executeProbe(parsed.coords, isToward, signalError);

            if (result.error) {
                return result.error;
            }
            return 'ok\r\n';
        }

        // Handle motion commands (G0/G00, G1/G01, G2/G02, G3/G03)
        // Parser may return 'G0' or 'G00', so use startsWith for matching
        const hasMotion = parsed.commands.some(cmd =>
            cmd.match(/^G0\d?$/) || cmd.match(/^G1\d?$/) ||
            cmd.match(/^G2$/) || cmd.match(/^G3$/)
        );

        if (hasMotion && (parsed.coords.x !== null || parsed.coords.y !== null || parsed.coords.z !== null)) {
            // Execute motion based on type
            const isArc = parsed.commands.some(cmd => cmd.match(/^G[23]$/));
            if (isArc) {
                // Arc motion (G2 clockwise, G3 counter-clockwise)
                const isClockwise = parsed.commands.some(cmd => cmd.match(/^G2$/));
                const result = this.executeArcMotion(parsed.coords, parsed.words, isClockwise, line);

                if (result.error) {
                    return result.error;
                }
                // Return the result with wait information
                return result;
            } else {
                // Linear motion (G0, G1)
                const result = this.executeLinearMotion(parsed.coords, line);

                if (result.error) {
                    return result.error;
                }
                // Return the result with wait information
                return result;
            }
        }

        return 'ok\r\n';
    }

    /**
     * Execute probe cycle (G38.2, G38.3, G38.4, G38.5)
     * G38.2: Probe toward workpiece, stop on contact, signal error if failure
     * G38.3: Probe toward workpiece, stop on contact
     * G38.4: Probe away from workpiece, stop on loss of contact, signal error if failure
     * G38.5: Probe away from workpiece, stop on loss of contact
     * @param {object} coords - Target coordinates
     * @param {boolean} isToward - true for G38.2/G38.3 (toward), false for G38.4/G38.5 (away)
     * @param {boolean} signalError - true for G38.2/G38.4, false for G38.3/G38.5
     * @returns {object} Result with error if any
     */
    executeProbe(coords, isToward, signalError) {
        // Check feed rate
        if (this.feedRate === 0) {
            return { error: 'error:22\r\n' }; // Undefined feed rate
        }

        // Get the expected start position and end position
        const startPosition = this.getPlannedEndPosition();
        const endPosition = this.calculateMachinePosition(coords, startPosition);

        // Check initial probe state
        const initialProbeState = this.probeTriggered;

        // For "toward" probes (G38.2/G38.3), pin should NOT be triggered initially
        // For "away" probes (G38.4/G38.5), pin SHOULD be triggered initially
        const expectedInitialState = !isToward;

        if (initialProbeState !== expectedInitialState) {
            this.probeSuccess = false;
            return { error: 'error:4\r\n' }; // Probe fail initial
        }

        // Calculate 3D distance and time
        const dx = endPosition.x - startPosition.x;
        const dy = endPosition.y - startPosition.y;
        const dz = endPosition.z - startPosition.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const probeTime = (distance / this.feedRate) * 60 * 1000;

        this.#plannerBuffer.queue.push({
            endPosition,
            execute: () => {
                this.machineState = 'Run';
                this.setMotionState({
                    active: true,
                    type: 'linear', // Probe uses linear interpolation
                    startTime: Date.now(),
                    endTime: Date.now() + probeTime,
                    startPosition,
                    endPosition,
                    currentFeedRate: this.feedRate,
                    data: {},
                });
                this.updateMotionState();

                // Store probe result
                this.probePosition = endPosition;
                this.probeSuccess = true;
            }
        });

        return { error: null, waitForCompletion: true, duration: probeTime };
    }

    /**
     * Process jogging command ($J=<line>)
     * Jogging is independent of parser state and only works in Idle or Jog states
     * @param {string} jogLine - Jog G-code line (without $J= prefix)
     * @returns {string} Response
     */
    processJogCommand(jogLine) {
        // Only accept jog commands in Idle or Jog state
        if (this.machineState !== 'Idle' && this.machineState !== 'Jog') {
            return 'error:16\r\n'; // Invalid jog command
        }

        // Parse the jog line
        const upperLine = jogLine.toUpperCase();
        const parsed = this.parseGCodeLine(upperLine);

        // Jog requires F word
        if (parsed.words.F === null) {
            return 'error:22\r\n'; // Undefined feed rate
        }

        // Jog requires at least one axis word
        if (parsed.coords.x === null && parsed.coords.y === null && parsed.coords.z === null) {
            return 'error:26\r\n'; // No axis words
        }

        // Save current parser state (jogging doesn't modify it)
        const savedParserState = { ...this.parserState };
        const savedFeedRate = this.feedRate;

        // Apply temporary state for this jog command only
        // Default to current parser state unless overridden in jog command
        let tempDistance = this.parserState.distance;
        if (parsed.commands.includes('G91')) {
            tempDistance = 'G91';
        } else if (parsed.commands.includes('G90')) {
            tempDistance = 'G90';
        }

        let tempUnits = this.parserState.units;
        if (parsed.commands.includes('G20')) {
            tempUnits = 'G20';
        } else if (parsed.commands.includes('G21')) {
            tempUnits = 'G21';
        }

        // Temporarily apply jog command modifiers
        this.parserState.distance = tempDistance;
        this.parserState.units = tempUnits;
        this.parserState.motion = 'G1'; // Jogging is always linear
        this.feedRate = parsed.words.F;

        // Get the expected start position and end position
        const startPosition = { ...this.machinePosition };
        const endPosition = this.calculateMachinePosition(parsed.coords, startPosition);

        // Restore parser state immediately (jogging doesn't modify it!)
        this.parserState = savedParserState;
        this.feedRate = savedFeedRate;

        // Calculate distance and motion time
        const dx = endPosition.x - startPosition.x;
        const dy = endPosition.y - startPosition.y;
        const dz = endPosition.z - startPosition.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

        // Skip if no distance
        if (distance < 0.001) {
            return 'ok\r\n';
        }

        const motionTime = (distance / parsed.words.F) * 60 * 1000;
        const jogFeedRate = parsed.words.F;

        this.#plannerBuffer.queue.push({
            endPosition,
            execute: () => {
                this.machineState = 'Jog';
                this.setMotionState({
                    active: true,
                    type: 'linear', // Jog uses linear interpolation
                    startTime: Date.now(),
                    endTime: Date.now() + motionTime,
                    startPosition,
                    endPosition,
                    currentFeedRate: jogFeedRate,
                    data: {},
                });
            }
        });

        // Jog also waits for completion
        return { error: null, waitForCompletion: true, duration: motionTime, response: 'ok\r\n' };
    }

    /**
     * Execute linear motion (G0/G1)
     * @param {object} coords - Target coordinates
     * @returns {object} Result with error if any
     */
    executeLinearMotion(coords) {
        // Get the expected start position (end of last queued command or current position) and end position
        const startPosition = this.getPlannedEndPosition();
        const endPosition = this.calculateMachinePosition(coords, startPosition);

        // Calculate distance from planned start to end
        const dx = endPosition.x - startPosition.x;
        const dy = endPosition.y - startPosition.y;
        const dz = endPosition.z - startPosition.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

        // Skip motion if no distance
        if (distance < 0.001) {
            return { error: null };
        }

        // Calculate motion time based on feed rate
        let motionTime;
        let motionFeedRate;
        const isRapid = this.parserState.motion === 'G0';

        if (isRapid) {
            // G0 uses rapid rate (from settings $110-$112, use maximum)
            motionFeedRate = Math.max(
                this.settings[SETTINGS.X_MAX_RATE],
                this.settings[SETTINGS.Y_MAX_RATE],
                this.settings[SETTINGS.Z_MAX_RATE]
            );
            motionTime = (distance / motionFeedRate) * 60 * 1000; // Convert mm/min to milliseconds
        } else {
            // G1 uses programmed feed rate
            if (this.feedRate === 0) {
                return { error: 'error:22\r\n' }; // Undefined feed rate
            }
            motionFeedRate = this.feedRate;
            motionTime = (distance / motionFeedRate) * 60 * 1000; // Convert mm/min to milliseconds
        }

        // Queue motion for asynchronous execution
        this.#plannerBuffer.queue.push({
            endPosition,
            execute: () => {
                this.machineState = 'Run';
                this.setMotionState({
                    active: true,
                    type: 'linear', // G0/G1 use linear interpolation
                    startTime: Date.now(),
                    endTime: Date.now() + motionTime,
                    startPosition,
                    endPosition,
                    currentFeedRate: motionFeedRate,
                    data: {},
                });
            }
        });

        // Return info for async handling (ok should wait if buffer was full)
        return { error: null, waitForCompletion: true, duration: motionTime };
    }

    /**
     * Get the planned end position (for chaining commands)
     * @returns {object} Expected position after all queued commands
     */
    getPlannedEndPosition() {
        // If there are queued commands, return the target position of the last one
        if (this.#plannerBuffer.queue.length > 0) {
            return { ...this.#plannerBuffer.queue[this.#plannerBuffer.queue.length - 1].endPosition };
        }

        // If a command is executing, return its end position
        if (this.#motionState.active) {
            return { ...this.#motionState.endPosition };
        }

        // Otherwise, return current position
        return { ...this.machinePosition };
    }

    /**
     * Execute arc motion (G2/G3)
     * @param {object} coords - Target coordinates
     * @param {object} words - I, J, K, R values
     * @param {boolean} isClockwise - true for G2, false for G3
     * @returns {object} Result with error if any
     */
    executeArcMotion(coords, words, isClockwise) {
        // Get the expected start position (end of last queued command or current position) and end position
        const startPosition = this.getPlannedEndPosition();
        const endPosition = this.calculateMachinePosition(coords, startPosition);

        const isInches = this.parserState.units === 'G20';
        const MM_PER_INCH = 25.4;

        // Determine plane and axes
        let axis0, axis1;
        if (this.parserState.plane === 'G17') {
            // XY plane
            axis0 = 'x';
            axis1 = 'y';
        } else if (this.parserState.plane === 'G18') {
            // ZX plane
            axis0 = 'z';
            axis1 = 'x';
        } else {
            // G19: YZ plane
            axis0 = 'y';
            axis1 = 'z';
        }

        const centerOffset = { x: 0, y: 0, z: 0 };

        // Check if using R (radius) mode or IJK (center offset) mode
        if (words.R !== null) {
            // Radius mode: calculate center offset from radius
            const radius = isInches ? words.R * MM_PER_INCH : words.R;

            const x = endPosition[axis0] - startPosition[axis0];
            const y = endPosition[axis1] - startPosition[axis1];
            const distance = Math.sqrt(x * x + y * y);

            // Check if radius is valid
            const hX2DivD = 4.0 * radius * radius - x * x - y * y;
            if (hX2DivD < 0) {
                return { error: 'error:34\r\n' }; // Arc radius error
            }

            let height = Math.sqrt(hX2DivD) / (2.0 * distance);

            // Adjust sign based on arc direction
            if (isClockwise) {
                height = -height;
            }
            if (radius < 0) {
                height = -height;
            }

            const offsetX = x / 2 - y * height;
            const offsetY = y / 2 + x * height;

            centerOffset[axis0] = offsetX;
            centerOffset[axis1] = offsetY;
        } else {
            // IJK mode: use center offsets directly
            if (words.I !== null) {
                centerOffset.x = isInches ? words.I * MM_PER_INCH : words.I;
            }
            if (words.J !== null) {
                centerOffset.y = isInches ? words.J * MM_PER_INCH : words.J;
            }
            if (words.K !== null) {
                centerOffset.z = isInches ? words.K * MM_PER_INCH : words.K;
            }

            // Validate that we have offset in the current plane
            if (centerOffset[axis0] === 0 && centerOffset[axis1] === 0) {
                return { error: 'error:35\r\n' }; // No offsets in plane
            }
        }

        // Calculate arc length for motion time
        // Arc length = radius * angular_travel
        const radius = Math.sqrt(centerOffset[axis0] * centerOffset[axis0] + centerOffset[axis1] * centerOffset[axis1]);

        // Calculate angular travel
        const startAngle = Math.atan2(-centerOffset[axis1], -centerOffset[axis0]);
        const endAngle = Math.atan2(endPosition[axis1] - (startPosition[axis1] + centerOffset[axis1]),
                                      endPosition[axis0] - (startPosition[axis0] + centerOffset[axis0]));

        let angularTravel = endAngle - startAngle;
        if (isClockwise && angularTravel >= 0) {
            angularTravel -= 2 * Math.PI;
        } else if (!isClockwise && angularTravel <= 0) {
            angularTravel += 2 * Math.PI;
        }

        const arcLength = Math.abs(radius * angularTravel);

        // Add linear axis travel if helical arc
        const linearAxis = this.getLinearAxis();
        const linearTravel = Math.abs(endPosition[linearAxis] - startPosition[linearAxis]);
        const totalDistance = Math.sqrt(arcLength * arcLength + linearTravel * linearTravel);

        // Calculate motion time based on feed rate
        if (this.feedRate === 0) {
            return { error: 'error:22\r\n' }; // Undefined feed rate
        }
        const arcFeedRate = this.feedRate; // Capture for closure
        const motionTime = (totalDistance / arcFeedRate) * 60 * 1000; // Convert mm/min to milliseconds

        // Calculate center position for arc interpolation
        const center = {
            x: startPosition.x + centerOffset.x,
            y: startPosition.y + centerOffset.y,
            z: startPosition.z + centerOffset.z
        };

        // Capture plane for closure
        const currentPlane = this.parserState.plane;

        // Queue arc motion for asynchronous execution
        this.#plannerBuffer.queue.push({
            endPosition,
            execute: () => {
                this.machineState = 'Run';
                this.setMotionState({
                    active: true,
                    type: 'arc', // G2/G3 use arc interpolation
                    startTime: Date.now(),
                    endTime: Date.now() + motionTime,
                    startPosition,
                    endPosition,
                    currentFeedRate: arcFeedRate,
                    data: {
                        // Arc-specific interpolation data
                        center: center,
                        radius: radius,
                        startAngle: startAngle,
                        endAngle: endAngle,
                        angularTravel: angularTravel,
                        isClockwise: isClockwise,
                        plane: currentPlane,
                        axis0: axis0,
                        axis1: axis1
                    }
                });
            }
        });

        return { error: null, waitForCompletion: true, duration: motionTime };
    }

    /**
     * Get linear axis based on current plane
     * @returns {string} Linear axis ('x', 'y', or 'z')
     */
    getLinearAxis() {
        if (this.parserState.plane === 'G17') {
            return 'z'; // XY plane, Z is linear
        } else if (this.parserState.plane === 'G18') {
            return 'y'; // ZX plane, Y is linear
        } else {
            return 'x'; // YZ plane, X is linear
        }
    }

    /**
     * Parse G-code line into commands, coordinates, and words
     * @param {string} line - Uppercase G-code line
     * @returns {object} Parsed data
     */
    parseGCodeLine(line) {
        const parsed = {
            commands: [],
            coords: { x: null, y: null, z: null },
            words: { F: null, S: null, I: null, J: null, K: null, R: null }
        };

        // Extract G and M commands (including decimal variants like G38.2)
        const gMatch = line.match(/G\d+(?:\.\d+)?/g);
        if (gMatch) {
            // Normalize G-codes: G00 -> G0, G01 -> G1, etc. (keep G38.2, G92.1 as-is)
            const normalized = gMatch.map(cmd => {
                if (cmd.includes('.')) {
                    return cmd; // Keep decimal G-codes like G38.2, G92.1
                }
                // Remove leading zeros: G00 -> G0, G01 -> G1
                return cmd.replace(/^G0+(\d)$/, 'G$1').replace(/^G(\d+)$/, (_match, num) => 'G' + parseInt(num, 10));
            });
            parsed.commands.push(...normalized);
        }
        const mMatch = line.match(/M\d+/g);
        if (mMatch) {
            parsed.commands.push(...mMatch);
        }

        // Extract coordinates
        const xMatch = line.match(/X([+-]?\d+\.?\d*)/);
        if (xMatch) {
            parsed.coords.x = parseFloat(xMatch[1]);
        }

        const yMatch = line.match(/Y([+-]?\d+\.?\d*)/);
        if (yMatch) {
            parsed.coords.y = parseFloat(yMatch[1]);
        }

        const zMatch = line.match(/Z([+-]?\d+\.?\d*)/);
        if (zMatch) {
            parsed.coords.z = parseFloat(zMatch[1]);
        }

        // Extract other words
        const fMatch = line.match(/F([+-]?\d+\.?\d*)/);
        if (fMatch) {
            parsed.words.F = parseFloat(fMatch[1]);
        }

        const sMatch = line.match(/S([+-]?\d+\.?\d*)/);
        if (sMatch) {
            parsed.words.S = parseFloat(sMatch[1]);
        }

        const iMatch = line.match(/I([+-]?\d+\.?\d*)/);
        if (iMatch) {
            parsed.words.I = parseFloat(iMatch[1]);
        }

        const jMatch = line.match(/J([+-]?\d+\.?\d*)/);
        if (jMatch) {
            parsed.words.J = parseFloat(jMatch[1]);
        }

        const kMatch = line.match(/K([+-]?\d+\.?\d*)/);
        if (kMatch) {
            parsed.words.K = parseFloat(kMatch[1]);
        }

        const rMatch = line.match(/R([+-]?\d+\.?\d*)/);
        if (rMatch) {
            parsed.words.R = parseFloat(rMatch[1]);
        }

        return parsed;
    }

    /**
     * Calculate machine position from parsed G-code coordinates
     * @param {object} coords - Parsed coordinates from G-code
     * @param {object} [referencePosition] - Reference position for incremental mode and defaults
     * @returns {object} Machine position (after applying units, distance mode, WCS offsets)
     */
    calculateMachinePosition(coords, referencePosition = this.machinePosition) {
        const target = { ...referencePosition };

        // Apply coordinate system based on distance mode (G90/G91)
        const isAbsolute = this.parserState.distance === 'G90';
        const isInches = this.parserState.units === 'G20';
        const MM_PER_INCH = 25.4;

        // Get work coordinate system offset
        const wcsOffset = this.workCoordinateOffsets[this.activeWCS];

        for (const axis of ['x', 'y', 'z']) {
            if (coords[axis] !== null) {
                let value = coords[axis];

                // Convert inches to mm if needed
                if (isInches) {
                    value *= MM_PER_INCH;
                }

                if (isAbsolute) {
                    // Absolute mode: MPos = WPos + WCS + G92
                    target[axis] = value + wcsOffset[axis] + this.g92Offset[axis];
                } else {
                    // Incremental mode: add to reference position
                    target[axis] = referencePosition[axis] + value;
                }
            }
        }

        return target;
    }

    /**
     * Update work position based on machine position
     * Formula: WPos = MPos - WCS - G92
     */
    updateWorkPosition() {
        const wcsOffset = this.workCoordinateOffsets[this.activeWCS];

        this.workPosition = {
            x: this.machinePosition.x - wcsOffset.x - this.g92Offset.x,
            y: this.machinePosition.y - wcsOffset.y - this.g92Offset.y,
            z: this.machinePosition.z - wcsOffset.z - this.g92Offset.z
        };
    }

    /**
     * Get current interpolated position during motion
     * @returns {object} Current position
     */
    getCurrentPosition() {
        if (!this.#motionState.active) {
            return { ...this.machinePosition };
        }

        const now = Date.now();
        if (now >= this.#motionState.endTime) {
            return { ...this.#motionState.endPosition };
        }

        // Calculate progress (0 to 1)
        const elapsed = now - this.#motionState.startTime;
        const duration = this.#motionState.endTime - this.#motionState.startTime;
        const progress = duration > 0 ? elapsed / duration : 1;

        // Arc interpolation for G2/G3
        if (this.#motionState.type === 'arc' && this.#motionState.data) {
            return this.interpolateArcPosition(progress);
        }

        // Linear interpolation for G0/G1 and other motion types
        return {
            x: this.#motionState.startPosition.x + (this.#motionState.endPosition.x - this.#motionState.startPosition.x) * progress,
            y: this.#motionState.startPosition.y + (this.#motionState.endPosition.y - this.#motionState.startPosition.y) * progress,
            z: this.#motionState.startPosition.z + (this.#motionState.endPosition.z - this.#motionState.startPosition.z) * progress
        };
    }

    /**
     * Interpolate position along an arc
     * @param {number} progress - Progress from 0 to 1
     * @returns {object} Interpolated position
     */
    interpolateArcPosition(progress) {
        const { center, radius, startAngle, angularTravel, axis0, axis1 } = this.#motionState.data;

        // Calculate current angle along the arc
        const currentAngle = startAngle + angularTravel * progress;

        // Calculate position on the arc in the current plane
        const pos = { ...this.#motionState.startPosition };

        // Set position in the arc plane
        pos[axis0] = center[axis0] + radius * Math.cos(currentAngle);
        pos[axis1] = center[axis1] + radius * Math.sin(currentAngle);

        // Linear interpolation for the axis perpendicular to the arc plane (helical arcs)
        const linearAxis = this.getLinearAxis();
        pos[linearAxis] = this.#motionState.startPosition[linearAxis] +
                         (this.#motionState.endPosition[linearAxis] - this.#motionState.startPosition[linearAxis]) * progress;

        return pos;
    }

    /**
     * Generate status report in Grbl format
     * @returns {string} Status report
     */
    generateStatusReport() {
        // Get current position (interpolated if in motion)
        const currentMPos = this.getCurrentPosition();
        const wcsOffset = this.workCoordinateOffsets[this.activeWCS];
        const currentWPos = {
            x: currentMPos.x - wcsOffset.x - this.g92Offset.x,
            y: currentMPos.y - wcsOffset.y - this.g92Offset.y,
            z: currentMPos.z - wcsOffset.z - this.g92Offset.z
        };

        const mpos = `${currentMPos.x.toFixed(3)},${currentMPos.y.toFixed(3)},${currentMPos.z.toFixed(3)}`;
        const wpos = `${currentWPos.x.toFixed(3)},${currentWPos.y.toFixed(3)},${currentWPos.z.toFixed(3)}`;

        // Use $10 status report mask to determine position type
        // Bit 0: Position type (0=WPos, 1=MPos)
        const showMPos = (this.settings[SETTINGS.STATUS_REPORT_MASK] & 1) !== 0;
        const posType = showMPos ? 'MPos' : 'WPos';
        const posValue = showMPos ? mpos : wpos;

        // Determine actual feed rate to report
        // During motion, use the motion's actual feed rate
        // When idle, show the programmed feed rate
        let reportedFeedRate = this.feedRate;
        if (this.#motionState.active && this.#motionState.currentFeedRate > 0) {
            reportedFeedRate = this.#motionState.currentFeedRate;
        }

        let report = `<${this.machineState}|${posType}:${posValue}|FS:${reportedFeedRate.toFixed(1)},${this.spindleSpeed.toFixed(0)}`;

        // Add buffer state (Bf: planner blocks available, RX buffer available)
        // In real Grbl, this is controlled by $10 bit 1 (BITFLAG_RT_STATUS_BUFFER_STATE)
        // IMPORTANT: Only count ACTUAL planner blocks, not waiting commands!
        // Waiting commands are in RX buffer or waitingQueue, NOT in planner
        const plannerBlocksUsed = this.#plannerBuffer.queue.length +
                                  (this.#plannerBuffer.executing ? 1 : 0);
        const plannerBlocksAvail = Math.max(0, this.#plannerBuffer.size - plannerBlocksUsed);

        // RX buffer availability (128 bytes total - used by waiting commands)
        // Each waiting command uses approximately its line length in the RX buffer
        const rxBytesAvail = this.getBufferAvailable();

        // Show Bf if $10 bit 1 is set (default is on)
        // For now, always show it for debugging purposes
        const showBuffer = true; // Could check: (this.settings[SETTINGS.STATUS_REPORT_MASK] & 2) !== 0;
        if (showBuffer) {
            report += `|Bf:${plannerBlocksAvail},${rxBytesAvail}`;
        }

        // Add overrides if not 100%
        if (this.feedOverride !== 100 || this.rapidOverride !== 100 || this.spindleOverride !== 100) {
            report += `|Ov:${this.feedOverride},${this.rapidOverride},${this.spindleOverride}`;
        }

        report += '>\r\n';
        return report;
    }

    /**
     * List all settings
     * @returns {string} Settings list
     */
    listSettings() {
        let output = '';
        for (const [key, value] of Object.entries(this.settings)) {
            output += `$${key}=${value}\r\n`;
        }
        output += 'ok\r\n';
        return output;
    }

    /**
     * List G-code parameters (coordinate systems, probe position)
     * @returns {string} Parameters list
     */
    listParameters() {
        let output = '';

        // Work coordinate systems
        for (const [wcs, offset] of Object.entries(this.workCoordinateOffsets)) {
            output += `[${wcs}:${offset.x.toFixed(3)},${offset.y.toFixed(3)},${offset.z.toFixed(3)}]\r\n`;
        }

        // G28, G30 positions
        output += '[G28:0.000,0.000,0.000]\r\n';
        output += '[G30:0.000,0.000,0.000]\r\n';

        // G92 offset
        output += `[G92:${this.g92Offset.x.toFixed(3)},${this.g92Offset.y.toFixed(3)},${this.g92Offset.z.toFixed(3)}]\r\n`;

        // Tool length offset
        output += '[TLO:0.000]\r\n';

        // Probe position (with success flag: 1 = success, 0 = fail)
        const probeSuccess = this.probeSuccess ? 1 : 0;
        output += `[PRB:${this.probePosition.x.toFixed(3)},${this.probePosition.y.toFixed(3)},${this.probePosition.z.toFixed(3)}:${probeSuccess}]\r\n`;

        output += 'ok\r\n';
        return output;
    }

    /**
     * List G-code parser state
     * @returns {string} Parser state
     */
    listParserState() {
        const state = Object.values(this.parserState).join(' ');
        return `[GC:${state} F${this.feedRate.toFixed(1)} S${this.spindleSpeed.toFixed(0)}]\r\nok\r\n`;
    }

    /**
     * Get build info
     * @returns {string} Build info
     */
    getBuildInfo() {
        return `[VER:${GrblSimulator.VERSION}.${GrblSimulator.BUILD_DATE}:Grbl Simulator]\r\n[OPT:V,15,128]\r\nok\r\n`;
    }

    /**
     * List startup blocks
     * @returns {string} Startup blocks
     */
    listStartupBlocks() {
        return '$N0=\r\n$N1=\r\nok\r\n';
    }

    /**
     * Run homing cycle
     * @returns {string} Response
     */
    runHomingCycle() {
        if (this.settings[SETTINGS.HOMING_ENABLE] === 0) {
            return 'error:5\r\n'; // Homing disabled
        }

        // Calculate homing motion duration
        // Homing seeks at homing seek rate ($25), then approaches at feed rate ($24)
        const homingSeekRate = this.settings[SETTINGS.HOMING_SEEK]; // Default: 500mm/min

        // Calculate total distance based on max travel
        const maxTravel = Math.max(
            this.settings[SETTINGS.X_MAX_TRAVEL],
            this.settings[SETTINGS.Y_MAX_TRAVEL],
            this.settings[SETTINGS.Z_MAX_TRAVEL]
        );

        // Homing time = (distance / rate) * 60 * 1000
        const homingTime = (maxTravel / homingSeekRate) * 60 * 1000;

        // Queue homing motion for asynchronous execution
        const startPosition = { ...this.machinePosition };
        const endPosition = { x: 0, y: 0, z: 0 };

        this.#plannerBuffer.queue.push({
            endPosition,
            execute: () => {
                this.machineState = 'Home';
                this.setMotionState({
                    active: true,
                    type: 'linear', // Homing uses linear interpolation
                    startTime: Date.now(),
                    endTime: Date.now() + homingTime,
                    startPosition,
                    endPosition,
                    currentFeedRate: homingSeekRate,
                    data: {},
                });
            }
        });

        // Homing also waits for completion
        return { error: null, waitForCompletion: true, duration: homingTime, response: 'ok\r\n' };
    }

    /**
     * Reset the controller (Ctrl-X soft reset)
     * @returns {string} Response to send to client
     */
    reset() {
        // Check if reset during motion - triggers alarm
        const wasInMotion = this.#motionState.active || this.#plannerBuffer.queue.length > 0;

        // Clear all buffers
        this.#receiveBuffer.queue = [];
        this.#receiveBuffer.used = 0;
        this.#plannerBuffer.queue = [];
        this.#plannerBuffer.executing = null;
        this.#waitingQueue = [];

        // Stop current motion
        this.resetMotionState();

        // Clear parser state
        this.feedRate = 0;
        this.spindleSpeed = 0;

        // Reset to initial parser state
        this.parserState = {
            motion: 'G0',
            coordinate: 'G54',
            plane: 'G17',
            distance: 'G90',
            feedRate: 'G94',
            units: 'G21',
            cutterComp: 'G40',
            toolLength: 'G49',
            program: 'M0',
            spindle: 'M5',
            coolant: 'M9'
        };

        // If reset during motion, trigger alarm 3
        if (wasInMotion) {
            this.machineState = 'Alarm';
            this.alarmCode = 3;
            return `ALARM:3\r\n${this.getStartupMessage()}`;
        } else {
            this.machineState = 'Idle';
            this.alarmCode = 0;
            return this.getStartupMessage();
        }
    }

    /**
     * Trigger an alarm
     * @param {number} alarmCode - Alarm code (1-10)
     * @returns {string} Alarm message
     */
    triggerAlarm(alarmCode) {
        this.machineState = 'Alarm';
        this.alarmCode = alarmCode;
        // Stop all motion
        this.resetMotionState();
        this.#plannerBuffer.queue = [];
        return `ALARM:${alarmCode}\r\n`;
    }

    /**
     * Check if position exceeds soft limits
     * @param {object} position - Position to check
     * @returns {object} {exceeded: boolean, axis: string}
     */
    checkSoftLimits(position) {
        // Soft limits check against max travel in negative direction
        // Grbl assumes machine zero is at one end of travel
        const maxTravel = {
            x: this.settings[SETTINGS.X_MAX_TRAVEL],
            y: this.settings[SETTINGS.Y_MAX_TRAVEL],
            z: this.settings[SETTINGS.Z_MAX_TRAVEL]
        };

        // Check each axis
        for (const axis of ['x', 'y', 'z']) {
            // Position must be between -maxTravel and 0 (or 0 to +maxTravel depending on config)
            // For simplicity, check absolute value against max travel
            if (Math.abs(position[axis]) > maxTravel[axis]) {
                return { exceeded: true, axis: axis };
            }
        }

        return { exceeded: false };
    }

    /**
     * Get startup message
     * @returns {string} Startup message
     */
    getStartupMessage() {
        return `\r\nGrbl ${GrblSimulator.VERSION} ['$' for help]\r\n`;
    }
}

module.exports = GrblSimulator;
