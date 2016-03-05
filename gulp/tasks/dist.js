import gulp from 'gulp';

const distConfig = {
    base: 'src',
    src: [
        // app
        'src/app/views/**/*',
        'src/app/i18n/**/*',
        // web
        'src/web/favicon.ico',
        'src/web/plugins.js',
        'src/web/{images,textures}/**/*',
        'src/web/vendor/**/*',
        'src/web/i18n/**/*'
    ],
    dest: 'dist'
};

export default (options) => {
    gulp.task('dist', () => {
        return gulp.src(distConfig.src, { base: distConfig.base })
            .pipe(gulp.dest(distConfig.dest));
    });
};
