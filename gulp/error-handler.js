// 
// Error handling in gulp 
//
// http://www.artandlogic.com/blog/2014/05/error-handling-in-gulp/
// https://github.com/ethanmuller/gulp-init/blob/master/error-handler.coffee

var gutil = require('gulp-util');

// Command line option:
//  --fatal=[warning|error|off]
var fatalLevel = require('yargs').argv.fatal;

var ERROR_LEVELS = [
    'error',
    'warning'
];

var ERROR_COLORS = {
    warning: gutil.colors.yellow,
    error: gutil.colors.red
};

var ERROR_EMOTES = {
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
var isFatal = function(level) {
    var errorLevels = [
        'error',
        'warning'
    ];
    return ERROR_LEVELS.indexOf(level) <= ERROR_LEVELS.indexOf(fatalLevel || 'error');
};

// Handle an error based on its severity level.
// Log all levels, and exit the process for fatal levels.
var handleError = function(level, error) {
    var emotes = ERROR_EMOTES[level];
    var color = ERROR_COLORS[level];
    var msg = color(level.toUpperCase()) + ' triggered by ' + gutil.colors.magenta(error.plugin);
    var randomEmote = emotes[Math.floor(Math.random()*emotes.length)];

    gutil.beep();
    gutil.log(msg);
    gutil.log(color(randomEmote));
    gutil.log(color(error.message));
    if (isFatal(level)) {
        process.exit(1);
    }
};

module.exports = {
    // Convenience handler for error-level errors.
    error: function(error) {
        handleError.call(this, 'error', error);
        this.emit('end');
    },
    // Convenience handler for warning-level errors.
    warning: function(error) {
        handleError.call(this, 'warning', error);
        this.emit('end');
    }
};
