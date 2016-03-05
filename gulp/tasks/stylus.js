import gulp from 'gulp';
import plumber from 'gulp-plumber';
import stylus from 'gulp-stylus';
import sourcemaps from 'gulp-sourcemaps';
import nib from 'nib';

const stylusConfig = {
    src: ['src/web/**/*.styl'],
    dest: 'src/web/',
    options: {
        compress: true,
        // nib - CSS3 extensions for Stylus
        use: nib(),
        import: ['nib'] // no need to have a '@import "nib"' in the stylesheet
    }
};

export default (options) => {
    gulp.task('stylus', () => {
        return gulp.src(stylusConfig.src)
            .pipe(plumber({ errorHandler: options.errorHandler.error }))
            .pipe(sourcemaps.init())
                .pipe(stylus(stylusConfig.options))
            .pipe(sourcemaps.write('/', { includeContent: false }))
            .pipe(gulp.dest(stylusConfig.dest));
    });
};
