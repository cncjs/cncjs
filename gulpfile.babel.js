import _ from 'lodash';
import gulp from 'gulp';
import requireDir from 'require-dir';
import runSequence from 'run-sequence';

const loadGulpTasks = () => {
    // Require all tasks in gulp/tasks, including subfolders
    const tasks = requireDir('./gulp/tasks', { recurse: true });

    // Get environment, for environment-specific activities
    const env = process.env.NODE_ENV || 'development';

    _.each(tasks, (task, relativePath) => {
        if (_.isObject(task) && _.isFunction(task.default)) {
            task = task.default;
        }

        console.assert(_.isFunction(task),
            'gulp/tasks/%s: module\'s export is not a function', relativePath);

        task({ env: env, watch: false });
    });
};

loadGulpTasks();

gulp.task('default', ['build']);
gulp.task('dev', ['build-dev']);

gulp.task('build-dev', (callback) => {
    runSequence(
        ['app:build', 'web:build-dev'],
        callback
    );
});

gulp.task('build', (callback) => {
    runSequence(
        'clean',
        ['bower', 'eslint', 'jshint'],
        ['app:build', 'web:build'],
        ['app:i18n', 'web:i18n'],
        ['app:dist', 'web:dist'],
        callback
    );
});
