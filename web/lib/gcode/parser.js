import _ from 'lodash';

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

    _.each(lines, (line) => {
        let tokens = line.split(' ');
        if (! tokens) {
            return;
        }

        let cmd = tokens[0];
        let args = {
            'cmd': cmd
        };
        tokens.splice(1).forEach((token) => {
            let key = token[0].toLowerCase();
            let value = parseFloat(token.substring(1));
            args[key] = value;
        });

        let handler = this.handlers[tokens[0]] || this.handlers['default'];
        if (_.isFunction(handler)) {
            handler(args, index);
        }

        if (_.isFunction(callback)) {
            callback(line, index);
        }

        ++index;
    });
};

export default GCodeParser;
