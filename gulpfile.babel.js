import _ from 'lodash';
import fs from 'fs';
import gulp from 'gulp';
import requireDir from 'require-dir';
import pkg from './package.json';
import bower from './bower.json';
import config from './gulp/config';
import errorHandler from './gulp/error-handler';

// Sync the following properties from `package.json` to `bower.json`:
// * name
// * description
// * version
bower.name = pkg.name;
bower.description = pkg.description;
bower.version = pkg.version;
fs.writeFileSync('bower.json', JSON.stringify(bower, null, 2));

// Require all tasks in gulp/tasks, including subfolders
let tasks = requireDir('./gulp/tasks', { recurse: true });

// Get environment, for environment-specific activities
let env = process.env.NODE_ENV || 'development';

_.each(tasks, (task, relativePath) => {
    if (_.isObject(task) && _.isFunction(task.default)) {
        task = task.default;
    }

    console.assert(_.isFunction(task), 'gulp/tasks/%s: module\'s export is not a function', relativePath);

    task({
        config: config,
        env: env,
        watch: false,
        errorHandler: errorHandler
    });
});

gulp.task('default', ['build']);
