import gulp from 'gulp';
import del from 'del';

export default (options) => {
    gulp.task('clean', ['clean-src', 'clean-dist']);
    gulp.task('clean-src', (callback) => {
        let cleanConfig = options.config.clean;
        del(cleanConfig.src, callback);
    });
    gulp.task('clean-dist', (callback) => {
        let cleanConfig = options.config.clean;
        del(cleanConfig.dist, callback);
    });
};
