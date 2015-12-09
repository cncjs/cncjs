import gulp from 'gulp';
import concat from 'gulp-concat';
import mainBowerFiles from 'main-bower-files';

export default (options) => {
    let mainBowerFilesConfig = options.config.mainBowerFiles;

    gulp.task('bower', () => {
        return gulp.src(mainBowerFiles(mainBowerFilesConfig.options), { base: mainBowerFilesConfig.base })
            .pipe(gulp.dest(mainBowerFilesConfig.dest));
    });
};
