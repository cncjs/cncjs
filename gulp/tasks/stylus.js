import gulp from 'gulp';
import plumber from 'gulp-plumber';
import stylus from 'gulp-stylus';
import autoprefixer from 'gulp-autoprefixer';
import sourcemaps from 'gulp-sourcemaps';
import nib from 'nib';

export default (options) => {
    gulp.task('stylus', () => {
        let stylusConfig = options.config.stylus;
        let autoprefixerConfig = options.config.autoprefixer;

        // nib - CSS3 extensions for Stylus
        stylusConfig.options.use = nib();
        stylusConfig.options.import = ['nib']; // no need to have a '@import "nib"' in the stylesheet

        return gulp.src(stylusConfig.src)
            .pipe(plumber({ errorHandler: options.errorHandler.error }))
            .pipe(sourcemaps.init())
                .pipe(stylus(stylusConfig.options))
                .pipe(autoprefixer(autoprefixerConfig.options))
            .pipe(sourcemaps.write('/', { includeContent: false }))
            .pipe(gulp.dest(stylusConfig.dest));
    });
};
