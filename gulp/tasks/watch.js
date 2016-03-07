import gulp from 'gulp';
import livereload from 'gulp-livereload';

export default (options) => {
    options.watch = true; // Set watch to true

    gulp.task('watch', ['browserify-watch'], () => {
        gulp.watch(options.config.eslint.src, ['eslint']); // .js or .jsx
        gulp.watch(options.config.jshint.src, ['jshint']); // .json

        // Start live reload server
        livereload.listen(35729);
    });
};
