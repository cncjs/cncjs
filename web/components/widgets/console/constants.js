export const SCROLL_BUFFER_SIZE = 5000; // lines
export const GRBL_REALTIME_COMMANDS = [
    '~', // Cycle Start
    '!', // Feed Hold
    '?', // Current Status
    '\x18' // Reset Grbl (Ctrl-X)
];
