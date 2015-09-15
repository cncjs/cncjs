var _ = require('lodash');
var path = require('path');
var gulp = require('gulp');
var gutil = require('gulp-util');
var concat = require('gulp-concat');
var declare = require('gulp-declare');
var filter = require('gulp-filter');
var handlebars = require('gulp-handlebars');
var merge = require('merge-stream');
var wrap = require('gulp-wrap');

module.exports = function(options) {
    var deps = [];

    _.each(options.config.handlebars, function(taskConfig, key) {
        var task = 'handlebars:' + key;
        deps.push(task);

        gulp.task(task, function() {
            var partialFilter = filter('**/_*.hbs');
            var templateFilter = filter('**/[^_]*.hbs');

            // https://github.com/lazd/gulp-handlebars/tree/master/examples/partials

            // Assume all partials start with an underscore
            // You could also put them in a folder such as web/templates/partials/*.hbs
            var partials = gulp.src(taskConfig.src)
                .pipe(partialFilter)
                .pipe(handlebars())
                .pipe(wrap('Handlebars.registerPartial(<%= processPartialName(file.path) %>, Handlebars.template(<%= contents %>));', {}, {
                    imports: {
                        // 1. Strip the extension and the underscore
                        // 2. Escape the output with JSON.stringify
                        processPartialName: function(filepath) {
                            // return the relative path from current working directory to absolute filepath
                            filepath = path.relative(process.cwd(), filepath || '');

                            var pieces = filepath.split('/');
                            if (pieces.length > 0) {
                                var last = pieces.length - 1;
                                pieces[last] = pieces[last].replace(/^_/, '');
                            }
                            filepath = pieces.join('/');

                            // Remove the 'web/' prefix and the '.hbs' suffix
                            filepath = filepath.replace(/^[\/]?web\//, '') || '';
                            filepath = filepath.replace(/\.js$/, '') || '';

                            gutil.log('> handlebars:processPartialName:', filepath);
                            return JSON.stringify(filepath);
                        }
                    }
                }));

            var templates = gulp.src(taskConfig.src)
                .pipe(templateFilter)
                .pipe(handlebars())
                .pipe(wrap('Handlebars.template(<%= contents %>)'))
                    .on('error', options.errorHandler.error)
                .pipe(declare({
                    root: 'module.exports', // Declare as properties of module.exports 
                    noRedeclare: true, // Avoid duplicate declarations
                    processName: function(filepath) {
                        // Make the directory relative
                        filepath = path.relative(process.cwd(), filepath);

                        // Process template name
                        filepath = filepath.replace(/^[\/]?web\//, '') || '';
                        filepath = filepath.replace(/\.js$/, '') || '';

                        gutil.log('> handlebars:processName:', filepath);
                        return filepath;
                    }
                }));

            // Output both the partials and the templates as build/js/templates.js
            return merge(partials, templates)
                .pipe(concat('handlebars-templates.js'))
                .pipe(wrap([
                        'var root = (\'undefined\' === typeof window) ? global : window;',
                        'var Handlebars = root.Handlebars || require(\'handlebars\');',
                        '<%= contents %>;'
                    ].join('\n')))
                .pipe(gulp.dest(taskConfig.dest));
        });
    });

    gulp.task('handlebars', deps);
};
