import gulp from 'gulp';
import del from 'del';

const list = [
    'dist/cnc/app',
    'dist/cnc/web',
    'src/web/**/*.css',
    'src/web/**/*.css.map',
    'src/web/**/*.js.map',
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
