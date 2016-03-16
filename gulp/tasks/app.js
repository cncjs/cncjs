import gulp from 'gulp';
import gutil from 'gulp-util';
import webpack from 'webpack';

const distConfig = {
    base: 'src/app',
    src: [
        'src/app/{i18n,views}/**/*'
    ],
    dest: 'dist/app'
};

export default (options) => {
    gulp.task('app:build-dev', ['app:build']);

    gulp.task('app:build', (callback) => {
        const webpackConfig = require('../../webpack.config.app');

        webpack(webpackConfig, (err, stats) => {
            if (err) {
                throw new gutil.PluginError('app:build', err);
            }
            gutil.log('[app:build]', stats.toString({ colors: true }));
            callback();
        });
    });

    gulp.task('app:i18n', ['i18next:app']);

    gulp.task('app:dist', () => {
        return gulp.src(distConfig.src, { base: distConfig.base })
            .pipe(gulp.dest(distConfig.dest));
    });
};
