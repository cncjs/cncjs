import gulp from 'gulp';
import babel from 'gulp-babel';
import eslint from 'gulp-eslint';

const buildConfig = {
    base: 'src/app',
    src: [
        'src/app/**/*.js',
        // exclusion
        '!**/node_modules/**'
    ],
    dest: 'dist/app'
};

const distConfig = {
    base: 'src/app',
    src: [
        'src/app/{i18n,views}/**/*'
    ],
    dest: 'dist/app'
};

export default (options) => {
    gulp.task('app:build', () => {
        return gulp.src(buildConfig.src, { base: buildConfig.base })
            .pipe(eslint())
            .pipe(babel({
                presets: ['es2015', 'stage-0', 'react']
            }))
            .pipe(gulp.dest(buildConfig.dest));
    });
    gulp.task('app:i18n', ['i18next:app']);
    gulp.task('app:dist', () => {
        return gulp.src(distConfig.src, { base: distConfig.base })
            .pipe(gulp.dest(distConfig.dest));
    });
};
