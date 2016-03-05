import gulp from 'gulp';
import babel from 'gulp-babel';

const serverConfig = {
    src: [
        'src/app/**/*.js',
        // exclusion
        '!src/app/test/**'
    ],
    dest: 'dist/app'
};

export default (options) => {
    gulp.task('server', () => {
        return gulp.src(serverConfig.src, { base: serverConfig.base })
            .pipe(babel({
                presets: ['es2015', 'stage-0', 'react']
            }))
            .pipe(gulp.dest(serverConfig.dest));
    });
};
