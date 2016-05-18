import _ from 'lodash';
import gulp from 'gulp';
import requireDir from 'require-dir';
import runSequence from 'run-sequence';

const loadGulpTasks = () => {
    // Require all tasks in gulp/tasks, including subfolders
    const tasks = requireDir('./gulp/tasks', { recurse: true });

    // Get environment, for environment-specific activities
    const env = process.env.NODE_ENV || 'production';

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

gulp.task('default', ['prod']);
gulp.task('prod', ['production']);
gulp.task('dev', ['development']);

gulp.task('development', (callback) => {
    process.env.NODE_ENV = 'development';

    runSequence(
        'clean',
        ['app:build-dev', 'web:build-dev'],
        ['app:i18n', 'web:i18n'],
        ['app:output', 'web:output'],
        callback
    );
});

gulp.task('production', (callback) => {
    process.env.NODE_ENV = 'production';

    runSequence(
        'clean',
        ['app:build-prod', 'web:build-prod'],
        ['app:i18n', 'web:i18n'],
        ['app:dist', 'web:dist'],
        callback
    );
});
