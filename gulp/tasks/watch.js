var gulp = require('gulp');
var livereload = require('gulp-livereload');

module.exports = function(options) {
    options.watch = true; // Set watch to true

    gulp.task('watch', ['browserify-watch'], function() {

        //gulp.watch(options.config.csslint.src, ['csslint']); // .css
        gulp.watch(options.config.eslint.src, ['eslint']); // .js or .jsx
        gulp.watch(options.config.jshint.src, ['jshint']); // .json

        // Start live reload server
        livereload.listen(35729);
    });
};
