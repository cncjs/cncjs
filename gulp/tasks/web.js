import gulp from 'gulp';

const distConfig = {
    base: 'src/web',
    src: [
        'src/web/favicon.ico',
        'src/web/plugins.js',
        'src/web/{images,textures}/**/*',
        'src/web/vendor/**/*',
        'src/web/i18n/**/*'
    ],
    dest: 'dist/web'
};

export default (options) => {
    gulp.task('web:build', ['webpack:build']);
    gulp.task('web:build-dev', ['webpack:build-dev']);

    gulp.task('web:i18n', ['i18next:web']);
    gulp.task('web:dist', () => {
        return gulp.src(distConfig.src, { base: distConfig.base })
            .pipe(gulp.dest(distConfig.dest));
    });
};
