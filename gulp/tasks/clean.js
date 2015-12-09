import gulp from 'gulp';
import del from 'del';

export default (options) => {
    gulp.task('clean', ['clean-vendor', 'clean-scripts', 'clean-styles', 'clean-templates']);
    gulp.task('clean-vendor', (callback) => {
        let cleanConfig = options.config.clean;
        del(cleanConfig.vendor, callback);
    });
    gulp.task('clean-scripts', (callback) => {
        let cleanConfig = options.config.clean;
        del(cleanConfig.scripts, callback);
    });
    gulp.task('clean-styles', (callback) => {
        let cleanConfig = options.config.clean;
        del(cleanConfig.styles, callback);
    });
    gulp.task('clean-templates', (callback) => {
        let cleanConfig = options.config.clean;
        del(cleanConfig.templates, callback);
    });
};
