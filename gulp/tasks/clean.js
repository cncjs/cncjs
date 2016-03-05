import gulp from 'gulp';
import del from 'del';

const cleanConfig = {
    src: [
        'src/web/**/*.css',
        // exclusion
        '!src/web/vendor/**'
    ],
    dist: [
        'dist/**/*'
    ]
};

export default (options) => {
    gulp.task('clean', ['clean-src', 'clean-dist']);
    gulp.task('clean-src', (callback) => {
        del(cleanConfig.src, callback);
    });
    gulp.task('clean-dist', (callback) => {
        del(cleanConfig.dist, callback);
    });
};
