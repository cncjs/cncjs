var gulp = require('gulp');
var del = require('del');

module.exports = function(options) {
    /**
     * Delete folder and files
     */
    gulp.task('clean', ['clean-vendor', 'clean-scripts', 'clean-styles', 'clean-templates']);
    gulp.task('clean-vendor', function(callback) {
        var cleanConfig = options.config.clean;
        del(cleanConfig.vendor, callback);
    });
    gulp.task('clean-scripts', function(callback) {
        var cleanConfig = options.config.clean;
        del(cleanConfig.scripts, callback);
    });
    gulp.task('clean-styles', function(callback) {
        var cleanConfig = options.config.clean;
        del(cleanConfig.styles, callback);
    });
    gulp.task('clean-templates', function(callback) {
        var cleanConfig = options.config.clean;
        del(cleanConfig.templates, callback);
    });
};
