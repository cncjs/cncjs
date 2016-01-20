import gulp from 'gulp';
import babel from 'gulp-babel';

export default (options) => {
    gulp.task('babel', () => {
        let babelConfig = options.config.babel;

        return gulp.src(babelConfig.src, { base: babelConfig.base })
            .pipe(babel(babelConfig.options))
            .pipe(gulp.dest(babelConfig.dest));
    });
};
