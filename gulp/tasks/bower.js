import gulp from 'gulp';
import mainBowerFiles from 'main-bower-files';

const mainBowerFilesConfig = {
    base: 'bower_components/',
    dest: 'src/web/vendor/',
    options: {
        checkExistence: true,
        debugging: true,
        paths: {
            bowerDirectory: 'bower_components',
            bowerrc: '.bowerrc',
            bowerJson: 'bower.json'
        }
    }
};

export default (options) => {
    gulp.task('bower', () => {
        return gulp.src(mainBowerFiles(mainBowerFilesConfig.options), { base: mainBowerFilesConfig.base })
            .pipe(gulp.dest(mainBowerFilesConfig.dest));
    });
};
