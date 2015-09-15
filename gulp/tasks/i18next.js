var _ = require('lodash');
var fs = require('fs');
var path = require('path');
var gulp = require('gulp');
var gutil = require('gulp-util');
var i18next = require('i18next-scanner');
var hash = require('sha1');
var table = require('text-table');

var customTransform = function _transform(file, enc, done) {
    var parser = this.parser;
    var extname = path.extname(file.path);
    var content = fs.readFileSync(file.path, enc);
    var parseResults = [
        ['Key', 'Value']
    ];

    gutil.log('parsing ' + JSON.stringify(file.relative) + ':');

    // Using i18next-text
    (function() {
        var results = content.match(/i18n\._\(("[^"]*"|'[^']*')\s*[\,\)]/igm) || '';
        _.each(results, function(result) {
            var key, value;
            var r = result.match(/i18n\._\(("[^"]*"|'[^']*')/);

            if (r) {
                value = _.trim(r[1], '\'"');

                // Replace double backslash with single backslash
                value = value.replace(/\\\\/g, '\\');
                value = value.replace(/\\\'/, '\'');

                key = hash(value); // returns a hash value as its default key

                parser.parse(key, value);
                parseResults.push([key, value]);
            }
        });
    }());

    // i18n function helper
    (function() {
        var results = content.match(/{{i18n\s+("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')?([^}]*)}}/gm) || [];
        _.each(results, function(result) {
            var key, value;
            var r = result.match(/{{i18n\s+("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')?([^}]*)}}/m) || [];

            if ( ! _.isUndefined(r[1])) {
                value = _.trim(r[1], '\'"');

                // Replace double backslash with single backslash
                value = value.replace(/\\\\/g, '\\');
                value = value.replace(/\\\'/, '\'');
            }

            var params = parser.parseHashArguments(r[2]);
            if (_.has(params, 'defaultKey')) {
                key = params['defaultKey'];
            }

            if (_.isUndefined(key) && _.isUndefined(value)) {
                return;
            }

            if (_.isUndefined(key)) {
                key = hash(value); // returns a hash value as its default key
            }

            parser.parse(key, value);
            parseResults.push([key, value]);
        });
    }());

    // i18n block helper
    (function() {
        var results = content.match(/{{#i18n\s*([^}]*)}}((?:(?!{{\/i18n}})(?:.|\n))*){{\/i18n}}/gm) || [];
        _.each(results, function(result) {
            var key, value;
            var r = result.match(/{{#i18n\s*([^}]*)}}((?:(?!{{\/i18n}})(?:.|\n))*){{\/i18n}}/m) || [];

            if ( ! _.isUndefined(r[2])) {
                value = _.trim(r[2], '\'"');
            }

            if (_.isUndefined(value)) {
                return;
            }

            key = hash(value); // returns a hash value as its default key

            parser.parse(key, value);
            parseResults.push([key, value]);
        });
    }());

    if (_.size(parseResults) > 1) {
        gutil.log('result of ' + JSON.stringify(file.relative) + ':\n' + table(parseResults, {'hsep': ' | '}));
    }

    done();
};

module.exports = function(options) {
    gulp.task('i18next', function() {
        var i18nextConfig = options.config.i18next;

        return gulp.src(i18nextConfig.src)
            .pipe(i18next(i18nextConfig.options, customTransform))
            .pipe(gulp.dest(i18nextConfig.dest));
    });
};

