import gulp from 'gulp';

export default (options) => {
    gulp.task('dist', () => {
        let distConfig = options.config.dist;

        return gulp.src(distConfig.src, { base: distConfig.base })
            .pipe(gulp.dest(distConfig.dest));
    });
};
