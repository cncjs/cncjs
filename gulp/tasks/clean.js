import gulp from 'gulp';
import del from 'del';

const list = [
    'src/web/**/*.css',
    'src/web/**/*.css.map',
    'src/web/**/*.js.map',
    'dist/**/*',
    // exclusion
    '!src/web/vendor/**'
];

export default (options) => {
    gulp.task('clean', (callback) => {
        del(list).then(() => {
            callback();
        });
    });
};
