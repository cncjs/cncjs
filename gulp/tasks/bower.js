var gulp = require('gulp');
var concat = require('gulp-concat');
var mainBowerFiles = require('main-bower-files');

module.exports = function(options) {
    var mainBowerFilesConfig = options.config.mainBowerFiles;

    gulp.task('bower', function() {
        return gulp.src(mainBowerFiles(mainBowerFilesConfig.options), {base: mainBowerFilesConfig.base})
            .pipe(gulp.dest(mainBowerFilesConfig.dest));
    });
};
