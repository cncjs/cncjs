import _ from 'lodash';
import log from '../log';

let stripComments = (() => {
    let re1 = /^\s+|\s+$/g; // Strip leading and trailing spaces
    let re2 = /\s*[#;].*$/g; // Strip everything after # or ; to the end of the line, including preceding spaces
    return (s) => {
        return s.replace(re1, '').replace(re2, '');
    };
})();

/**
 * Parses a string of gcode instructions, and invokes handlers for
 * each type of command.
 *
 * Special handler:
 *   'default': Called if no other handler matches.
 */
function GCodeParser(handlers) {
    this.handlers = handlers || {};
}

GCodeParser.prototype.parse = function(gcode, callback) {
    let that = this;
    let lines = gcode.split('\n');
    lines = _(lines)
        .map(function(line) {
            return stripComments(line).trim();
        })
        .compact()
        .value();

    let index = 0;
    let prevCode = '';

    _.each(lines, (line) => {
        let tokens = _(line)
            .split(' ')
            .compact()
            .value();

        if (_.size(tokens) === 0) {
            return;
        }

        let code = _.trim(tokens[0]).toUpperCase();

        // N: Line number
        // Example: N123
        // If present, the line number should be the first field in a line.
        if (code[0] === 'N') {
            tokens = tokens.splice(1);
            code = _.trim(tokens[0]).toUpperCase();
        }

        // *: Checksum
        // Example: *71
        // If present, the checksum should be the last field in a line, but before a comment.
        if (code[0] === '*') {
            return;
        }

        // Check the first character for
        //   G: G-gcodes
        //   M: M-codes
        //   T: Select Tool
        if (_.includes(['G', 'M', 'T'], code[0])) {
            tokens = tokens.splice(1);
        } else {
            code = prevCode;
        }

        { // Formatting G-code
            let decimal = parseFloat(code.substr(1));
            if (_.isNaN(decimal)) {
                log.error('Bad number format:', code);
                return;
            }

            let letter = code[0];
            let integer = Math.trunc(decimal);
            let mantissa = Math.round(100 * (decimal - integer));

            if (mantissa > 0) {
                code = letter + integer + '.' + mantissa; // e.g. G92.1
            } else {
                code = letter + integer; // e.g. G92
            }
        }

        let opts = {
            code: code,
            params: {}
        };

        tokens.forEach((token) => {
            let key = token[0].toLowerCase();
            let value = parseFloat(token.substring(1));
            opts.params[key] = value;
        });

        let handler = _.get(this.handlers, code);
        if (_.isFunction(handler)) {
            handler(opts);
        }

        if (_.isFunction(callback)) {
            callback(line, index);
        }

        prevCode = code;
        ++index;
    });
};

export default GCodeParser;
