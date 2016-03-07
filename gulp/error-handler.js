//
// Error handling in gulp
//
// http://www.artandlogic.com/blog/2014/05/error-handling-in-gulp/
// https://github.com/ethanmuller/gulp-init/blob/master/error-handler.coffee

import gutil from 'gulp-util';

// Command line option:
//  --fatal=[warning|error|off]
const fatalLevel = require('yargs').argv.fatal;

const ERROR_LEVELS = [
    'error',
    'warning'
];

const ERROR_COLORS = {
    warning: gutil.colors.yellow,
    error: gutil.colors.red
};

const ERROR_EMOTES = {
    warning: [
        '¯\\_(ツ)_/¯',
        '(╯︵╰,)',
        '(ಠ_ಠ)'
    ],
    error: [
        '(╯°□°）╯︵ ┻━┻',
        '┻━┻  ︵ \\(°□°)/ ︵ ┻━┻',
        'ლ (ಠ益ಠ)ლ'
    ]
};

// If the fatalLevel is 'off', then this will always return false.
// Defaults the fatalLevel to 'error'.
const isFatal = function(level) {
    const errorLevels = [
        'error',
        'warning'
    ];
    return ERROR_LEVELS.indexOf(level) <= ERROR_LEVELS.indexOf(fatalLevel || 'error');
};

// Handle an error based on its severity level.
// Log all levels, and exit the process for fatal levels.
const handleError = function(level, error) {
    const emotes = ERROR_EMOTES[level];
    const color = ERROR_COLORS[level];
    const msg = color(level.toUpperCase()) + ' triggered by ' + gutil.colors.magenta(error.plugin);
    const randomEmote = emotes[Math.floor(Math.random() * emotes.length)];

    gutil.beep();
    gutil.log(msg);
    gutil.log(color(randomEmote));
    gutil.log(color(error.message));
    if (isFatal(level)) {
        process.exit(1);
    }
};

export const error = (error) => {
    handleError('error', error);
    this.emit('end');
};

export const warning = (error) => {
    handleError('warning', error);
    this.emit('end');
};
